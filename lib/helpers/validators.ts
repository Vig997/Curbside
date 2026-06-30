import { z } from "zod";

import { LISTING_ACCESS_INSTRUCTIONS_MAX, LISTING_DESCRIPTION_MAX } from "@/lib/config/constants";

export const uploadedPhotoSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1)
});

export const listingSchema = z.object({
  title: z.string().min(6, "Add a clear listing title."),
  description: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters describing your spot.")
    .max(LISTING_DESCRIPTION_MAX, `Keep the description under ${LISTING_DESCRIPTION_MAX} characters.`),
  locationNotes: z.string().min(6, "Add a general location or address note."),
  spotType: z.enum(["driveway", "garage", "apartment_spot", "covered_lot", "uncovered_lot"]),
  pricePerHour: z.coerce.number().min(1).max(150),
  covered: z.boolean(),
  hasEvCharger: z.boolean(),
  vehicleSizeRestrictions: z.string().min(2, "Add a vehicle size note."),
  accessInstructions: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters explaining how drivers access the spot.")
    .max(
      LISTING_ACCESS_INSTRUCTIONS_MAX,
      `Keep access instructions under ${LISTING_ACCESS_INSTRUCTIONS_MAX} characters.`
    ),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  availabilityStart: z.string().min(1, "Choose when this spot becomes available."),
  availabilityEnd: z.string().min(1, "Choose when this availability window ends."),
  repeatDaily: z.boolean(),
  overnightAllowed: z.boolean(),
  photos: z.array(uploadedPhotoSchema).min(1, "Upload at least one photo.")
}).refine((values) => new Date(values.availabilityEnd).getTime() > new Date(values.availabilityStart).getTime(), {
  message: "Availability end must be after the start time.",
  path: ["availabilityEnd"]
});

export const bookingSchema = z
  .object({
    spotId: z
      .string()
      .min(1, "Missing parking spot id.")
      .refine((value) => value.startsWith("demo-") || z.string().uuid().safeParse(value).success, {
        message: "Missing parking spot id."
      }),
    startTime: z.string().min(1, "Choose a start time."),
    endTime: z.string().min(1, "Choose an end time."),
    guestName: z.string().trim().min(2, "Enter your full name."),
    guestEmail: z.string().trim().email("Enter a valid email address."),
    guestPhone: z.string().trim().min(7, "Enter a valid phone number."),
    guestAddress: z.string().trim().min(6, "Enter your home or billing address."),
    guestVehicleInfo: z.string().trim().min(2, "Describe the vehicle you are parking.")
  })
  .refine(
    (values) => new Date(values.endTime).getTime() > new Date(values.startTime).getTime(),
    {
      message: "End time must be after start time.",
      path: ["endTime"]
    }
  );

export type ListingValues = z.infer<typeof listingSchema>;
export type BookingValues = z.infer<typeof bookingSchema>;
