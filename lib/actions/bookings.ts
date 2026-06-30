"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";

import { areDemoSpotsEnabled, isDemoFallbackEnabled } from "@/lib/config/feature-flags";
import {
  guestContactToPayload,
  isMissingGuestColumnsError,
  isMissingGuestContactError,
  isMissingGuestStorageError,
  stripGuestFields
} from "@/lib/domain/booking-guest";
import { deleteMockBooking, saveMockBooking } from "@/lib/data/demo-bookings";
import { getOverlappingReservationForSpot } from "@/lib/domain/reservation-overlap";
import { PUBLISHED_SPOTS_TAG } from "@/lib/config/constants";
import { createClient } from "@/lib/supabase/server";
import { deleteReservationGuest, saveReservationGuest } from "@/lib/domain/reservation-guests";
import { getActiveReservationsForSpotIds, getBookingById, getHostBookingById, getParkingSpotById } from "@/lib/supabase/queries";
import { bookingSchema } from "@/lib/helpers/validators";
import { calculateBookingTotal, isBookingInsideWindow } from "@/lib/helpers";
import type { GuestContact } from "@/lib/types";

export interface ActionState {
  error: string;
}

function buildDriverProfile(
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      avatar_url?: string | null;
      full_name?: string | null;
      name?: string | null;
    };
  },
  guest: GuestContact
) {
  return {
    id: user.id,
    full_name: guest.fullName,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    email: guest.email,
    phone: guest.phone,
    address: guest.address,
    vehicle_info: guest.vehicleInfo
  };
}

function buildDriverBookingProfile(
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      avatar_url?: string | null;
      full_name?: string | null;
      name?: string | null;
    };
  },
  guest: GuestContact
) {
  return {
    id: user.id,
    fullName: guest.fullName,
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    email: guest.email,
    phone: guest.phone,
    address: guest.address,
    vehicleInfo: guest.vehicleInfo
  };
}

function buildGuestContact(parsed: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  guestVehicleInfo: string;
}): GuestContact {
  return {
    fullName: parsed.guestName,
    email: parsed.guestEmail,
    phone: parsed.guestPhone,
    address: parsed.guestAddress,
    vehicleInfo: parsed.guestVehicleInfo
  };
}

export async function createBookingAction(
  _previousState: ActionState,
  formData: FormData
) {
  const parsed = bookingSchema.safeParse({
    spotId: formData.get("spotId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
    guestAddress: formData.get("guestAddress"),
    guestVehicleInfo: formData.get("guestVehicleInfo")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reservation details." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/reserve/${parsed.data.spotId}`)}`);
  }

  const spot = await getParkingSpotById(parsed.data.spotId);

  if (!spot || !spot.isPublished) {
    return { error: "This parking spot is no longer available." };
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  if (hours <= 0) {
    return { error: "Reservation time must be at least one minute." };
  }

  const activeReservations = await getActiveReservationsForSpotIds([parsed.data.spotId]);
  const overlappingReservation = getOverlappingReservationForSpot(
    activeReservations,
    parsed.data.spotId,
    startTime,
    endTime
  );

  if (overlappingReservation) {
    if (overlappingReservation.driverId !== user.id) {
      return { error: "Those times overlap with another driver's reservation." };
    }

    return { error: "You already have a reservation that overlaps with this time window." };
  }

  const isDemoSpot = spot.id.startsWith("demo-");

  if (isDemoSpot && !areDemoSpotsEnabled()) {
    return { error: "This parking spot is no longer available." };
  }

  if (!isDemoSpot) {
    const isInsideAvailability = spot.availabilityWindows.some((window) =>
      isBookingInsideWindow(window, startTime, endTime)
    );

    if (!isInsideAvailability) {
      return { error: "Selected time falls outside the host's availability window." };
    }
  }

  const totalPrice = calculateBookingTotal(hours, spot.pricePerHour);
  const guest = buildGuestContact(parsed.data);
  const insertPayload = {
    spot_id: parsed.data.spotId,
    driver_id: user.id,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    total_price: totalPrice,
    status: "confirmed" as const,
    ...guestContactToPayload(guest)
  };

  const profilePayload = buildDriverProfile(user, guest);
  let { error: profileError } = await supabase.from("profiles").upsert(profilePayload);

  if (profileError?.code === "42703" || profileError?.code === "PGRST204") {
    const { phone: _phone, address: _address, vehicle_info: _vehicleInfo, ...baseProfile } = profilePayload;
    ({ error: profileError } = await supabase.from("profiles").upsert(baseProfile));
  }

  if (profileError) {
    console.error("[bookings] ensureProfileForUser", {
      error: {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      },
      context: { userId: user.id }
    });
    return { error: "Unable to sync your booking profile." };
  }

  const driver = buildDriverBookingProfile(user, guest);

  if (isDemoSpot) {
    const mockBookingId = crypto.randomUUID();

    await saveMockBooking({
      id: mockBookingId,
      spotId: parsed.data.spotId,
      driverId: user.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalPrice,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spot,
      driver,
      guest
    });
    await saveReservationGuest(mockBookingId, guest);

    revalidatePath("/explore");
    revalidateTag(PUBLISHED_SPOTS_TAG);
    revalidatePath("/bookings");
    redirect(`/bookings/${mockBookingId}?created=1`);
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert(insertPayload)
    .select("id")
    .single()
    .then(async (result) => {
      if (!result.error || !isMissingGuestColumnsError(result.error)) {
        return result;
      }

      const { guest_name, guest_email, guest_phone, guest_address, guest_vehicle_info, ...rest } = insertPayload;

      return supabase
        .from("bookings")
        .insert({ ...rest, guest_contact: guest })
        .select("id")
        .single()
        .then(async (contactResult) => {
          if (!contactResult.error || !isMissingGuestContactError(contactResult.error)) {
            return contactResult;
          }

          return supabase.from("bookings").insert(stripGuestFields(insertPayload)).select("id").single();
        });
    });

  if (error) {
    console.error("[bookings] createBookingAction.insertBooking", {
      error: {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      },
      context: {
        spotId: parsed.data.spotId,
        driverId: user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalPrice
      }
    });

    if (error.code === "42P01" && isDemoFallbackEnabled()) {
      const mockBookingId = crypto.randomUUID();

      await saveMockBooking({
        id: mockBookingId,
        spotId: parsed.data.spotId,
        driverId: user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalPrice,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        spot,
        driver,
        guest
      });
      await saveReservationGuest(mockBookingId, guest);

      revalidatePath("/explore");
      revalidateTag(PUBLISHED_SPOTS_TAG);
      revalidatePath("/bookings");
      redirect(`/bookings/${mockBookingId}?created=1`);
    }

    if (error.code === "42P01") {
      console.error("[bookings] createBookingAction bookings table missing in production");
      return { error: "Reservations are temporarily unavailable. Please try again later." };
    }

    return {
      error: formatBookingError(error)
    };
  }

  await saveReservationGuest(data.id, guest);

  revalidatePath("/");
  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/bookings");
  revalidatePath("/host");
  redirect(`/bookings/${data.id}?created=1`);
}

function formatBookingError(error: PostgrestError) {
  if (error.code === "23P01") {
    return "Those reservation times overlap with an existing booking.";
  }

  return error.message || "Unable to confirm this reservation right now.";
}

export async function deleteBookingAction(bookingId: string, redirectTo = "/bookings", asHost = false) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
  }

  const [booking, hostBooking] = await Promise.all([
    getBookingById(bookingId),
    getHostBookingById(user.id, bookingId)
  ]);

  const canDeleteAsDriver = booking?.driverId === user.id;
  const canDeleteAsHost = Boolean(hostBooking);

  if (!canDeleteAsDriver && !canDeleteAsHost) {
    const failureParam = asHost || redirectTo.startsWith("/host") ? "reservation-delete-failed" : "delete-failed";
    redirect(`${redirectTo}?error=${failureParam}`);
  }

  await deleteReservationGuest(bookingId);
  await deleteMockBooking(bookingId);

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

  if (error && error.code !== "42P01") {
    const hadDatabaseBooking = Boolean(hostBooking) || (booking && !booking.spotId.startsWith("demo-"));

    if (hadDatabaseBooking) {
      console.error("[bookings] deleteBookingAction", {
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        context: { bookingId, userId: user.id }
      });
      redirect(`${redirectTo}?error=${redirectTo.startsWith("/host") ? "reservation-delete-failed" : "delete-failed"}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidateTag(PUBLISHED_SPOTS_TAG);
  revalidatePath("/bookings");
  revalidatePath("/host");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/host/reservations/${bookingId}`);
  redirect(redirectTo);
}
