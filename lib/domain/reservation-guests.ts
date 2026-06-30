import { createClient } from "@/lib/supabase/server";
import type { GuestContact } from "@/lib/types";

type ReservationGuestRow = {
  booking_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  vehicle_info: string;
};

function rowToGuest(row: ReservationGuestRow): GuestContact {
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    vehicleInfo: row.vehicle_info
  };
}

export function mergeGuestContacts(...sources: Array<GuestContact | null | undefined>): GuestContact {
  const merged: GuestContact = {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    vehicleInfo: ""
  };

  for (const source of sources) {
    if (!source) {
      continue;
    }

    if (source.fullName.trim()) {
      merged.fullName = source.fullName.trim();
    }

    if (source.email.trim()) {
      merged.email = source.email.trim();
    }

    if (source.phone.trim()) {
      merged.phone = source.phone.trim();
    }

    if (source.address.trim()) {
      merged.address = source.address.trim();
    }

    if (source.vehicleInfo.trim()) {
      merged.vehicleInfo = source.vehicleInfo.trim();
    }
  }

  return merged;
}

export async function saveReservationGuest(bookingId: string, guest: GuestContact) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("reservation_guests").upsert({
      booking_id: bookingId,
      full_name: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      address: guest.address,
      vehicle_info: guest.vehicleInfo
    });

    if (error && error.code !== "42P01") {
      console.error("[reservation-guests] saveReservationGuest", error);
    }
  } catch (error) {
    console.error("[reservation-guests] saveReservationGuest", error);
  }
}

export async function deleteReservationGuest(bookingId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("reservation_guests").delete().eq("booking_id", bookingId);

    if (error && error.code !== "42P01") {
      console.error("[reservation-guests] deleteReservationGuest", error);
    }
  } catch (error) {
    console.error("[reservation-guests] deleteReservationGuest", error);
  }
}

export async function getReservationGuest(bookingId: string): Promise<GuestContact | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservation_guests")
      .select("booking_id, full_name, email, phone, address, vehicle_info")
      .eq("booking_id", bookingId)
      .maybeSingle<ReservationGuestRow>();

    if (error || !data) {
      return null;
    }

    return rowToGuest(data);
  } catch {
    return null;
  }
}

export async function getReservationGuestsByBookingIds(bookingIds: string[]): Promise<Map<string, GuestContact>> {
  if (bookingIds.length === 0) {
    return new Map();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservation_guests")
      .select("booking_id, full_name, email, phone, address, vehicle_info")
      .in("booking_id", bookingIds)
      .returns<ReservationGuestRow[]>();

    if (error || !data) {
      return new Map();
    }

    return new Map(data.map((row) => [row.booking_id, rowToGuest(row)]));
  } catch {
    return new Map();
  }
}
