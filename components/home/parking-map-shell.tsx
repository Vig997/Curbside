"use client";

import dynamic from "next/dynamic";

import { Card, CardContent } from "@/components/ui/card";
import type { MapSpotSummary } from "@/lib/types";
import type { SpotReservation } from "@/lib/data/demo-bookings";

const ParkingMap = dynamic(() => import("@/components/home/parking-map"), {
  ssr: false,
  loading: () => (
    <Card className="animate-fade-in">
      <CardContent className="flex min-h-[560px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-primary/20" />
        <p className="animate-pulse">Loading map...</p>
      </CardContent>
    </Card>
  )
});

interface ParkingMapShellProps {
  spots: MapSpotSummary[];
  currentUserId?: string | null;
  highlightSpotId?: string;
  reservations?: SpotReservation[];
}

export function ParkingMapShell({ spots, currentUserId, highlightSpotId, reservations = [] }: ParkingMapShellProps) {
  return (
    <ParkingMap
      spots={Array.isArray(spots) ? spots : []}
      currentUserId={currentUserId}
      highlightSpotId={highlightSpotId}
      reservations={reservations}
    />
  );
}
