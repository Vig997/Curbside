"use server";

import { getActiveSpotReservations, getParkingSpotById } from "@/lib/supabase/queries";

export async function fetchParkingSpotDetail(spotId: string) {
  return getParkingSpotById(spotId);
}

export async function fetchActiveSpotReservations() {
  return getActiveSpotReservations();
}
