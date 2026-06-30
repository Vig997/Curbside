"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LISTING_ACCESS_INSTRUCTIONS_MAX, LISTING_DESCRIPTION_MAX, PARKING_SPOT_BUCKET, SPOT_TYPE_OPTIONS, DEFAULT_MAP_CENTER } from "@/lib/config/constants";
import { geocodeAddress } from "@/lib/integrations/geocoding";
import { createClient } from "@/lib/supabase/client";
import { listingSchema, type ListingValues } from "@/lib/helpers/validators";
import type { ListingActionState } from "@/lib/actions/listings";
import type { ParkingSpot, UploadedPhotoValue } from "@/lib/types";

const HostPinMap = dynamic(() => import("@/components/host/host-pin-map").then((module) => module.HostPinMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-surface/80 p-6 text-sm text-muted-foreground">
      Loading map...
    </div>
  )
});

interface ListingFormProps {
  action: (state: ListingActionState, formData: FormData) => Promise<ListingActionState>;
  initialSpot?: ParkingSpot | null;
  mode: "create" | "edit";
}

function toLocalInputValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function ListingForm({ action, initialSpot, mode }: ListingFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [isUploading, startUploadTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [pinPlaced, setPinPlaced] = useState(Boolean(initialSpot));
  const [pinError, setPinError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhotoValue[]>(
    initialSpot?.photos.map((photo) => ({ url: photo.url, path: photo.storagePath ?? "" })).filter((photo) => photo.path) ?? []
  );
  const availabilityWindow = initialSpot?.availabilityWindows[0];

  const form = useForm<ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: initialSpot?.title ?? "",
      description: initialSpot?.description ?? "",
      locationNotes: initialSpot?.locationNotes ?? "",
      spotType: initialSpot?.spotType ?? "garage",
      pricePerHour: initialSpot?.pricePerHour ?? 18,
      covered: initialSpot?.covered ?? true,
      hasEvCharger: initialSpot?.hasEvCharger ?? false,
      vehicleSizeRestrictions: initialSpot?.vehicleSizeRestrictions ?? "Sedan or compact SUV",
      accessInstructions: initialSpot?.accessInstructions ?? "",
      latitude: initialSpot?.latitude ?? DEFAULT_MAP_CENTER.latitude,
      longitude: initialSpot?.longitude ?? DEFAULT_MAP_CENTER.longitude,
      availabilityStart: toLocalInputValue(availabilityWindow?.startAt),
      availabilityEnd: toLocalInputValue(availabilityWindow?.endAt),
      repeatDaily: availabilityWindow?.repeatDaily ?? false,
      overnightAllowed: availabilityWindow?.overnightAllowed ?? false,
      photos: photos
    }
  });

  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");
  const spotType = form.watch("spotType");
  const titleValue = form.watch("title");
  const pricePerHourValue = form.watch("pricePerHour");
  const availabilityStartValue = form.watch("availabilityStart");
  const availabilityEndValue = form.watch("availabilityEnd");
  const locationNotesValue = form.watch("locationNotes");
  const descriptionValue = form.watch("description") ?? "";
  const accessInstructionsValue = form.watch("accessInstructions") ?? "";
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (isMounted) {
          setIsSignedIn(false);
        }
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (isMounted) {
        setIsSignedIn(Boolean(user));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialSpot) {
      return;
    }

    form.setValue("latitude", initialSpot.latitude, { shouldValidate: false });
    form.setValue("longitude", initialSpot.longitude, { shouldValidate: false });
    setPinPlaced(true);
    setPinError(null);
  }, [form, initialSpot]);

  useEffect(() => {
    if (initialSpot) {
      return;
    }

    const address = locationNotesValue.trim();
    if (address.length < 5) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsGeocoding(true);
      void geocodeAddress(address).then((result) => {
        setIsGeocoding(false);
        if (!result) {
          setGeocodeMessage("Could not find that address. Click the map to place your pin.");
          return;
        }

        setPinPlaced(true);
        setPinError(null);
        setGeocodeMessage(`Pin placed at ${result.placeName}`);
        form.setValue("latitude", Number(result.latitude.toFixed(6)), { shouldValidate: true });
        form.setValue("longitude", Number(result.longitude.toFixed(6)), { shouldValidate: true });
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [form, initialSpot, locationNotesValue]);

  const isReadyToPublish = useMemo(() => {
    const title = titleValue.trim();
    const description = descriptionValue.trim();
    const accessInstructions = accessInstructionsValue.trim();
    const price = Number(pricePerHourValue);

    return (
      isSignedIn === true &&
      pinPlaced &&
      title.length > 0 &&
      description.length >= 10 &&
      accessInstructions.length >= 10 &&
      Number.isFinite(price) &&
      price > 0 &&
      availabilityStartValue.length > 0 &&
      availabilityEndValue.length > 0 &&
      photos.length > 0
    );
  }, [
    availabilityEndValue,
    availabilityStartValue,
    accessInstructionsValue,
    descriptionValue,
    isSignedIn,
    photos.length,
    pinPlaced,
    pricePerHourValue,
    titleValue
  ]);

  const submitAction = form.handleSubmit(async (values) => {
    if (isSignedIn === false) {
      form.setError("root", { message: "Sign in to publish a parking spot." });
      return;
    }

    if (!pinPlaced) {
      setPinError("Place the map pin before publishing.");
    } else {
      setPinError(null);
    }

    if (!pinPlaced) {
      return;
    }

    form.clearErrors("root");

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("description", values.description);
    formData.set("locationNotes", values.locationNotes);
    formData.set("spotType", values.spotType);
    formData.set("pricePerHour", String(values.pricePerHour));
    formData.set("covered", String(values.covered));
    formData.set("hasEvCharger", String(values.hasEvCharger));
    formData.set("vehicleSizeRestrictions", values.vehicleSizeRestrictions);
    formData.set("accessInstructions", values.accessInstructions);
    formData.set("latitude", String(values.latitude));
    formData.set("longitude", String(values.longitude));
    formData.set("availabilityStart", values.availabilityStart);
    formData.set("availabilityEnd", values.availabilityEnd);
    formData.set("repeatDaily", String(values.repeatDaily));
    formData.set("overnightAllowed", String(values.overnightAllowed));
    formData.set("photosJson", JSON.stringify(photos));

    startSubmitTransition(() => {
      formAction(formData);
    });
  });

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    startUploadTransition(async () => {
      const supabase = createClient();
      if (!supabase) {
        form.setError("photos", { message: "Supabase is not configured. Check your environment variables." });
        return;
      }

      const uploadResults: UploadedPhotoValue[] = [];
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        form.setError("photos", { message: "Sign in again before uploading photos." });
        return;
      }

      for (const file of Array.from(fileList)) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxBytes = 6 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
          form.setError("photos", { message: "Use JPEG, PNG, or WebP images only." });
          return;
        }

        if (file.size > maxBytes) {
          form.setError("photos", { message: "Each photo must be 6 MB or smaller." });
          return;
        }

        const userFolder = user.id;
        const filePath = `${userFolder}/${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-").toLowerCase()}`;
        const { error } = await supabase.storage.from(PARKING_SPOT_BUCKET).upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

        if (error) {
          form.setError("photos", { message: error.message });
          return;
        }

        const { data } = supabase.storage.from(PARKING_SPOT_BUCKET).getPublicUrl(filePath);
        uploadResults.push({ url: data.publicUrl, path: filePath });
      }

      const nextPhotos = [...photos, ...uploadResults];
      setPhotos(nextPhotos);
      form.setValue("photos", nextPhotos, { shouldValidate: true });
      form.clearErrors("photos");
      form.clearErrors("root");
    });
  };

  const removePhoto = (photo: UploadedPhotoValue) => {
    startUploadTransition(async () => {
      if (photo.path) {
        const supabase = createClient();
        if (supabase) {
          await supabase.storage.from(PARKING_SPOT_BUCKET).remove([photo.path]);
        }
      }

      const nextPhotos = photos.filter((item) => item.path !== photo.path);
      setPhotos(nextPhotos);
      form.setValue("photos", nextPhotos, { shouldValidate: true });
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create a listing" : "Edit listing"}</CardTitle>
          <CardDescription>
            Place your pin, upload photos, set availability, and publish to the live marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submitAction}>
            <input type="hidden" name="covered" value={String(form.watch("covered"))} />
            <input type="hidden" name="hasEvCharger" value={String(form.watch("hasEvCharger"))} />
            <input type="hidden" name="repeatDaily" value={String(form.watch("repeatDaily"))} />
            <input type="hidden" name="overnightAllowed" value={String(form.watch("overnightAllowed"))} />
            <input type="hidden" name="spotType" value={spotType} />
            <input type="hidden" name="photosJson" value={JSON.stringify(photos)} />

            <div className="grid gap-2">
              <Label htmlFor="title">Listing title</Label>
              <Input id="title" {...form.register("title")} />
              <p className="text-xs text-rose-600">{form.formState.errors.title?.message}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                maxLength={LISTING_DESCRIPTION_MAX}
                placeholder="Short summary for drivers, e.g. Easy driveway access near UCSB."
                {...form.register("description")}
              />
              <p className="text-xs text-muted-foreground">
                {descriptionValue.length}/{LISTING_DESCRIPTION_MAX} characters
              </p>
              <p className="text-xs text-rose-600">{form.formState.errors.description?.message}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="locationNotes">Address or location notes</Label>
                <Input id="locationNotes" {...form.register("locationNotes")} placeholder="e.g. 6543 Del Playa Dr, Isla Vista" />
                {isGeocoding ? <p className="text-xs text-muted-foreground">Locating address on map...</p> : null}
                {geocodeMessage ? <p className="text-xs text-muted-foreground">{geocodeMessage}</p> : null}
                <p className="text-xs text-rose-600">{form.formState.errors.locationNotes?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pricePerHour">Price per hour</Label>
                <Input id="pricePerHour" type="number" min={1} {...form.register("pricePerHour")} />
                <p className="text-xs text-rose-600">{form.formState.errors.pricePerHour?.message}</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Spot type</Label>
                <Select
                  defaultValue={form.getValues("spotType")}
                  onValueChange={(value) => form.setValue("spotType", value as ListingValues["spotType"], { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a spot type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPOT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-rose-600">{form.formState.errors.spotType?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicleSizeRestrictions">Vehicle size restrictions</Label>
                <Input id="vehicleSizeRestrictions" {...form.register("vehicleSizeRestrictions")} />
                <p className="text-xs text-rose-600">{form.formState.errors.vehicleSizeRestrictions?.message}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.watch("covered")}
                  onChange={(event) => form.setValue("covered", event.target.checked, { shouldValidate: true })}
                />
                Covered parking
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.watch("hasEvCharger")}
                  onChange={(event) => form.setValue("hasEvCharger", event.target.checked, { shouldValidate: true })}
                />
                EV charging available
              </label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accessInstructions">Access instructions</Label>
              <Textarea
                id="accessInstructions"
                rows={4}
                maxLength={LISTING_ACCESS_INSTRUCTIONS_MAX}
                placeholder="How drivers enter, park, and unlock the spot, e.g. Pull into the driveway and park behind the blue cone."
                {...form.register("accessInstructions")}
              />
              <p className="text-xs text-muted-foreground">
                {accessInstructionsValue.length}/{LISTING_ACCESS_INSTRUCTIONS_MAX} characters
              </p>
              <p className="text-xs text-rose-600">{form.formState.errors.accessInstructions?.message}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="availabilityStart">Availability start</Label>
                <Input id="availabilityStart" type="datetime-local" {...form.register("availabilityStart")} />
                <p className="text-xs text-rose-600">{form.formState.errors.availabilityStart?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="availabilityEnd">Availability end</Label>
                <Input id="availabilityEnd" type="datetime-local" {...form.register("availabilityEnd")} />
                <p className="text-xs text-rose-600">{form.formState.errors.availabilityEnd?.message}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.watch("repeatDaily")}
                  onChange={(event) => form.setValue("repeatDaily", event.target.checked, { shouldValidate: true })}
                />
                Repeat daily
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.watch("overnightAllowed")}
                  onChange={(event) => form.setValue("overnightAllowed", event.target.checked, { shouldValidate: true })}
                />
                Overnight allowed
              </label>
            </div>

            <div className="grid gap-2">
              <Label>Photos</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-surface/80 p-6 text-sm text-muted-foreground">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-primary" />}
                Upload one or more images
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => handleUpload(event.target.files)} />
              </label>
              <p className="text-xs text-rose-600">{form.formState.errors.photos?.message as string | undefined}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {photos.map((photo) => (
                  <div key={photo.path} className="relative overflow-hidden rounded-3xl border border-border">
                    <div className="relative h-36">
                      <Image src={photo.url} alt="Uploaded spot photo" fill className="object-cover" />
                    </div>
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-full bg-slate-950/80 p-2 text-white"
                      onClick={() => removePhoto(photo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {form.formState.errors.root?.message ? <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p> : null}
            {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

            {isSignedIn === false ? (
              <p className="text-sm text-rose-600">
                Sign in before publishing. <Link href="/sign-in" className="underline">Go to sign in</Link>.
              </p>
            ) : null}

            {!isReadyToPublish ? (
              <p className="text-xs text-muted-foreground">
                Add a title, short description, access instructions, pin, price, availability window, and photo before publishing.
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending || isSubmitting || isUploading || isSignedIn === null}>
              {pending || isSubmitting ? "Publishing..." : mode === "create" ? "Publish listing" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Place your pin</CardTitle>
            <CardDescription>Click anywhere on the map or drag the marker to refine the exact spot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the map to place your parking spot. Drag the marker to fine tune it.
            </p>
            <HostPinMap
              latitude={latitude}
              longitude={longitude}
              onChange={({ latitude: nextLatitude, longitude: nextLongitude }) => {
                setPinPlaced(true);
                setPinError(null);
                form.setValue("latitude", Number(nextLatitude.toFixed(6)), { shouldValidate: true });
                form.setValue("longitude", Number(nextLongitude.toFixed(6)), { shouldValidate: true });
              }}
            />
            <input type="hidden" {...form.register("latitude")} />
            <input type="hidden" {...form.register("longitude")} />
            {pinError ? <p className="text-xs text-rose-600">{pinError}</p> : null}
            <div className="grid gap-4 rounded-3xl bg-surface/80 p-4 text-sm text-muted-foreground md:grid-cols-2">
              <div>
                <div className="font-medium text-foreground">Latitude</div>
                <div className="mt-1">{latitude.toFixed(6)}</div>
              </div>
              <div>
                <div className="font-medium text-foreground">Longitude</div>
                <div className="mt-1">{longitude.toFixed(6)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(249,115,22,0.08))]">
          <CardContent className="space-y-3 p-6 text-sm">
            <div className="font-display text-xl font-semibold">Publishing checklist</div>
            <ul className="grid gap-2 text-muted-foreground">
              <li>At least one photo uploaded</li>
              <li>Map pin placed accurately</li>
              <li>Availability window set</li>
              <li>Access instructions included</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
