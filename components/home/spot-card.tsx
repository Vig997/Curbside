import Image from "next/image";
import Link from "next/link";
import { Bolt, CarFront, Shield, Star } from "lucide-react";

import { ProtectedLink } from "@/components/auth/protected-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SpotReservation } from "@/lib/data/demo-bookings";
import { isDemoSpot, isUserOwnedListing } from "@/lib/domain/spot-ownership";
import { formatCurrency, formatSpotType, summarizeAvailability } from "@/lib/utils";
import { ParkingSpot } from "@/types";

interface SpotCardProps {
  spot: ParkingSpot;
  compact?: boolean;
  onClose?: () => void;
  reservation?: SpotReservation | null;
  currentUserId?: string | null;
}

export function SpotCard({
  spot,
  compact = false,
  onClose,
  reservation = null,
  currentUserId = null
}: SpotCardProps) {
  const primaryPhoto =
    spot.photos[0]?.url ??
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80";
  const showAsDemo = isDemoSpot(spot.id);
  const showAsOwnerListing = isUserOwnedListing(spot, currentUserId);
  const isReserved = Boolean(reservation);
  const isReservedByCurrentUser = Boolean(reservation && currentUserId && reservation.driverId === currentUserId);
  const labelClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <div className={`grid ${compact ? "grid-cols-[88px_1fr]" : "grid-cols-1"}`}>
        <div className={`relative ${compact ? "min-h-full" : "h-56"}`}>
          <Image src={primaryPhoto} alt={spot.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
          {showAsOwnerListing ? (
            <Badge className="absolute left-3 top-3 z-10 border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
              Your listing
            </Badge>
          ) : showAsDemo ? (
            <Badge
              variant="outline"
              className="absolute left-3 top-3 z-10 border-white/70 bg-white/92 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-teal-800 shadow-sm"
            >
              Demo
            </Badge>
          ) : isReserved ? (
            <Badge className="absolute left-3 top-3 z-10 border-rose-200 bg-rose-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-900 shadow-sm">
              Reserved
            </Badge>
          ) : null}
        </div>
        <CardContent className={compact ? "space-y-2 p-3" : "space-y-4"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-foreground ${compact ? "text-sm font-semibold leading-tight" : "font-medium"}`}>{spot.title}</p>
                {showAsDemo && compact ? (
                  <Badge variant="outline" className="px-1.5 py-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-teal-800">
                    Demo
                  </Badge>
                ) : null}
              </div>
              <p className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>{spot.locationNotes}</p>
              {!compact ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={labelClass}>Hosted By</span>{" "}
                  <span className="normal-case tracking-normal">{spot.owner.fullName}</span>
                </p>
              ) : null}
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className={`font-semibold ${compact ? "text-sm" : ""}`}>{formatCurrency(spot.pricePerHour)}</p>
                <p className={labelClass}>Per Hour</p>
              </div>
              {onClose ? (
                <button
                  type="button"
                  aria-label="Close selected spot"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                >
                  <span className="text-lg leading-none">X</span>
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="text-[10px] font-semibold uppercase tracking-[0.1em]">{formatSpotType(spot.spotType)}</Badge>
            <Badge variant={spot.covered ? "success" : "outline"} className="text-[10px] font-semibold uppercase tracking-[0.1em]">
              {spot.covered ? "Covered" : "Open Air"}
            </Badge>
            {spot.hasEvCharger ? (
              <Badge variant="outline" className="gap-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
                <Bolt className="h-3.5 w-3.5" />
                EV Charging
              </Badge>
            ) : null}
          </div>
          <div className={`grid text-muted-foreground ${compact ? "gap-1 text-xs" : "gap-2 text-sm"}`}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0" />
              <span>
                <span className={labelClass}>Availability</span>{" "}
                <span className="normal-case tracking-normal">{summarizeAvailability(spot.availabilityWindows)}</span>
              </span>
            </div>
            {!compact ? (
              <div className="flex items-center gap-2">
                <CarFront className="h-4 w-4 shrink-0" />
                <span>
                  <span className={labelClass}>Vehicle Size</span>{" "}
                  <span className="normal-case tracking-normal">{spot.vehicleSizeRestrictions}</span>
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              <span>
                <span className={labelClass}>Host Rating</span>{" "}
                <span className="normal-case tracking-normal">
                  {spot.hostRating > 0 ? spot.hostRating.toFixed(1) : "New host"}
                </span>
              </span>
            </div>
          </div>
          {!compact ? <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{spot.description}</p> : null}
          {!compact ? (
            isReservedByCurrentUser ? (
              <Link href={`/bookings/${reservation?.bookingId}`} className="block">
                <Button className="w-full text-xs font-semibold uppercase tracking-[0.12em]">View reservation</Button>
              </Link>
            ) : isReserved ? (
              <Button className="w-full text-xs font-semibold uppercase tracking-[0.12em]" disabled>
                Reserved
              </Button>
            ) : (
              <ProtectedLink href={`/reserve/${spot.id}`} className="block">
                <Button className="w-full text-xs font-semibold uppercase tracking-[0.12em]">Reserve</Button>
              </ProtectedLink>
            )
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
