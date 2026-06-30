import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNowStrict, isAfter, isBefore, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

import { AvailabilityWindow, SpotType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toLocalDateTimeInputValue(value: Date) {
  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatSpotType(spotType: SpotType) {
  switch (spotType) {
    case "driveway":
      return "Driveway";
    case "garage":
      return "Garage";
    case "apartment_spot":
      return "Apartment spot";
    case "covered_lot":
      return "Covered lot";
    case "uncovered_lot":
      return "Uncovered lot";
    default:
      return spotType;
  }
}

export function formatDateTime(value: string) {
  return format(parseISO(value), "EEE, MMM d • h:mm a");
}

export function formatDateRange(start: string, end: string) {
  return `${formatDateTime(start)} - ${format(parseISO(end), "h:mm a")}`;
}

export function formatBookingDuration(start: string, end: string) {
  const hours = calculateBookingHours(start, end);
  const roundedHours = Math.max(1, Math.round(hours));

  return roundedHours === 1 ? "1 hour" : `${roundedHours} hours`;
}

export function calculateBookingHours(start: string | Date, end: string | Date) {
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;

  return Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
}

export function calculateBookingTotal(hours: number, pricePerHour: number) {
  return Number((hours * pricePerHour).toFixed(2));
}

export function formatRevenueBreakdown(start: string, end: string, pricePerHour: number, totalPrice?: number) {
  const hours = calculateBookingHours(start, end);
  const total = totalPrice ?? calculateBookingTotal(hours, pricePerHour);
  const hoursLabel = hours < 1 ? `${Math.round(hours * 60)} min` : hours === 1 ? "1 hour" : `${Number(hours.toFixed(1))} hours`;

  return `${hoursLabel} × ${formatCurrency(pricePerHour)}/hr = ${formatCurrency(total)}`;
}

export function calculateDistanceMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLatitude = toRadians(latitudeB - latitudeA);
  const dLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function buildNavigationHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function isSpotAvailableNow(windows: AvailabilityWindow[]) {
  const now = new Date();
  return windows.some((window) => {
    const startAt = parseISO(window.startAt);
    const endAt = parseISO(window.endAt);

    if (!window.repeatDaily) {
      return isAfter(now, startAt) && isBefore(now, endAt);
    }

    const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
    const endMinutes = endAt.getHours() * 60 + endAt.getMinutes();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (window.overnightAllowed || endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
}

export function isBookingInsideWindow(
  window: AvailabilityWindow,
  startTime: Date,
  endTime: Date
) {
  const windowStart = parseISO(window.startAt);
  const windowEnd = parseISO(window.endAt);

  if (!window.repeatDaily) {
    return startTime >= windowStart && endTime <= windowEnd;
  }

  const toMinutes = (value: Date) => value.getHours() * 60 + value.getMinutes();
  const bookingStartMinutes = toMinutes(startTime);
  const bookingEndMinutes = toMinutes(endTime);
  const startMinutes = toMinutes(windowStart);
  const endMinutes = toMinutes(windowEnd);

  if (window.overnightAllowed || endMinutes <= startMinutes) {
    const bookingCrossesMidnight =
      startTime.toDateString() !== endTime.toDateString() || bookingEndMinutes < bookingStartMinutes;

    if (bookingCrossesMidnight) {
      return bookingStartMinutes >= startMinutes || bookingEndMinutes <= endMinutes;
    }

    return bookingStartMinutes >= startMinutes || bookingEndMinutes <= endMinutes;
  }

  return bookingStartMinutes >= startMinutes && bookingEndMinutes <= endMinutes;
}

export function summarizeAvailability(windows: AvailabilityWindow[]) {
  if (windows.length === 0) {
    return "No availability set";
  }

  const [firstWindow] = [...windows].sort((left, right) => left.startAt.localeCompare(right.startAt));

  if (firstWindow.repeatDaily) {
    return `Daily • ${format(parseISO(firstWindow.startAt), "h:mm a")} - ${format(parseISO(firstWindow.endAt), "h:mm a")}`;
  }

  return formatDateRange(firstWindow.startAt, firstWindow.endAt);
}

export function relativeCreatedAt(value: string) {
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}
