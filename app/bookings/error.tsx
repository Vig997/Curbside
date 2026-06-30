"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function BookingsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/bookings/error" });
  }, [error]);

  return (
    <RouteErrorCard
      title="Reservations error"
      description="Your reservations could not load. Try again or return to the list."
      backHref="/bookings"
      backLabel="Back to reservations"
      reset={reset}
    />
  );
}
