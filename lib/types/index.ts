export type SpotType =
  | "driveway"
  | "garage"
  | "apartment_spot"
  | "covered_lot"
  | "uncovered_lot";

export interface Profile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  phone?: string;
  address?: string;
  vehicleInfo?: string;
}

export interface SpotPhoto {
  id: string;
  url: string;
  storagePath: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface AvailabilityWindow {
  id: string;
  startAt: string;
  endAt: string;
  repeatDaily: boolean;
  overnightAllowed: boolean;
}

export interface MapSpotSummary {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  locationNotes: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  isPublished: boolean;
  covered: boolean;
  hasEvCharger: boolean;
  spotType: SpotType;
  isDemo?: boolean;
  availabilityWindows: AvailabilityWindow[];
}

export interface ParkingSpot {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  locationNotes: string;
  spotType: SpotType;
  pricePerHour: number;
  covered: boolean;
  hasEvCharger: boolean;
  vehicleSizeRestrictions: string;
  accessInstructions: string;
  latitude: number;
  longitude: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  owner: Profile;
  photos: SpotPhoto[];
  availabilityWindows: AvailabilityWindow[];
  hostRating: number;
}

export interface GuestContact {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  vehicleInfo: string;
}

export interface Booking {
  id: string;
  spotId: string;
  driverId: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
  spot: ParkingSpot;
  driver: Profile;
  guest: GuestContact;
}

export interface SpotFilters {
  search: string;
  maxPrice: number;
  availableNow: boolean;
  coveredOnly: boolean;
  evChargingOnly: boolean;
  type: SpotType | "all";
}

export interface UploadedPhotoValue {
  url: string;
  path: string;
}
