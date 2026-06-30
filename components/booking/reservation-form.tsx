"use client";

import { useActionState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createBookingAction } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateBookingHours,
  calculateBookingTotal,
  formatCurrency,
  formatRevenueBreakdown,
  toLocalDateTimeInputValue
} from "@/lib/utils";

const reservationSchema = z
  .object({
    startTime: z.string().min(1, "Choose a start time."),
    endTime: z.string().min(1, "Choose an end time."),
    guestName: z.string().trim().min(2, "Enter your full name."),
    guestEmail: z.string().trim().email("Enter a valid email address."),
    guestPhone: z.string().trim().min(7, "Enter a valid phone number."),
    guestAddress: z.string().trim().min(6, "Enter your home or billing address."),
    guestVehicleInfo: z.string().trim().min(2, "Describe the vehicle you are parking.")
  })
  .refine((values) => new Date(values.endTime).getTime() > new Date(values.startTime).getTime(), {
    path: ["endTime"],
    message: "End time must be after start time."
  });

type ReservationValues = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  spotId: string;
  pricePerHour: number;
  isReservedByOther?: boolean;
  defaultGuest?: {
    guestName?: string;
    guestEmail?: string;
  };
}

function buildDefaultReservationTimes() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return {
    startTime: toLocalDateTimeInputValue(start),
    endTime: toLocalDateTimeInputValue(end)
  };
}

export function ReservationForm({
  spotId,
  pricePerHour,
  isReservedByOther = false,
  defaultGuest
}: ReservationFormProps) {
  const defaults = useMemo(
    () => ({
      ...buildDefaultReservationTimes(),
      guestName: defaultGuest?.guestName ?? "",
      guestEmail: defaultGuest?.guestEmail ?? "",
      guestPhone: "",
      guestAddress: "",
      guestVehicleInfo: ""
    }),
    [defaultGuest?.guestEmail, defaultGuest?.guestName]
  );
  const [state, formAction, pending] = useActionState(createBookingAction, {
    error: ""
  });
  const form = useForm<ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: defaults
  });

  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  const estimate = useMemo(() => {
    if (!startTime || !endTime) {
      return 0;
    }

    const hours = calculateBookingHours(startTime, endTime);
    if (hours <= 0) {
      return 0;
    }

    return calculateBookingTotal(hours, pricePerHour);
  }, [endTime, pricePerHour, startTime]);

  const revenueBreakdown = useMemo(() => {
    if (!startTime || !endTime || estimate <= 0) {
      return null;
    }

    return formatRevenueBreakdown(startTime, endTime, pricePerHour, estimate);
  }, [endTime, estimate, pricePerHour, startTime]);

  const submitAction = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.set("spotId", spotId);
    formData.set("startTime", values.startTime);
    formData.set("endTime", values.endTime);
    formData.set("guestName", values.guestName);
    formData.set("guestEmail", values.guestEmail);
    formData.set("guestPhone", values.guestPhone);
    formData.set("guestAddress", values.guestAddress);
    formData.set("guestVehicleInfo", values.guestVehicleInfo);
    formAction(formData);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm reservation</CardTitle>
        <CardDescription>Share your contact details and stay window so the host knows who is parking.</CardDescription>
      </CardHeader>
      <CardContent>
        {isReservedByOther ? (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            This spot is currently reserved by another driver.
          </p>
        ) : null}

        <form className="space-y-6" onSubmit={submitAction}>
          <div className="space-y-4">
            <div className="font-medium text-sm text-foreground">Your information</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="guestName">Full name</Label>
                <Input id="guestName" autoComplete="name" {...form.register("guestName")} />
                <p className="text-xs text-rose-600">{form.formState.errors.guestName?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guestEmail">Email</Label>
                <Input id="guestEmail" type="email" autoComplete="email" {...form.register("guestEmail")} />
                <p className="text-xs text-rose-600">{form.formState.errors.guestEmail?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guestPhone">Phone number</Label>
                <Input id="guestPhone" type="tel" autoComplete="tel" {...form.register("guestPhone")} />
                <p className="text-xs text-rose-600">{form.formState.errors.guestPhone?.message}</p>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="guestAddress">Home or billing address</Label>
                <Input id="guestAddress" autoComplete="street-address" {...form.register("guestAddress")} />
                <p className="text-xs text-rose-600">{form.formState.errors.guestAddress?.message}</p>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="guestVehicleInfo">Vehicle details</Label>
                <Textarea
                  id="guestVehicleInfo"
                  rows={2}
                  placeholder="e.g. Silver Toyota Camry, license plate 7ABC123"
                  {...form.register("guestVehicleInfo")}
                />
                <p className="text-xs text-rose-600">{form.formState.errors.guestVehicleInfo?.message}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="font-medium text-sm text-foreground">Stay details</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" type="datetime-local" {...form.register("startTime")} />
                <p className="text-xs text-rose-600">{form.formState.errors.startTime?.message}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End time</Label>
                <Input id="endTime" type="datetime-local" {...form.register("endTime")} />
                <p className="text-xs text-rose-600">{form.formState.errors.endTime?.message}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-surface/80 p-4 text-sm">
            <div className="font-medium text-foreground">Estimated total</div>
            <div className="mt-1 text-lg font-semibold">{formatCurrency(estimate)}</div>
            {revenueBreakdown ? <div className="mt-2 text-muted-foreground">{revenueBreakdown}</div> : null}
          </div>

          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

          <Button type="submit" className="w-full" disabled={pending || isReservedByOther}>
            {pending ? "Confirming reservation..." : "Confirm reservation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
