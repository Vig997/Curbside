import { cache } from "react";
import { unstable_cache, unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getPublicSupabase } from "@/lib/supabase/public";
import {
  BOOKING_BASE_SELECT,
  BOOKING_CONTACT_SELECT,
  BOOKING_CORE_SELECT,
  isMissingGuestColumnsError,
  isMissingGuestContactError,
  isMissingGuestStorageError,
  resolveGuestContact
} from "@/lib/domain/booking-guest";
import {
  getActiveDemoSpotReservations,
  getMockBookingById,
  getMockBookingsByIds,
  getMockBookingsForUser,
  type SpotReservation
} from "@/lib/data/demo-bookings";
import { areDemoSpotsEnabled } from "@/lib/config/feature-flags";
import { demoSpots, getDemoSpotById } from "@/lib/data/demo-spots";
import { getReservationGuest, getReservationGuestsByBookingIds, mergeGuestContacts } from "@/lib/domain/reservation-guests";
import { filterCurrentReservations } from "@/lib/domain/reservation-overlap";
import { isSeedExampleSpot } from "@/lib/domain/spot-ownership";
import { deriveProfileName } from "@/lib/helpers/profile";
import { PUBLISHED_SPOTS_TAG } from "@/lib/config/constants";
import type { AvailabilityWindow, Booking, GuestContact, MapSpotSummary, ParkingSpot, Profile, SpotPhoto, SpotType } from "@/lib/types";

type SpotRow = {
  id: string | null;
  owner_id: string | null;
  title: string | null;
  description: string | null;
  location_notes: string | null;
  spot_type: string | null;
  price_per_hour: number | string | null;
  covered: boolean | null;
  has_ev_charger: boolean | null;
  vehicle_size_restrictions: string | null;
  access_instructions: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  vehicle_info?: string | null;
};

type SpotPhotoRow = {
  id: string;
  spot_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean | null;
  sort_order: number | string | null;
};

type AvailabilityWindowRow = {
  id: string;
  spot_id: string;
  start_at: string;
  end_at: string;
  repeat_daily: boolean | null;
  overnight_allowed: boolean | null;
};

type QueryResult<T> = {
  data: T;
  error: string | null;
};

type ValidSpotRow = SpotRow & {
  id: string;
  owner_id: string;
};

type BookingRow = {
  id: string;
  spot_id: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  total_price: number | string;
  status: Booking["status"];
  created_at: string;
  updated_at: string;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
  guest_vehicle_info?: string | null;
  guest_contact?: Partial<GuestContact> | Record<string, unknown> | null;
};

const SPOT_BASE_SELECT = `
  id,
  owner_id,
  title,
  description,
  location_notes,
  spot_type,
  price_per_hour,
  covered,
  has_ev_charger,
  vehicle_size_restrictions,
  access_instructions,
  latitude,
  longitude,
  is_published,
  created_at,
  updated_at
`;

const VALID_SPOT_TYPES: SpotType[] = [
  "driveway",
  "garage",
  "apartment_spot",
  "covered_lot",
  "uncovered_lot"
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BookingQueryResult<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

async function runBookingSelect<T>(
  supabase: SupabaseServerClient,
  run: (select: string) => PromiseLike<BookingQueryResult<T>>
): Promise<BookingQueryResult<T>> {
  const withGuest = await run(BOOKING_BASE_SELECT);

  if (!withGuest.error || !isMissingGuestStorageError(withGuest.error)) {
    return withGuest;
  }

  const withContact = await run(BOOKING_CONTACT_SELECT);

  if (!withContact.error || !isMissingGuestContactError(withContact.error)) {
    return withContact;
  }

  return run(BOOKING_CORE_SELECT);
}

function logQueryError(scope: string, error: unknown, context?: Record<string, unknown>) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  ) {
    return;
  }

  console.error(`[supabase] ${scope}`, {
    error:
      typeof error === "object" && error !== null
        ? {
            message: "message" in error ? (error as { message?: unknown }).message : undefined,
            details: "details" in error ? (error as { details?: unknown }).details : undefined,
            hint: "hint" in error ? (error as { hint?: unknown }).hint : undefined,
            code: "code" in error ? (error as { code?: unknown }).code : undefined,
            name: "name" in error ? (error as { name?: unknown }).name : undefined
          }
        : error,
    ...(context ? { context } : {})
  });
}

function mapProfile(row: ProfileRow | null | undefined): Profile {
  const email = typeof row?.email === "string" ? row.email : null;

  return {
    id: row?.id ?? "",
    fullName:
      typeof row?.full_name === "string" && row.full_name.trim().length > 0
        ? row.full_name
        : deriveProfileName({ email }),
    avatarUrl: typeof row?.avatar_url === "string" ? row.avatar_url : null,
    email,
    phone: typeof row?.phone === "string" ? row.phone.trim() : "",
    address: typeof row?.address === "string" ? row.address.trim() : "",
    vehicleInfo: typeof row?.vehicle_info === "string" ? row.vehicle_info.trim() : ""
  };
}

function fallbackProfile(ownerId: string): Profile {
  return {
    id: ownerId,
    fullName: "Curbside Host",
    avatarUrl: null,
    email: null,
    phone: "",
    address: "",
    vehicleInfo: ""
  };
}

function mapBookingFromRow(row: BookingRow, spot: ParkingSpot, driver: Profile): Booking {
  return {
    id: row.id,
    spotId: row.spot_id,
    driverId: row.driver_id,
    startTime: row.start_time,
    endTime: row.end_time,
    totalPrice: Number(row.total_price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spot,
    driver,
    guest: resolveGuestContact(row, driver)
  };
}

function normalizeString(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeNumber(value: number | string | null | undefined, fallback: number) {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeCoordinate(value: number | string | null | undefined) {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeSpotType(value: string | null | undefined): SpotType {
  return VALID_SPOT_TYPES.includes(value as SpotType) ? (value as SpotType) : "driveway";
}

function isValidSpot(row: Partial<SpotRow> | null | undefined): row is ValidSpotRow {
  return Boolean(row && typeof row.id === "string" && typeof row.owner_id === "string");
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function mapSpotPhotos(rows: SpotPhotoRow[]): Map<string, SpotPhoto[]> {
  const photosBySpot = new Map<string, SpotPhoto[]>();

  for (const row of rows) {
    const photo: SpotPhoto = {
      id: row.id,
      url: row.url,
      storagePath: row.storage_path,
      isPrimary: Boolean(row.is_primary),
      sortOrder: Number(row.sort_order ?? 0)
    };
    const current = photosBySpot.get(row.spot_id) ?? [];
    current.push(photo);
    photosBySpot.set(row.spot_id, current);
  }

  for (const [spotId, photos] of photosBySpot) {
    photosBySpot.set(
      spotId,
      [...photos].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.sortOrder - right.sortOrder;
      })
    );
  }

  return photosBySpot;
}

function mapAvailabilityWindows(rows: AvailabilityWindowRow[]): Map<string, AvailabilityWindow[]> {
  const windowsBySpot = new Map<string, AvailabilityWindow[]>();

  for (const row of rows) {
    const window: AvailabilityWindow = {
      id: row.id,
      startAt: row.start_at,
      endAt: row.end_at,
      repeatDaily: Boolean(row.repeat_daily),
      overnightAllowed: Boolean(row.overnight_allowed)
    };
    const current = windowsBySpot.get(row.spot_id) ?? [];
    current.push(window);
    windowsBySpot.set(row.spot_id, current);
  }

  return windowsBySpot;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof getPublicSupabase>;

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

async function fetchProfiles(ownerIds: string[], supabase?: SupabaseServerClient): Promise<Map<string, Profile>> {
  if (ownerIds.length === 0) {
    return new Map();
  }

  try {
    const client = supabase ?? (await createClient());
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, email, phone, address, vehicle_info")
      .in("id", ownerIds);

    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      const fallback = await client.from("profiles").select("id, full_name, avatar_url, email").in("id", ownerIds);
      if (fallback.error) {
        logQueryError("fetchProfiles", fallback.error, { ownerIds });
        return new Map();
      }

      return new Map((fallback.data ?? []).map((row) => [row.id, mapProfile(row as ProfileRow)]));
    }

    if (error) {
      logQueryError("fetchProfiles", error, { ownerIds });
      return new Map();
    }

    return new Map((data ?? []).map((row) => [row.id, mapProfile(row as ProfileRow)]));
  } catch (error) {
    logQueryError("fetchProfiles", error, { ownerIds });
    return new Map();
  }
}

async function fetchSpotPhotos(spotIds: string[], supabase?: SupabaseServerClient): Promise<Map<string, SpotPhoto[]>> {
  if (spotIds.length === 0) {
    return new Map();
  }

  try {
    const client = supabase ?? (await createClient());
    const { data, error } = await client
      .from("spot_photos")
      .select("id, spot_id, url, storage_path, is_primary, sort_order")
      .in("spot_id", spotIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) {
      logQueryError("fetchSpotPhotos", error, { spotIds });
      return new Map();
    }

    return mapSpotPhotos((data ?? []) as SpotPhotoRow[]);
  } catch (error) {
    logQueryError("fetchSpotPhotos", error, { spotIds });
    return new Map();
  }
}

async function fetchPrimaryPhotosBySpotId(
  spotIds: string[],
  supabase?: SupabaseServerClient
): Promise<Map<string, SpotPhoto[]>> {
  if (spotIds.length === 0) {
    return new Map();
  }

  try {
    const client = supabase ?? (await createClient());
    const { data, error } = await client
      .from("spot_photos")
      .select("id, spot_id, url, storage_path, is_primary, sort_order")
      .in("spot_id", spotIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) {
      logQueryError("fetchPrimaryPhotosBySpotId", error, { spotIds });
      return new Map();
    }

    const photosBySpot = new Map<string, SpotPhoto[]>();

    for (const row of (data ?? []) as SpotPhotoRow[]) {
      if (photosBySpot.has(row.spot_id)) {
        continue;
      }

      photosBySpot.set(row.spot_id, [
        {
          id: row.id,
          url: row.url,
          storagePath: row.storage_path,
          isPrimary: Boolean(row.is_primary),
          sortOrder: Number(row.sort_order ?? 0)
        }
      ]);
    }

    return photosBySpot;
  } catch (error) {
    logQueryError("fetchPrimaryPhotosBySpotId", error, { spotIds });
    return new Map();
  }
}

function assembleBookingListSpots(rows: SpotRow[], photosBySpotId: Map<string, SpotPhoto[]>): ParkingSpot[] {
  return rows
    .filter(isValidSpot)
    .map((row) => {
      const latitude = normalizeCoordinate(row.latitude);
      const longitude = normalizeCoordinate(row.longitude);

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        id: row.id,
        ownerId: row.owner_id,
        title: normalizeString(row.title, "Parking spot"),
        description: normalizeString(row.description, ""),
        locationNotes: normalizeString(row.location_notes, ""),
        spotType: normalizeSpotType(row.spot_type),
        pricePerHour: Math.max(1, normalizeNumber(row.price_per_hour, 12)),
        covered: Boolean(row.covered),
        hasEvCharger: Boolean(row.has_ev_charger),
        vehicleSizeRestrictions: normalizeString(row.vehicle_size_restrictions, ""),
        accessInstructions: normalizeString(row.access_instructions, ""),
        latitude,
        longitude,
        isPublished: Boolean(row.is_published),
        createdAt: normalizeString(row.created_at, new Date().toISOString()),
        updatedAt: normalizeString(row.updated_at, new Date().toISOString()),
        owner: fallbackProfile(row.owner_id),
        photos: photosBySpotId.get(row.id) ?? [],
        availabilityWindows: [],
        hostRating: 0
      } satisfies ParkingSpot;
    })
    .filter(Boolean) as ParkingSpot[];
}

async function getBookingListSpotsByIds(spotIds: string[]): Promise<Map<string, ParkingSpot>> {
  const spotsById = new Map<string, ParkingSpot>();
  const uniqueIds = [...new Set(spotIds)];

  for (const id of uniqueIds) {
    if (!isUuid(id)) {
      const demoSpot = getDemoSpotById(id);
      if (demoSpot) {
        spotsById.set(id, demoSpot);
      }
    }
  }

  const uuidIds = uniqueIds.filter(isUuid);

  if (uuidIds.length === 0) {
    return spotsById;
  }

  if (!isSupabaseConfigured()) {
    return spotsById;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("parking_spots").select(SPOT_BASE_SELECT).in("id", uuidIds);

    if (error || !data) {
      if (error) {
        logQueryError("getBookingListSpotsByIds", error, { spotIds: uuidIds });
      }
      return spotsById;
    }

    const validRows = (data as SpotRow[]).filter(isValidSpot);
    const photosBySpotId = await fetchPrimaryPhotosBySpotId(
      validRows.map((row) => row.id),
      supabase
    );

    for (const spot of assembleBookingListSpots(validRows, photosBySpotId)) {
      spotsById.set(spot.id, spot);
    }
  } catch (error) {
    logQueryError("getBookingListSpotsByIds", error, { spotIds: uuidIds });
  }

  return spotsById;
}

async function fetchAvailabilityWindows(
  spotIds: string[],
  supabase?: SupabaseServerClient
): Promise<Map<string, AvailabilityWindow[]>> {
  if (spotIds.length === 0) {
    return new Map();
  }

  try {
    const client = supabase ?? (await createClient());
    const { data, error } = await client
      .from("availability_windows")
      .select("id, spot_id, start_at, end_at, repeat_daily, overnight_allowed")
      .in("spot_id", spotIds)
      .order("start_at", { ascending: true });

    if (error) {
      logQueryError("fetchAvailabilityWindows", error, { spotIds });
      return new Map();
    }

    return mapAvailabilityWindows((data ?? []) as AvailabilityWindowRow[]);
  } catch (error) {
    logQueryError("fetchAvailabilityWindows", error, { spotIds });
    return new Map();
  }
}

async function assembleSpots(rows: SpotRow[], supabase?: SupabaseServerClient): Promise<ParkingSpot[]> {
  const validRows = rows.filter(isValidSpot);
  const spotIds = validRows.map((row) => row.id);
  const ownerIds = [...new Set(validRows.map((row) => row.owner_id))];
  const client = supabase ?? (await createClient());

  const [profilesById, photosBySpotId, windowsBySpotId] = await Promise.all([
    fetchProfiles(ownerIds, client),
    fetchSpotPhotos(spotIds, client),
    fetchAvailabilityWindows(spotIds, client)
  ]);

  return validRows
    .map((row) => {
      const latitude = normalizeCoordinate(row.latitude);
      const longitude = normalizeCoordinate(row.longitude);

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        id: row.id,
        ownerId: row.owner_id,
        title: normalizeString(row.title, "Parking spot"),
        description: normalizeString(row.description, "Reliable parking spot with booking details available after confirmation."),
        locationNotes: normalizeString(row.location_notes, "Location details available after booking."),
        spotType: normalizeSpotType(row.spot_type),
        pricePerHour: Math.max(1, normalizeNumber(row.price_per_hour, 12)),
        covered: Boolean(row.covered),
        hasEvCharger: Boolean(row.has_ev_charger),
        vehicleSizeRestrictions: normalizeString(row.vehicle_size_restrictions, "Standard passenger vehicles"),
        accessInstructions: normalizeString(row.access_instructions, "Access instructions will be shared after booking."),
        latitude,
        longitude,
        isPublished: Boolean(row.is_published),
        createdAt: normalizeString(row.created_at, new Date().toISOString()),
        updatedAt: normalizeString(row.updated_at, new Date().toISOString()),
        owner: profilesById.get(row.owner_id) ?? fallbackProfile(row.owner_id),
        photos: photosBySpotId.get(row.id) ?? [],
        availabilityWindows: windowsBySpotId.get(row.id) ?? [],
        hostRating: 0
      } satisfies ParkingSpot;
    })
    .filter(Boolean) as ParkingSpot[];
}

function demoSpotToSummary(spot: ParkingSpot): MapSpotSummary {
  return {
    id: spot.id,
    ownerId: spot.ownerId,
    title: spot.title,
    description: spot.description,
    locationNotes: spot.locationNotes,
    latitude: spot.latitude,
    longitude: spot.longitude,
    pricePerHour: spot.pricePerHour,
    isPublished: spot.isPublished,
    covered: spot.covered,
    hasEvCharger: spot.hasEvCharger,
    spotType: spot.spotType,
    isDemo: true,
    availabilityWindows: spot.availabilityWindows
  };
}

async function assembleSpotSummaries(rows: SpotRow[], supabase?: SupabaseServerClient): Promise<MapSpotSummary[]> {
  const validRows = rows.filter(isValidSpot);
  const spotIds = validRows.map((row) => row.id);
  const client = supabase ?? (await createClient());
  const windowsBySpotId = await fetchAvailabilityWindows(spotIds, client);

  return validRows
    .map((row) => {
      const latitude = normalizeCoordinate(row.latitude);
      const longitude = normalizeCoordinate(row.longitude);

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        id: row.id,
        ownerId: row.owner_id,
        title: normalizeString(row.title, "Parking spot"),
        description: normalizeString(row.description, "Reliable parking spot with booking details available after confirmation."),
        locationNotes: normalizeString(row.location_notes, "Location details available after booking."),
        latitude,
        longitude,
        pricePerHour: Math.max(1, normalizeNumber(row.price_per_hour, 12)),
        isPublished: Boolean(row.is_published),
        covered: Boolean(row.covered),
        hasEvCharger: Boolean(row.has_ev_charger),
        spotType: normalizeSpotType(row.spot_type),
        availabilityWindows: windowsBySpotId.get(row.id) ?? []
      } satisfies MapSpotSummary;
    })
    .filter(Boolean) as MapSpotSummary[];
}

function getDemoMapSummaries() {
  return areDemoSpotsEnabled() ? demoSpots.map(demoSpotToSummary) : [];
}

function getDemoSpotsForMerge() {
  return areDemoSpotsEnabled() ? demoSpots : [];
}

function mergePublishedMapSummaries(realSummaries: MapSpotSummary[]) {
  const publishedReal = realSummaries.filter((spot) => spot.isPublished);
  const merged = [...getDemoMapSummaries(), ...publishedReal];
  const seen = new Set<string>();

  return merged.filter((spot) => {
    if (seen.has(spot.id)) {
      return false;
    }

    seen.add(spot.id);
    return true;
  });
}

function mergePublishedSpots(realSpots: ParkingSpot[]) {
  const publishedRealSpots = realSpots.filter((spot) => spot.isPublished);
  const merged = [...getDemoSpotsForMerge(), ...publishedRealSpots];
  const seen = new Set<string>();

  return merged.filter((spot) => {
    if (seen.has(spot.id)) {
      return false;
    }

    seen.add(spot.id);
    return true;
  });
}

async function fetchSpotsByQuery(
  queryBuilder: (supabase: Awaited<ReturnType<typeof createClient>>) => any,
  options: { dynamic?: boolean } = {}
): Promise<QueryResult<ParkingSpot[]>> {
  if (options.dynamic !== false) {
    noStore();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await queryBuilder(supabase);

    if (error) {
      logQueryError("fetchSpotsByQuery", error);
      return { data: [], error: "Unable to load parking spots from Supabase." };
    }

    const spots = await assembleSpots((data ?? []) as SpotRow[], supabase);
    return { data: spots, error: null };
  } catch (error) {
    logQueryError("fetchSpotsByQuery", error);
    return { data: [], error: "Unable to load parking spots from Supabase." };
  }
}

async function fetchPublishedMapSummariesUncached(): Promise<QueryResult<MapSpotSummary[]>> {
  try {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from("parking_spots")
      .select(SPOT_BASE_SELECT)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      logQueryError("fetchPublishedMapSummaries", error);
      return { data: getDemoMapSummaries(), error: "Unable to load parking spots from Supabase." };
    }

    const summaries = await assembleSpotSummaries((data ?? []) as SpotRow[], supabase);
    return { data: mergePublishedMapSummaries(summaries), error: null };
  } catch (error) {
    logQueryError("fetchPublishedMapSummaries", error);
    return { data: getDemoMapSummaries(), error: "Unable to load parking spots from Supabase." };
  }
}

const getCachedPublishedMapSummaries = unstable_cache(
  fetchPublishedMapSummariesUncached,
  ["published-map-spots"],
  { revalidate: 60, tags: [PUBLISHED_SPOTS_TAG] }
);

async function fetchPublishedMapSummaries(): Promise<QueryResult<MapSpotSummary[]>> {
  if (!isSupabaseConfigured()) {
    return { data: getDemoMapSummaries(), error: null };
  }

  return getCachedPublishedMapSummaries();
}

export const getSessionUser = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    logQueryError("getSessionUser", error);
    return null;
  }
});

export const getCurrentUserProfile = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      logQueryError("getCurrentUserProfile", error, { userId: user.id });
    }

    return {
      user,
      profile: profile
        ? mapProfile(profile as ProfileRow)
        : {
            id: user.id,
            fullName: deriveProfileName(user),
            avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
            email: user.email ?? null
          }
    };
  } catch (error) {
    logQueryError("getCurrentUserProfile", error);
    return { user: null, profile: null };
  }
});

export async function getPublishedMapSpotsResult(): Promise<QueryResult<MapSpotSummary[]>> {
  return fetchPublishedMapSummaries();
}

export async function getPublishedMapSpots() {
  const result = await getPublishedMapSpotsResult();
  return result.data;
}

export async function getPublishedParkingSpotsResult(): Promise<QueryResult<ParkingSpot[]>> {
  if (!isSupabaseConfigured()) {
    return { data: getDemoSpotsForMerge(), error: null };
  }

  const result = await fetchSpotsByQuery(
    (supabase) =>
      supabase.from("parking_spots").select(SPOT_BASE_SELECT).eq("is_published", true).order("created_at", { ascending: false }),
    { dynamic: false }
  );

  return {
    data: mergePublishedSpots(result.data),
    error: result.error
  };
}

export async function getPublishedParkingSpots() {
  const result = await getPublishedParkingSpotsResult();
  return result.data;
}

export async function getActiveReservationsForSpotIds(spotIds: string[]): Promise<SpotReservation[]> {
  noStore();
  const uniqueIds = [...new Set(spotIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const reservations: SpotReservation[] = [];

  for (const reservation of await getActiveDemoSpotReservations()) {
    if (uniqueIds.includes(reservation.spotId)) {
      reservations.push(reservation);
    }
  }

  const uuidIds = uniqueIds.filter(isUuid);

  if (!isSupabaseConfigured() || uuidIds.length === 0) {
    return reservations;
  }

  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, spot_id, driver_id, start_time, end_time")
      .eq("status", "confirmed")
      .gt("end_time", nowIso)
      .in("spot_id", uuidIds);

    if (error) {
      logQueryError("getActiveReservationsForSpotIds", error, { spotIds: uuidIds });
      return reservations;
    }

    for (const row of data ?? []) {
      reservations.push({
        spotId: row.spot_id,
        driverId: row.driver_id,
        bookingId: row.id,
        startTime: row.start_time,
        endTime: row.end_time
      });
    }
  } catch (error) {
    logQueryError("getActiveReservationsForSpotIds", error, { spotIds: uuidIds });
  }

  return reservations;
}

export async function getCurrentReservationsForSpotIds(spotIds: string[]): Promise<SpotReservation[]> {
  return filterCurrentReservations(await getActiveReservationsForSpotIds(spotIds));
}

export async function getActiveSpotReservations(): Promise<SpotReservation[]> {
  noStore();
  const reservations: SpotReservation[] = [...(await getActiveDemoSpotReservations())];

  if (!isSupabaseConfigured()) {
    return filterCurrentReservations(reservations);
  }

  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, spot_id, driver_id, start_time, end_time")
      .eq("status", "confirmed")
      .gt("end_time", nowIso);

    if (error) {
      logQueryError("getActiveSpotReservations", error);
      return filterCurrentReservations(reservations);
    }

    for (const row of data ?? []) {
      reservations.push({
        spotId: row.spot_id,
        driverId: row.driver_id,
        bookingId: row.id,
        startTime: row.start_time,
        endTime: row.end_time
      });
    }
  } catch (error) {
    logQueryError("getActiveSpotReservations", error);
  }

  return filterCurrentReservations(reservations);
}

export async function getCurrentSpotReservations() {
  return getActiveSpotReservations();
}

export async function getParkingSpotById(spotId: string) {
  if (!isUuid(spotId)) {
    return getDemoSpotById(spotId);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parking_spots")
      .select(SPOT_BASE_SELECT)
      .eq("id", spotId)
      .maybeSingle();

    if (error) {
      logQueryError("getParkingSpotById", error, { spotId });
      return null;
    }

    if (!isValidSpot(data as Partial<SpotRow> | null | undefined)) {
      return null;
    }

    const [spot] = await assembleSpots([data as SpotRow], supabase);
    return spot ?? null;
  } catch (error) {
    logQueryError("getParkingSpotById", error, { spotId });
    return null;
  }
}

export async function getHostSpotsResult(ownerId: string): Promise<QueryResult<ParkingSpot[]>> {
  const result = await fetchSpotsByQuery((supabase) =>
    supabase.from("parking_spots").select(SPOT_BASE_SELECT).eq("owner_id", ownerId).order("created_at", { ascending: false })
  );

  return {
    data: result.data.filter((spot) => !isSeedExampleSpot(spot.id)),
    error: result.error
  };
}

export async function getHostSpots(ownerId: string) {
  const result = await getHostSpotsResult(ownerId);
  return result.data;
}

async function getParkingSpotsByIds(spotIds: string[]): Promise<Map<string, ParkingSpot>> {
  const spotsById = new Map<string, ParkingSpot>();
  const uniqueIds = [...new Set(spotIds)];

  for (const id of uniqueIds) {
    if (!isUuid(id)) {
      const demoSpot = getDemoSpotById(id);
      if (demoSpot) {
        spotsById.set(id, demoSpot);
      }
    }
  }

  const uuidIds = uniqueIds.filter(isUuid);
  if (uuidIds.length === 0) {
    return spotsById;
  }

  if (!isSupabaseConfigured()) {
    for (const id of uuidIds) {
      const demoSpot = getDemoSpotById(id);
      if (demoSpot) {
        spotsById.set(id, demoSpot);
      }
    }
    return spotsById;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("parking_spots").select(SPOT_BASE_SELECT).in("id", uuidIds);

    if (error || !data) {
      if (error) {
        logQueryError("getParkingSpotsByIds", error, { spotIds: uuidIds });
      }
      return spotsById;
    }

    const assembled = await assembleSpots(data as SpotRow[], supabase);
    for (const spot of assembled) {
      spotsById.set(spot.id, spot);
    }
  } catch (error) {
    logQueryError("getParkingSpotsByIds", error, { spotIds: uuidIds });
  }

  return spotsById;
}

export async function getUserBookingsResult(driverId: string): Promise<QueryResult<Booking[]>> {
  const allMockBookings = await getMockBookingsForUser(driverId);
  const mockBookings = areDemoSpotsEnabled()
    ? allMockBookings
    : allMockBookings.filter((booking) => !booking.spotId.startsWith("demo-"));

  try {
    const supabase = await createClient();
    const { data, error } = await runBookingSelect(supabase, (select) =>
      supabase.from("bookings").select(select).eq("driver_id", driverId).order("start_time", { ascending: true })
    );

    if (error) {
      logQueryError("getUserBookings", error, { driverId });
      return {
        data: mockBookings,
        error: mockBookings.length > 0 ? null : "Unable to load reservations from Supabase."
      };
    }

    const rows = (data ?? []) as unknown as BookingRow[];
    const spotsById = await getBookingListSpotsByIds(rows.map((row) => row.spot_id));
    const driverProfiles = await fetchProfiles([driverId]);
    const driver = driverProfiles.get(driverId) ?? fallbackProfile(driverId);
    const bookings = rows
      .map((row) => {
        const spot = spotsById.get(row.spot_id);
        if (!spot) {
          return null;
        }

        return mapBookingFromRow(row, spot, driver);
      })
      .filter(Boolean) as Booking[];

    return {
      data: [...mockBookings, ...bookings],
      error: null
    };
  } catch (error) {
    logQueryError("getUserBookings", error, { driverId });
    return {
      data: mockBookings,
      error: "Unable to load reservations from Supabase."
    };
  }
}

export async function getUserBookings(driverId: string): Promise<Booking[]> {
  const result = await getUserBookingsResult(driverId);
  return result.data;
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const mockBooking = await getMockBookingById(bookingId);
  const reservationGuest = await getReservationGuest(bookingId);

  const withStoredGuest = (booking: Booking | null) => {
    if (!booking) {
      return null;
    }

    return {
      ...booking,
      guest: mergeGuestContacts(booking.guest, reservationGuest)
    };
  };

  try {
    const supabase = await createClient();
    const { data, error } = await runBookingSelect(supabase, (select) =>
      supabase.from("bookings").select(select).eq("id", bookingId).maybeSingle<BookingRow>()
    );

    if (error || !data) {
      if (error) {
        logQueryError("getBookingById", error, { bookingId });
      }
      return withStoredGuest(mockBooking);
    }

    const spot = await getParkingSpotById(data.spot_id);

    if (!spot) {
      return withStoredGuest(mockBooking);
    }

    const driverProfiles = await fetchProfiles([data.driver_id]);
    const driver = driverProfiles.get(data.driver_id) ?? fallbackProfile(data.driver_id);
    const booking = mapBookingFromRow(data, spot, driver);

    return {
      ...booking,
      guest: mergeGuestContacts(booking.guest, mockBooking?.guest, reservationGuest)
    };
  } catch (error) {
    logQueryError("getBookingById", error, { bookingId });
    return withStoredGuest(mockBooking);
  }
}

export async function getHostBookingsResult(
  ownerId: string,
  hostSpots?: ParkingSpot[]
): Promise<QueryResult<Booking[]>> {
  const spots = hostSpots ?? (await getHostSpotsResult(ownerId)).data;

  if (spots.length === 0) {
    return { data: [], error: null };
  }

  try {
    const supabase = await createClient();
    const spotIds = spots.map((spot) => spot.id);
    const { data, error } = await runBookingSelect(supabase, (select) =>
      supabase
        .from("bookings")
        .select(select)
        .in("spot_id", spotIds)
        .order("start_time", { ascending: false })
        .returns<BookingRow[]>()
    );

    if (error || !data) {
      if (error) {
        logQueryError("getHostBookings", error, { ownerId, spotIds });
      }
      return {
        data: [],
        error: error ? "Unable to load reservations from Supabase." : null
      };
    }

    const spotsById = new Map(spots.map((spot) => [spot.id, spot]));
    const driverProfiles = await fetchProfiles([...new Set(data.map((row) => row.driver_id))]);
    const reservationGuests = await getReservationGuestsByBookingIds(data.map((row) => row.id));
    const cookieGuests = new Map(
      [...(await getMockBookingsByIds(data.map((row) => row.id))).values()].map((booking) => [booking.id, booking.guest] as const)
    );

    const bookings = data
      .map((row) => {
        const spot = spotsById.get(row.spot_id);
        if (!spot) {
          return null;
        }

        const booking = mapBookingFromRow(
          row,
          spot,
          driverProfiles.get(row.driver_id) ?? fallbackProfile(row.driver_id)
        );

        return {
          ...booking,
          guest: mergeGuestContacts(booking.guest, cookieGuests.get(booking.id), reservationGuests.get(booking.id))
        };
      })
      .filter(Boolean) as Booking[];

    return { data: bookings, error: null };
  } catch (error) {
    logQueryError("getHostBookings", error, { ownerId });
    return { data: [], error: "Unable to load reservations from Supabase." };
  }
}

export async function getHostBookings(ownerId: string, hostSpots?: ParkingSpot[]): Promise<Booking[]> {
  const result = await getHostBookingsResult(ownerId, hostSpots);
  return result.data;
}

export async function getHostBookingById(ownerId: string, bookingId: string): Promise<Booking | null> {
  const spotsResult = await getHostSpotsResult(ownerId);
  const spotIds = new Set(spotsResult.data.map((spot) => spot.id));

  if (spotIds.size === 0) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await runBookingSelect(supabase, (select) =>
      supabase.from("bookings").select(select).eq("id", bookingId).maybeSingle<BookingRow>()
    );

    if (error || !data || !spotIds.has(data.spot_id)) {
      if (error) {
        logQueryError("getHostBookingById", error, { ownerId, bookingId });
      }
      return null;
    }

    const spot = spotsResult.data.find((entry) => entry.id === data.spot_id);
    if (!spot) {
      return null;
    }

    const driverProfiles = await fetchProfiles([data.driver_id]);
    const driver = driverProfiles.get(data.driver_id) ?? fallbackProfile(data.driver_id);
    const booking = mapBookingFromRow(data, spot, driver);
    const [storedBooking, reservationGuest] = await Promise.all([
      getMockBookingById(bookingId),
      getReservationGuest(bookingId)
    ]);

    return {
      ...booking,
      guest: mergeGuestContacts(booking.guest, storedBooking?.guest, reservationGuest)
    };
  } catch (error) {
    logQueryError("getHostBookingById", error, { ownerId, bookingId });
    return null;
  }
}
