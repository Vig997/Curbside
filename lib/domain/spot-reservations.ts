import { getCurrentReservationsForSpotIds } from "@/lib/supabase/queries";
import { getCurrentReservationForSpot } from "@/lib/domain/reservation-overlap";

export const LISTING_RESERVED_UNPUBLISH_MESSAGE =
  "This listing can't be unpublished while a guest has an active reservation. Wait until their stay ends.";

export const LISTING_RESERVED_DELETE_MESSAGE =
  "This listing can't be deleted while a guest has an active reservation. Wait until their stay ends.";

export async function getActiveReservationForListing(spotId: string) {
  const reservations = await getCurrentReservationsForSpotIds([spotId]);
  return getCurrentReservationForSpot(reservations, spotId);
}

export async function isListingCurrentlyReserved(spotId: string) {
  return Boolean(await getActiveReservationForListing(spotId));
}
