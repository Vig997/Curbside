import { getPublishedMapSpotsResult, getCurrentSpotReservations, getSessionUser } from "@/lib/supabase/queries";

import { ParkingMapShell } from "@/components/home/parking-map-shell";

export async function ExploreMapSection({ highlightSpotId }: { highlightSpotId?: string }) {
  const [{ data: spots, error }, user, reservations] = await Promise.all([
    getPublishedMapSpotsResult(),
    getSessionUser(),
    getCurrentSpotReservations()
  ]);

  return (
    <>
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          Live listings could not be loaded. Showing demo spots only — try refreshing in a moment.
        </div>
      ) : null}
      <ParkingMapShell
        spots={Array.isArray(spots) ? spots : []}
        currentUserId={user?.id ?? null}
        highlightSpotId={highlightSpotId}
        reservations={reservations}
      />
    </>
  );
}
