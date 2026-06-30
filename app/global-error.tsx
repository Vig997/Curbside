"use client";

import { useEffect } from "react";

import "@/app/globals.css";

import { captureError } from "@/lib/monitoring";
import { RouteErrorCard } from "@/components/ui/route-error-card";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app/global-error" });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <RouteErrorCard
          title="Curbside hit a critical error"
          description="The app shell failed to load. Refresh or return home."
          backHref="/"
          backLabel="Back home"
          reset={reset}
        />
      </body>
    </html>
  );
}
