"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function BookingDetailError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/bookings/[bookingId]/error" });
  }, [error]);

  return (
    <RouteErrorCard
      title="Reservation error"
      description="This reservation could not be loaded. Try again or return to your list."
      backHref="/bookings"
      backLabel="Back to reservations"
      reset={reset}
    />
  );
}
