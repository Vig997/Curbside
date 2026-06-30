"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/error" });
  }, [error]);

  return (
    <RouteErrorCard
      description="This route hit a server error. Try again or return to the map."
      backHref="/explore"
      backLabel="Back to map"
      reset={reset}
    />
  );
}
