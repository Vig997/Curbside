"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function ReserveError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/reserve/error" });
  }, [error]);

  return (
    <RouteErrorCard
      title="Reservation error"
      description="This spot could not be loaded. Try again or browse the map."
      backHref="/explore"
      backLabel="Back to map"
      reset={reset}
    />
  );
}
