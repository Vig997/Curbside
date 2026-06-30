"use client";

import { useTransition } from "react";

import { deleteBookingAction } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";

interface DeleteReservationButtonProps {
  bookingId: string;
  redirectTo?: string;
  size?: "sm" | "default";
  className?: string;
  asHost?: boolean;
}

export function DeleteReservationButton({
  bookingId,
  redirectTo,
  size = "sm",
  className,
  asHost = false
}: DeleteReservationButtonProps) {
  const [pending, startTransition] = useTransition();

  const label = asHost ? "Remove guest" : "Delete reservation";
  const pendingLabel = asHost ? "Removing..." : "Deleting...";
  const confirmMessage = asHost
    ? "Remove this guest from your property? Their reservation will be cancelled and the spot will become available on the map again."
    : "Delete this reservation? The spot will become available on the map again.";

  return (
    <Button
      type="button"
      variant={asHost ? "outline" : "ghost"}
      size={size}
      className={className ?? (asHost ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700" : "text-rose-600 hover:text-rose-700")}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) {
          return;
        }

        startTransition(async () => {
          await deleteBookingAction(bookingId, redirectTo, asHost);
        });
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
