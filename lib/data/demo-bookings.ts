import { cookies } from "next/headers";

import {
  BOOKING_CONTACT_SELECT,
  BOOKING_CORE_SELECT,
  BOOKING_GUEST_SELECT,
  guestContactToPayload,
  isMissingGuestColumnsError,
  isMissingGuestContactError,
  isMissingGuestStorageError,
  resolveGuestContact,
  stripGuestFields
} from "@/lib/domain/booking-guest";
import { getDemoSpotById } from "@/lib/data/demo-spots";
import { saveReservationGuest } from "@/lib/domain/reservation-guests";
import { createClient } from "@/lib/supabase/server";
import type { Booking, GuestContact, Profile } from "@/lib/types";

const MOCK_BOOKINGS_COOKIE = "mock_reservations";

export interface SpotReservation {
  spotId: string;
  driverId: string;
  bookingId: string;
  startTime: string;
  endTime: string;
}

type DemoBookingRow = {
  id: string;
  demo_spot_id: string;
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

function serializeBookings(bookings: Booking[]) {
  return JSON.stringify(bookings);
}

async function readCookieBookings() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MOCK_BOOKINGS_COOKIE)?.value;

  if (!raw) {
    return [] as Booking[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as Booking[]).map((booking) => ({
          ...booking,
          guest: booking.guest ?? {
            fullName: booking.driver?.fullName ?? "Guest",
            email: booking.driver?.email ?? "",
            phone: booking.driver?.phone ?? "",
            address: booking.driver?.address ?? "",
            vehicleInfo: booking.driver?.vehicleInfo ?? ""
          }
        }))
      : [];
  } catch {
    return [];
  }
}

async function writeCookieBookings(bookings: Booking[]) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_BOOKINGS_COOKIE, serializeBookings(bookings), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

function mapDemoBookingRow(
  row: DemoBookingRow,
  spot: NonNullable<ReturnType<typeof getDemoSpotById>>,
  driver: Profile,
  guestOverride?: GuestContact
): Booking {
  const guest = guestOverride ?? resolveGuestContact(row, driver);

  return {
    id: row.id,
    spotId: row.demo_spot_id,
    driverId: row.driver_id,
    startTime: row.start_time,
    endTime: row.end_time,
    totalPrice: Number(row.total_price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spot,
    driver,
    guest
  };
}

function isMissingDemoBookingsTable(error: { code?: string } | null | undefined) {
  return error?.code === "42P01";
}

const DEMO_BOOKING_CORE_SELECT = `
  id,
  demo_spot_id,
  driver_id,
  start_time,
  end_time,
  total_price,
  status,
  created_at,
  updated_at
`;

const DEMO_BOOKING_CONTACT_SELECT = `
  ${DEMO_BOOKING_CORE_SELECT.trim()},
  guest_contact
`;

const DEMO_BOOKING_BASE_SELECT = `
  ${DEMO_BOOKING_CORE_SELECT.trim()},
  ${BOOKING_GUEST_SELECT}
`;

async function runDemoBookingSelect<T>(
  run: (select: string) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>
) {
  const withGuest = await run(DEMO_BOOKING_BASE_SELECT);

  if (!withGuest.error || !isMissingGuestStorageError(withGuest.error)) {
    return withGuest;
  }

  const withContact = await run(DEMO_BOOKING_CONTACT_SELECT);

  if (!withContact.error || !isMissingGuestContactError(withContact.error)) {
    return withContact;
  }

  return run(DEMO_BOOKING_CORE_SELECT);
}

async function insertDemoBookingPayload(payload: Record<string, unknown>) {
  const supabase = await createClient();
  let { error } = await supabase.from("demo_bookings").insert(payload);

  if (error && isMissingGuestColumnsError(error)) {
    const { guest_name, guest_email, guest_phone, guest_address, guest_vehicle_info, guest_contact, ...rest } = payload;
    ({ error } = await supabase.from("demo_bookings").insert({ ...rest, guest_contact }));
  }

  if (error && isMissingGuestContactError(error)) {
    ({ error } = await supabase.from("demo_bookings").insert(stripGuestFields(payload)));
  }

  return error;
}

export async function getMockBookingsForUser(driverId: string) {
  const cookieBookings = (await readCookieBookings()).filter((booking) => booking.driverId === driverId);

  try {
    const supabase = await createClient();
    const { data, error } = await runDemoBookingSelect((select) =>
      supabase.from("demo_bookings").select(select).eq("driver_id", driverId).order("start_time", { ascending: false }).returns<DemoBookingRow[]>()
    );

    if (error) {
      return cookieBookings;
    }

    const dbBookings = (data ?? [])
      .map((row) => {
        const spot = getDemoSpotById(row.demo_spot_id);
        if (!spot) {
          return null;
        }

        const driver: Profile = {
          id: driverId,
          fullName: "Driver",
          avatarUrl: null,
          email: null
        };

        return mapDemoBookingRow(row, spot, driver);
      })
      .filter(Boolean) as Booking[];

    const seen = new Set<string>();
    return [...dbBookings, ...cookieBookings].filter((booking) => {
      if (seen.has(booking.id)) {
        return false;
      }
      seen.add(booking.id);
      return true;
    });
  } catch {
    return cookieBookings;
  }
}

export async function getMockBookingById(bookingId: string) {
  const cookieBooking = (await readCookieBookings()).find((booking) => booking.id === bookingId) ?? null;

  try {
    const supabase = await createClient();
    const { data, error } = await runDemoBookingSelect((select) =>
      supabase.from("demo_bookings").select(select).eq("id", bookingId).maybeSingle<DemoBookingRow>()
    );

    if (error || !data) {
      return cookieBooking;
    }

    const spot = getDemoSpotById(data.demo_spot_id);
    if (!spot) {
      return cookieBooking;
    }

    const driver: Profile = {
      id: data.driver_id,
      fullName: "Driver",
      avatarUrl: null,
      email: null
    };

    return mapDemoBookingRow(data, spot, driver, cookieBooking?.guest);
  } catch {
    return cookieBooking;
  }
}

export async function getMockBookingsByIds(bookingIds: string[]): Promise<Map<string, Booking>> {
  const uniqueIds = [...new Set(bookingIds)];
  const byId = new Map<string, Booking>();

  if (uniqueIds.length === 0) {
    return byId;
  }

  const cookieBookings = await readCookieBookings();
  for (const booking of cookieBookings) {
    if (uniqueIds.includes(booking.id)) {
      byId.set(booking.id, booking);
    }
  }

  const missingIds = uniqueIds.filter((id) => !byId.has(id));
  if (missingIds.length === 0) {
    return byId;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await runDemoBookingSelect((select) =>
      supabase.from("demo_bookings").select(select).in("id", missingIds).returns<DemoBookingRow[]>()
    );

    if (error || !data) {
      return byId;
    }

    for (const row of data) {
      const spot = getDemoSpotById(row.demo_spot_id);
      if (!spot) {
        continue;
      }

      const driver: Profile = {
        id: row.driver_id,
        fullName: "Driver",
        avatarUrl: null,
        email: null
      };

      const cookieGuest = byId.get(row.id)?.guest;
      byId.set(row.id, mapDemoBookingRow(row, spot, driver, cookieGuest));
    }
  } catch {
    // cookie fallbacks already in map
  }

  return byId;
}

export async function saveMockBooking(booking: Booking) {
  const cookieBookings = await readCookieBookings();
  await writeCookieBookings([booking, ...cookieBookings].slice(0, 24));

  try {
    const payload = {
      id: booking.id,
      demo_spot_id: booking.spotId,
      driver_id: booking.driverId,
      start_time: booking.startTime,
      end_time: booking.endTime,
      total_price: booking.totalPrice,
      status: booking.status,
      ...guestContactToPayload(booking.guest)
    };

    const error = await insertDemoBookingPayload(payload);

    if (error && !isMissingDemoBookingsTable(error)) {
      console.error("[demo-bookings] saveMockBooking", error);
    }
    await saveReservationGuest(booking.id, booking.guest);
  } catch (error) {
    console.error("[demo-bookings] saveMockBooking", error);
  }
}

export async function deleteMockBooking(bookingId: string) {
  const cookieBookings = await readCookieBookings();
  const filtered = cookieBookings.filter((booking) => booking.id !== bookingId);

  if (filtered.length !== cookieBookings.length) {
    await writeCookieBookings(filtered);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("demo_bookings").delete().eq("id", bookingId);

    if (error && !isMissingDemoBookingsTable(error)) {
      console.error("[demo-bookings] deleteMockBooking", error);
    }
  } catch (error) {
    console.error("[demo-bookings] deleteMockBooking", error);
  }
}

export async function getActiveDemoSpotReservations(): Promise<SpotReservation[]> {
  const nowIso = new Date().toISOString();
  const reservations: SpotReservation[] = [];

  const cookieBookings = await readCookieBookings();

  for (const booking of cookieBookings) {
    if (booking.status !== "confirmed" || booking.endTime <= nowIso) {
      continue;
    }

    reservations.push({
      spotId: booking.spotId,
      driverId: booking.driverId,
      bookingId: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("demo_bookings")
      .select("id, demo_spot_id, driver_id, start_time, end_time")
      .eq("status", "confirmed")
      .gt("end_time", nowIso);

    if (!error && data) {
      for (const row of data) {
        reservations.push({
          spotId: row.demo_spot_id,
          driverId: row.driver_id,
          bookingId: row.id,
          startTime: row.start_time,
          endTime: row.end_time
        });
      }
    }
  } catch (error) {
    console.error("[demo-bookings] getActiveDemoSpotReservations", error);
  }

  return reservations;
}
