import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { DeleteReservationButton } from "@/components/booking/delete-reservation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile, getUserBookingsResult } from "@/lib/supabase/queries";
import { formatCurrency, formatDateRange } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reservations",
  description: "View your upcoming and past parking reservations.",
  robots: { index: false, follow: false }
};

export default async function BookingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, { user }] = await Promise.all([searchParams, getCurrentUserProfile()]);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent("/bookings")}`);
  }

  const bookingsResult = await getUserBookingsResult(user.id);
  const bookings = bookingsResult.data;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-6">
      <Card className="mb-6 bg-[linear-gradient(135deg,rgba(13,148,136,0.1),rgba(255,255,255,0.95))]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your reservations</h1>
            <p className="text-sm text-muted-foreground">Confirmed parking stays, access details, and timing in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{bookings.length} reservations</Badge>
            <Link href="/explore">
              <Button variant="outline" size="sm">
                Find parking on map
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {bookingsResult.error ? (
        <Card className="mb-4 border-amber-200 bg-amber-50/80">
          <CardContent className="py-4 text-sm text-amber-900">
            Reservations could not be fully loaded from Supabase. Check the server logs for details.
          </CardContent>
        </Card>
      ) : null}

      {error === "delete-failed" ? (
        <Card className="mb-4 border-rose-200 bg-rose-50/80">
          <CardContent className="py-4 text-sm text-rose-900">
            Unable to delete this reservation. Please try again.
          </CardContent>
        </Card>
      ) : null}

      {bookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reservations yet</CardTitle>
            <CardDescription>Browse the live map and reserve a demo or host-listed parking spot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/explore">
              <Button>
                Explore parking map
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="interactive-lift transition-transform duration-300 ease-smooth">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr_auto] md:items-center md:p-6">
                <Link href={`/bookings/${booking.id}`} className="relative block h-36 overflow-hidden rounded-[1.5rem]">
                  <Image
                    src={booking.spot.photos[0]?.url ?? "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"}
                    alt={booking.spot.title}
                    fill
                    className="object-cover"
                  />
                </Link>
                <Link href={`/bookings/${booking.id}`}>
                  <div>
                    <div className="font-medium">{booking.spot.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{formatDateRange(booking.startTime, booking.endTime)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{booking.spot.locationNotes}</div>
                    <div className="mt-3 rounded-2xl bg-surface/80 p-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">Access instructions</div>
                      <div className="mt-1 line-clamp-3 leading-relaxed">{booking.spot.accessInstructions}</div>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <Badge variant="outline">{booking.status}</Badge>
                  <div className="font-semibold">{formatCurrency(booking.totalPrice)}</div>
                  <DeleteReservationButton bookingId={booking.id} redirectTo="/bookings" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
