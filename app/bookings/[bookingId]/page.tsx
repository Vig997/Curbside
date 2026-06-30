import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { DeleteReservationButton } from "@/components/booking/delete-reservation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingById, getCurrentUserProfile } from "@/lib/supabase/queries";
import { buildNavigationHref, formatCurrency, formatDateRange, formatRevenueBreakdown } from "@/lib/utils";

export default async function BookingDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [{ bookingId }, { created, error }, { user }] = await Promise.all([params, searchParams, getCurrentUserProfile()]);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
  }

  const booking = await getBookingById(bookingId);

  if (!booking || (booking.driverId !== user.id && booking.spot.ownerId !== user.id)) {
    notFound();
  }

  const isDriver = booking.driverId === user.id;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-6">
      {created === "1" ? (
        <div className="mb-4 rounded-[1.5rem] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-900 shadow-soft">
          Reservation confirmed. Your access instructions and trip details are ready below.
        </div>
      ) : null}
      {error === "delete-failed" ? (
        <div className="mb-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-soft">
          Unable to delete this reservation. Please try again.
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="relative h-72">
          <Image
            src={booking.spot.photos[0]?.url ?? "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"}
            alt={booking.spot.title}
            fill
            className="object-cover"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{booking.spot.title}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{booking.spot.locationNotes}</p>
            </div>
            <Badge variant="success">{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Reservation time</div>
              <div className="mt-2 text-muted-foreground">{formatDateRange(booking.startTime, booking.endTime)}</div>
            </div>
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Total price</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(booking.totalPrice)}</div>
              <div className="mt-1 text-muted-foreground">
                {formatRevenueBreakdown(booking.startTime, booking.endTime, booking.spot.pricePerHour, booking.totalPrice)}
              </div>
            </div>
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Your contact details</div>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <div>{booking.guest.fullName}</div>
                <div>{booking.guest.email}</div>
                <div>{booking.guest.phone}</div>
                <div>{booking.guest.vehicleInfo}</div>
              </div>
            </div>
            <div className="rounded-3xl border border-dashed border-border p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Access instructions
              </div>
              {booking.spot.accessInstructions}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Host contact</div>
              <div className="mt-2 text-muted-foreground">
                {booking.spot.owner.fullName}
                {booking.spot.owner.email ? ` • ${booking.spot.owner.email}` : " • Host contact is in your confirmation email"}
              </div>
            </div>
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">General location</div>
              <div className="mt-2 text-muted-foreground">{booking.spot.locationNotes}</div>
            </div>
            <Link href={buildNavigationHref(booking.spot.latitude, booking.spot.longitude)} target="_blank">
              <Button className="w-full">
                Open navigation
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            {isDriver ? (
              <DeleteReservationButton bookingId={booking.id} redirectTo="/bookings" className="w-full" size="default" />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
