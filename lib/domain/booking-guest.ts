import type { GuestContact, Profile } from "@/types";

type GuestRow = {
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
  guest_vehicle_info?: string | null;
  guest_contact?: Partial<GuestContact> | Record<string, unknown> | null;
};

function parseGuestContactJson(value: unknown): Partial<GuestContact> | null {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  return {
    fullName: typeof record.fullName === "string" ? record.fullName : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
    address: typeof record.address === "string" ? record.address : undefined,
    vehicleInfo: typeof record.vehicleInfo === "string" ? record.vehicleInfo : undefined
  };
}

export function mapGuestFromRow(row: GuestRow, fallbackName = "Guest"): GuestContact {
  return {
    fullName: row.guest_name?.trim() || fallbackName,
    email: row.guest_email?.trim() || "",
    phone: row.guest_phone?.trim() || "",
    address: row.guest_address?.trim() || "",
    vehicleInfo: row.guest_vehicle_info?.trim() || ""
  };
}

export function resolveGuestContact(row: GuestRow, driver: Profile): GuestContact {
  const fromJson = parseGuestContactJson(row.guest_contact);
  const fromColumns = mapGuestFromRow(row, driver.fullName);

  return {
    fullName: fromJson?.fullName?.trim() || fromColumns.fullName || driver.fullName,
    email: fromJson?.email?.trim() || fromColumns.email || driver.email || "",
    phone: fromJson?.phone?.trim() || fromColumns.phone || driver.phone || "",
    address: fromJson?.address?.trim() || fromColumns.address || driver.address || "",
    vehicleInfo: fromJson?.vehicleInfo?.trim() || fromColumns.vehicleInfo || driver.vehicleInfo || ""
  };
}

export function guestContactToRow(guest: GuestContact) {
  return {
    guest_name: guest.fullName,
    guest_email: guest.email,
    guest_phone: guest.phone,
    guest_address: guest.address,
    guest_vehicle_info: guest.vehicleInfo
  };
}

export function guestContactToPayload(guest: GuestContact) {
  return {
    ...guestContactToRow(guest),
    guest_contact: guest
  };
}

export const BOOKING_GUEST_SELECT = `
  guest_name,
  guest_email,
  guest_phone,
  guest_address,
  guest_vehicle_info,
  guest_contact
`;

export const BOOKING_CORE_SELECT = `
  id,
  spot_id,
  driver_id,
  start_time,
  end_time,
  total_price,
  status,
  created_at,
  updated_at
`;

export const BOOKING_CONTACT_SELECT = `
  ${BOOKING_CORE_SELECT.trim()},
  guest_contact
`;

export const BOOKING_BASE_SELECT = `
  ${BOOKING_CORE_SELECT.trim()},
  ${BOOKING_GUEST_SELECT}
`;

export function isMissingGuestColumnsError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("guest_") && (message.includes("does not exist") || message.includes("could not find")))
  );
}

export function isMissingGuestContactError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("guest_contact") && (message.includes("does not exist") || message.includes("could not find")))
  );
}

export function isMissingGuestStorageError(error: { code?: string; message?: string } | null | undefined) {
  return isMissingGuestColumnsError(error) || isMissingGuestContactError(error);
}

export function stripGuestFields<T extends Record<string, unknown>>(payload: T) {
  const {
    guest_name: _guestName,
    guest_email: _guestEmail,
    guest_phone: _guestPhone,
    guest_address: _guestAddress,
    guest_vehicle_info: _guestVehicleInfo,
    guest_contact: _guestContact,
    ...rest
  } = payload;

  return rest;
}
