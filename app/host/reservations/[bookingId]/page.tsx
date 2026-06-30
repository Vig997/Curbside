import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CarFront, Mail, MapPin, Phone, UserRound } from "lucide-react";

import { DeleteReservationButton } from "@/components/booking/delete-reservation-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile, getHostBookingById } from "@/lib/supabase/queries";
import { formatCurrency, formatDateRange, formatBookingDuration, formatRevenueBreakdown } from "@/lib/helpers";

function displayGuestField(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not provided";
}

export default async function HostReservationDetailPage({
  params
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const [{ bookingId }, { user }] = await Promise.all([params, getCurrentUserProfile()]);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/host/reservations/${bookingId}`)}`);
  }

  const booking = await getHostBookingById(user.id, bookingId);

  if (!booking) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <Link href="/host" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to host dashboard
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{booking.spot.title}</CardTitle>
              <CardDescription className="mt-2">{booking.spot.locationNotes}</CardDescription>
            </div>
            <Badge variant="outline">{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Reservation window</div>
              <div className="mt-2 text-muted-foreground">{formatDateRange(booking.startTime, booking.endTime)}</div>
              <div className="mt-1 text-muted-foreground">
                Duration: {formatBookingDuration(booking.startTime, booking.endTime)}
              </div>
            </div>
            <div className="rounded-3xl bg-surface/80 p-4 text-sm">
              <div className="font-medium text-foreground">Projected revenue</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(booking.totalPrice)}</div>
              <div className="mt-1 text-muted-foreground">
                {formatRevenueBreakdown(booking.startTime, booking.endTime, booking.spot.pricePerHour, booking.totalPrice)}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border p-5">
            <div className="mb-4 font-medium text-foreground">Guest parking on your property</div>
            <div className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-muted-foreground">Full name</div>
                  <div className="font-medium text-foreground">{displayGuestField(booking.guest.fullName)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium text-foreground">{displayGuestField(booking.guest.email)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-medium text-foreground">{displayGuestField(booking.guest.phone)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-muted-foreground">Address</div>
                  <div className="font-medium text-foreground">{displayGuestField(booking.guest.address)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CarFront className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-muted-foreground">Vehicle</div>
                  <div className="font-medium text-foreground">{displayGuestField(booking.guest.vehicleInfo)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardContent className="border-t border-border pt-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Remove guest from your property</div>
            <p className="text-sm text-muted-foreground">
              Cancel this reservation if you need the spot back. The listing will become available on the map again.
            </p>
            <DeleteReservationButton bookingId={booking.id} redirectTo="/host" size="default" asHost />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
