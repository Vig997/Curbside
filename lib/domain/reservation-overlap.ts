import type { SpotReservation } from "@/lib/data/demo-bookings";

export function reservationsOverlap(
  leftStart: string | Date,
  leftEnd: string | Date,
  rightStart: string | Date,
  rightEnd: string | Date
) {
  const startA = new Date(leftStart).getTime();
  const endA = new Date(leftEnd).getTime();
  const startB = new Date(rightStart).getTime();
  const endB = new Date(rightEnd).getTime();

  return startA < endB && endA > startB;
}

export function isReservationActiveNow(reservation: SpotReservation, now = Date.now()) {
  const start = new Date(reservation.startTime).getTime();
  const end = new Date(reservation.endTime).getTime();

  return start <= now && end > now;
}

export function getCurrentReservationForSpot(reservations: SpotReservation[], spotId: string) {
  return reservations.find((reservation) => reservation.spotId === spotId && isReservationActiveNow(reservation)) ?? null;
}

export function getOverlappingReservationForSpot(
  reservations: SpotReservation[],
  spotId: string,
  startTime: string | Date,
  endTime: string | Date
) {
  return (
    reservations.find(
      (reservation) =>
        reservation.spotId === spotId &&
        reservationsOverlap(reservation.startTime, reservation.endTime, startTime, endTime)
    ) ?? null
  );
}

export function filterCurrentReservations(reservations: SpotReservation[]) {
  const bySpot = new Map<string, SpotReservation>();

  for (const reservation of reservations) {
    if (!isReservationActiveNow(reservation)) {
      continue;
    }

    const existing = bySpot.get(reservation.spotId);
    if (!existing || reservation.endTime > existing.endTime) {
      bySpot.set(reservation.spotId, reservation);
    }
  }

  return [...bySpot.values()];
}
