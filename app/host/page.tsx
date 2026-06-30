import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteListingAction, toggleListingPublishAction } from "@/lib/actions/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LISTING_RESERVED_DELETE_MESSAGE,
  LISTING_RESERVED_UNPUBLISH_MESSAGE
} from "@/lib/domain/spot-reservations";
import { getActiveReservationsForSpotIds, getCurrentUserProfile, getHostBookingsResult, getHostSpotsResult } from "@/lib/supabase/queries";
import { formatCurrency, formatDateRange, formatBookingDuration, summarizeAvailability } from "@/lib/utils";

export default async function HostDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, { user }] = await Promise.all([searchParams, getCurrentUserProfile()]);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent("/host")}`);
  }

  const spotsResult = await getHostSpotsResult(user.id);
  const [activeReservations, bookingsResult] = await Promise.all([
    getActiveReservationsForSpotIds(spotsResult.data.map((spot) => spot.id)),
    getHostBookingsResult(user.id, spotsResult.data)
  ]);
  const bookings = bookingsResult.data;
  const reservedSpotIds = new Set(activeReservations.map((reservation) => reservation.spotId));
  const spots = spotsResult.data;

  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const projectedRevenue = confirmedBookings.reduce((total, booking) => total + booking.totalPrice, 0);

  const bookingCountBySpot = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    accumulator[booking.spotId] = (accumulator[booking.spotId] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="grid gap-6">
      {error === "reserved-unpublish" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {LISTING_RESERVED_UNPUBLISH_MESSAGE}
        </div>
      ) : null}
      {error === "reserved-delete" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {LISTING_RESERVED_DELETE_MESSAGE}
        </div>
      ) : null}
      {error === "publish-failed" ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
          Unable to update listing visibility. Please try again.
        </div>
      ) : null}
      {error === "delete-failed" ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
          Unable to delete this listing. Please try again.
        </div>
      ) : null}
      {error === "reservation-delete-failed" ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
          Unable to delete this reservation. Please try again.
        </div>
      ) : null}
      <Card className="bg-[linear-gradient(135deg,rgba(13,148,136,0.1),rgba(255,255,255,0.95))]">
        <CardHeader>
          <CardTitle>Host overview</CardTitle>
          <CardDescription>Manage live listings, availability, and reservations from one dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Total listings", value: String(spots.length) },
            {
              label: "Projected revenue",
              value: formatCurrency(projectedRevenue),
              hint: "Stay duration × hourly rate for confirmed reservations"
            }
          ].map((metric) => (
            <div key={metric.label} className="rounded-3xl bg-white/80 p-4 shadow-soft">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{metric.value}</div>
              {"hint" in metric && metric.hint ? (
                <div className="mt-2 text-xs text-muted-foreground">{metric.hint}</div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your listings</CardTitle>
          <CardDescription>Only the listing owner can edit, unpublish, or delete these parking spots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
      {spotsResult.error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          Host listings could not be fully loaded from Supabase. Check the server logs for the failing query details.
        </div>
      ) : null}
      {bookingsResult.error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {bookingsResult.error}
        </div>
      ) : null}
          {spots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No listings yet. Publish your first spot to appear on the live map.
            </div>
          ) : (
            spots.map((spot) => {
              const isReserved = reservedSpotIds.has(spot.id);

              return (
              <div key={spot.id} className="rounded-3xl border border-border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-28 overflow-hidden rounded-2xl bg-surface/70">
                      <Image
                        src={spot.photos[0]?.url ?? "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80"}
                        alt={spot.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                    <div>
                      <div className="font-medium">{spot.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(spot.pricePerHour)}/hr | {summarizeAvailability(spot.availabilityWindows)}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{spot.locationNotes}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={spot.isPublished ? "success" : "outline"}>
                          {spot.isPublished ? "Published" : "Unpublished"}
                        </Badge>
                        {isReserved ? <Badge variant="outline">Reserved</Badge> : null}
                        <Badge variant="outline">{bookingCountBySpot[spot.id] ?? 0} reservations</Badge>
                      </div>
                      {isReserved ? (
                        <p className="mt-2 text-xs text-amber-800">
                          Unpublish and delete are locked until the current guest&apos;s reservation ends.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/host/listings/${spot.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    {isReserved ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                          title={LISTING_RESERVED_UNPUBLISH_MESSAGE}
                        >
                          Unpublish
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-400"
                          disabled
                          title={LISTING_RESERVED_DELETE_MESSAGE}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <form action={toggleListingPublishAction.bind(null, spot.id, !spot.isPublished)}>
                          <Button type="submit" variant="outline" size="sm">
                            {spot.isPublished ? "Unpublish" : "Publish"}
                          </Button>
                        </form>
                        <form action={deleteListingAction.bind(null, spot.id)}>
                          <Button type="submit" variant="ghost" size="sm" className="text-rose-600">
                            Delete
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spot reservations</CardTitle>
          <CardDescription>
            Reservations on your listings. Open View guest to see contact details or remove a guest from your property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No reservations yet.
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="rounded-3xl border border-border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">{booking.spot.title}</div>
                    <div className="text-sm text-muted-foreground">{booking.spot.locationNotes}</div>
                    <div className="text-sm text-muted-foreground">
                      Guest: <span className="text-foreground">{booking.guest.fullName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatDateRange(booking.startTime, booking.endTime)}</div>
                    <div className="text-sm text-muted-foreground">
                      Duration: <span className="text-foreground">{formatBookingDuration(booking.startTime, booking.endTime)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <Badge variant="outline">{booking.status}</Badge>
                    <div className="font-semibold">{formatCurrency(booking.totalPrice)}</div>
                    <Link href={`/host/reservations/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        View guest
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
