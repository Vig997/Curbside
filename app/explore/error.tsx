"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function ExploreError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/explore/error" });
  }, [error]);

  return (
    <RouteErrorCard
      title="Map error"
      description="The explore map failed to load. Try again or return home."
      backHref="/explore"
      backLabel="Back to map"
      reset={reset}
    />
  );
}
