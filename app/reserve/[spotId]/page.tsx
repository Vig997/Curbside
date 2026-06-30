import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, MapPinned, ShieldCheck } from "lucide-react";

import { ReservationForm } from "@/components/booking/reservation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentReservationForSpot } from "@/lib/domain/reservation-overlap";
import { areDemoSpotsEnabled } from "@/lib/feature-flags";
import { getCurrentReservationsForSpotIds, getCurrentUserProfile, getParkingSpotById } from "@/lib/supabase/queries";
import { formatCurrency, formatSpotType, summarizeAvailability } from "@/lib/utils";

export default async function ReserveSpotPage({
  params
}: {
  params: Promise<{ spotId: string }>;
}) {
  const { spotId } = await params;

  if (spotId.startsWith("demo-") && !areDemoSpotsEnabled()) {
    notFound();
  }

  const [spot, { user, profile }, spotReservations] = await Promise.all([
    getParkingSpotById(spotId),
    getCurrentUserProfile(),
    getCurrentReservationsForSpotIds([spotId])
  ]);

  if (!spot || !spot.isPublished) {
    notFound();
  }

  const activeReservation = getCurrentReservationForSpot(spotReservations, spotId);
  const isReservedByOther = Boolean(activeReservation && user && activeReservation.driverId !== user.id);
  const isReservedByCurrentUser = Boolean(activeReservation && user && activeReservation.driverId === user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="relative h-72">
            <Image
              src={spot.photos[0]?.url ?? "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"}
              alt={spot.title}
              fill
              className="object-cover"
            />
          </div>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-semibold">{spot.title}</h1>
                <p className="mt-2 text-muted-foreground">{spot.locationNotes}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(spot.pricePerHour)}</div>
                <div className="text-xs text-muted-foreground">per hour</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>{formatSpotType(spot.spotType)}</Badge>
              <Badge variant={spot.covered ? "success" : "outline"}>{spot.covered ? "Covered" : "Open air"}</Badge>
              {spot.hasEvCharger ? <Badge variant="outline">EV charging</Badge> : null}
              {activeReservation ? <Badge variant="outline">Reserved</Badge> : null}
            </div>

            <p className="text-sm text-muted-foreground">{spot.description}</p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-surface/80 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Availability
                </div>
                {summarizeAvailability(spot.availabilityWindows)}
              </div>
              <div className="rounded-3xl bg-surface/80 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <MapPinned className="h-4 w-4 text-primary" />
                  Vehicle size
                </div>
                {spot.vehicleSizeRestrictions}
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-border p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Access instructions after booking
              </div>
              Confirm the reservation to unlock gate codes, arrival directions, and access details.
            </div>
          </CardContent>
        </Card>

        {isReservedByCurrentUser && activeReservation ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">You already have the active reservation for this spot.</p>
              <Link href={`/bookings/${activeReservation.bookingId}`}>
                <Button className="w-full">View your reservation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ReservationForm
            spotId={spot.id}
            pricePerHour={spot.pricePerHour}
            isReservedByOther={isReservedByOther}
            defaultGuest={{
              guestName: profile?.fullName ?? "",
              guestEmail: profile?.email ?? user?.email ?? ""
            }}
          />
        )}
      </div>
    </main>
  );
}
