"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function HostListingError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/host/listings/error" });
  }, [error]);

  return (
    <RouteErrorCard
      title="Listing error"
      description="This listing form could not load. Try again or return to the host dashboard."
      backHref="/host"
      backLabel="Back to host"
      reset={reset}
    />
  );
}
