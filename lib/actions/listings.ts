"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";

import { deriveProfileName } from "@/lib/helpers/profile";
import { PARKING_SPOT_BUCKET, PUBLISHED_SPOTS_TAG } from "@/lib/config/constants";
import { isListingCurrentlyReserved } from "@/lib/domain/spot-reservations";
import { photosOwnedByUser } from "@/lib/integrations/listing-photos";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, uploadedPhotoSchema } from "@/lib/helpers/validators";

export interface ListingActionState {
  error: string;
}

function formatSupabaseError(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  if (!error) {
    return null;
  }

  return [error.message, error.details, error.hint].filter(Boolean).join(" ");
}

function logListingError(scope: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[listings] ${scope}`, {
    error,
    ...(context ? { context } : {})
  });
}

async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      avatar_url?: string | null;
      full_name?: string | null;
      name?: string | null;
    };
  }
) {
  const payload = {
    id: user.id,
    full_name: deriveProfileName(user),
    avatar_url: user.user_metadata?.avatar_url ?? null,
    email: user.email ?? null
  };

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    logListingError("ensureProfileForUser", error, { userId: user.id, payload });
    return formatSupabaseError(error) ?? "Unable to sync your host profile.";
  }

  return null;
}

function parseListingFormData(formData: FormData) {
  try {
    const photosValue = String(formData.get("photosJson") ?? "[]");
    const photosJson = JSON.parse(photosValue);
    const photos = uploadedPhotoSchema.array().parse(photosJson);

    return listingSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      locationNotes: formData.get("locationNotes"),
      spotType: formData.get("spotType"),
      pricePerHour: formData.get("pricePerHour"),
      covered: formData.get("covered") === "true",
      hasEvCharger: formData.get("hasEvCharger") === "true",
      vehicleSizeRestrictions: formData.get("vehicleSizeRestrictions"),
      accessInstructions: formData.get("accessInstructions"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      availabilityStart: formData.get("availabilityStart"),
      availabilityEnd: formData.get("availabilityEnd"),
      repeatDaily: formData.get("repeatDaily") === "true",
      overnightAllowed: formData.get("overnightAllowed") === "true",
      photos
    });
  } catch {
    return listingSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      locationNotes: formData.get("locationNotes"),
      spotType: formData.get("spotType"),
      pricePerHour: formData.get("pricePerHour"),
      covered: formData.get("covered") === "true",
      hasEvCharger: formData.get("hasEvCharger") === "true",
      vehicleSizeRestrictions: formData.get("vehicleSizeRestrictions"),
      accessInstructions: formData.get("accessInstructions"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      availabilityStart: formData.get("availabilityStart"),
      availabilityEnd: formData.get("availabilityEnd"),
      repeatDaily: formData.get("repeatDaily") === "true",
      overnightAllowed: formData.get("overnightAllowed") === "true",
      photos: []
    });
  }
}

export async function createListingAction(
  _previousState: ListingActionState,
  formData: FormData
) {
  const parsed = parseListingFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the listing fields." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=%2Fhost%2Flistings%2Fnew");
  }

  const profileError = await ensureProfileForUser(supabase, user);
  if (profileError) {
    return { error: profileError };
  }

  if (!photosOwnedByUser(parsed.data.photos, user.id)) {
    return { error: "One or more photos are not from your account." };
  }

  const listingPayload = {
    owner_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    location_notes: parsed.data.locationNotes,
    spot_type: parsed.data.spotType,
    price_per_hour: parsed.data.pricePerHour,
    covered: parsed.data.covered,
    has_ev_charger: parsed.data.hasEvCharger,
    vehicle_size_restrictions: parsed.data.vehicleSizeRestrictions,
    access_instructions: parsed.data.accessInstructions,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    is_published: true
  };

  const { data: spot, error: spotError } = await supabase
    .from("parking_spots")
    .insert(listingPayload)
    .select("id, owner_id, latitude, longitude, is_published")
    .single();

  if (spotError || !spot) {
    logListingError("createListingAction.insertSpot", spotError, { userId: user.id, payload: listingPayload });
    return { error: formatSupabaseError(spotError) ?? "Unable to create listing." };
  }

  const photosPayload = parsed.data.photos.map((photo, index) => ({
    spot_id: spot.id,
    url: photo.url,
    storage_path: photo.path,
    is_primary: index === 0,
    sort_order: index
  }));

  const availabilityPayload = {
    spot_id: spot.id,
    start_at: new Date(parsed.data.availabilityStart).toISOString(),
    end_at: new Date(parsed.data.availabilityEnd).toISOString(),
    repeat_daily: parsed.data.repeatDaily,
    overnight_allowed: parsed.data.overnightAllowed
  };

  const photoResult =
    photosPayload.length > 0
      ? await supabase.from("spot_photos").insert(photosPayload)
      : { error: null };
  const availabilityResult = await supabase.from("availability_windows").insert(availabilityPayload);

  const photoError = photoResult.error;
  const availabilityError = availabilityResult.error;

  if (photoError || availabilityError) {
    logListingError("createListingAction.insertRelations", photoError ?? availabilityError, {
      createdSpotId: spot.id,
      photosPayload,
      availabilityPayload
    });
    await supabase.from("parking_spots").delete().eq("id", spot.id).eq("owner_id", user.id);
    return {
      error: formatSupabaseError(photoError) ?? formatSupabaseError(availabilityError) ?? "Unable to finish publishing the listing."
    };
  }

  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/host");
  redirect(`/explore?spot=${spot.id}`);
}

export async function updateListingAction(
  listingId: string,
  _previousState: ListingActionState,
  formData: FormData
) {
  const parsed = parseListingFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the listing fields." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/host/listings/${listingId}/edit`)}`);
  }

  const profileError = await ensureProfileForUser(supabase, user);
  if (profileError) {
    return { error: profileError };
  }

  if (!photosOwnedByUser(parsed.data.photos, user.id)) {
    return { error: "One or more photos are not from your account." };
  }

  const listingPayload = {
    title: parsed.data.title,
    description: parsed.data.description,
    location_notes: parsed.data.locationNotes,
    spot_type: parsed.data.spotType,
    price_per_hour: parsed.data.pricePerHour,
    covered: parsed.data.covered,
    has_ev_charger: parsed.data.hasEvCharger,
    vehicle_size_restrictions: parsed.data.vehicleSizeRestrictions,
    access_instructions: parsed.data.accessInstructions,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    is_published: true
  };

  const { error: spotError } = await supabase
    .from("parking_spots")
    .update(listingPayload)
    .eq("id", listingId)
    .eq("owner_id", user.id);

  if (spotError) {
    logListingError("updateListingAction.updateSpot", spotError, { listingId, userId: user.id, payload: listingPayload });
    return { error: formatSupabaseError(spotError) ?? "Unable to update listing." };
  }

  const photosPayload = parsed.data.photos.map((photo, index) => ({
    spot_id: listingId,
    url: photo.url,
    storage_path: photo.path,
    is_primary: index === 0,
    sort_order: index
  }));

  const { data: existingPhotos } = await supabase
    .from("spot_photos")
    .select("spot_id, url, storage_path, is_primary, sort_order")
    .eq("spot_id", listingId);
  const { data: existingWindows } = await supabase
    .from("availability_windows")
    .select("spot_id, start_at, end_at, repeat_daily, overnight_allowed")
    .eq("spot_id", listingId);

  const { error: deletePhotosError } = await supabase.from("spot_photos").delete().eq("spot_id", listingId);
  const { error: deleteAvailabilityError } = await supabase.from("availability_windows").delete().eq("spot_id", listingId);

  if (deletePhotosError || deleteAvailabilityError) {
    logListingError("updateListingAction.deleteRelations", deletePhotosError ?? deleteAvailabilityError, {
      listingId,
      userId: user.id
    });
    return {
      error:
        formatSupabaseError(deletePhotosError) ??
        formatSupabaseError(deleteAvailabilityError) ??
        "Unable to refresh listing photos and availability."
    };
  }

  const availabilityPayload = {
    spot_id: listingId,
    start_at: new Date(parsed.data.availabilityStart).toISOString(),
    end_at: new Date(parsed.data.availabilityEnd).toISOString(),
    repeat_daily: parsed.data.repeatDaily,
    overnight_allowed: parsed.data.overnightAllowed
  };
  const photoResult =
    photosPayload.length > 0
      ? await supabase.from("spot_photos").insert(photosPayload)
      : { error: null };
  const availabilityResult = await supabase.from("availability_windows").insert(availabilityPayload);
  const photoError = photoResult.error;
  const availabilityError = availabilityResult.error;

  if (photoError || availabilityError) {
    if (existingPhotos?.length) {
      await supabase.from("spot_photos").insert(existingPhotos);
    }

    if (existingWindows?.length) {
      await supabase.from("availability_windows").insert(existingWindows);
    }

    logListingError("updateListingAction.insertRelations", photoError ?? availabilityError, {
      listingId,
      userId: user.id,
      photosPayload,
      availabilityPayload
    });
    return {
      error: formatSupabaseError(photoError) ?? formatSupabaseError(availabilityError) ?? "Unable to save listing changes."
    };
  }

  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/host");
  revalidatePath(`/host/listings/${listingId}`);
  redirect(`/host/listings/${listingId}?updated=1`);
}

export async function toggleListingPublishAction(listingId: string, publish: boolean) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=%2Fhost");
  }

  if (!publish && (await isListingCurrentlyReserved(listingId))) {
    redirect("/host?error=reserved-unpublish");
  }

  const { error } = await supabase
    .from("parking_spots")
    .update({ is_published: publish })
    .eq("id", listingId)
    .eq("owner_id", user.id);

  if (error) {
    logListingError("toggleListingPublishAction", error, { listingId, publish, userId: user.id });
    redirect("/host?error=publish-failed");
  }

  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/host");
  revalidatePath(`/host/listings/${listingId}`);
  redirect("/host");
}

export async function deleteListingAction(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=%2Fhost");
  }

  if (await isListingCurrentlyReserved(listingId)) {
    redirect("/host?error=reserved-delete");
  }

  const { data: photos } = await supabase
    .from("spot_photos")
    .select("storage_path")
    .eq("spot_id", listingId);

  const { error } = await supabase.from("parking_spots").delete().eq("id", listingId).eq("owner_id", user.id);

  if (error) {
    logListingError("deleteListingAction", error, { listingId, userId: user.id });
    redirect("/host?error=delete-failed");
  }

  const storagePaths = (photos ?? [])
    .map((photo) => photo.storage_path)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(PARKING_SPOT_BUCKET).remove(storagePaths);
    if (storageError) {
      logListingError("deleteListingAction.removePhotos", storageError, { listingId, storagePaths });
    }
  }

  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/host");
  revalidatePath(`/host/listings/${listingId}`);
  redirect("/host");
}
