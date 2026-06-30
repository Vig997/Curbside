import { SpotFilters, SpotType } from "@/lib/types";

export const DEFAULT_FILTERS: SpotFilters = {
  search: "",
  maxPrice: 40,
  availableNow: false,
  coveredOnly: false,
  evChargingOnly: false,
  type: "all"
};

export const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/bookings", label: "Reservations" },
  { href: "/host", label: "Host" }
];

export const SPOT_TYPE_OPTIONS: { label: string; value: SpotType }[] = [
  { label: "Driveway", value: "driveway" },
  { label: "Garage", value: "garage" },
  { label: "Apartment spot", value: "apartment_spot" },
  { label: "Covered lot", value: "covered_lot" },
  { label: "Uncovered lot", value: "uncovered_lot" }
];

export const PARKING_SPOT_BUCKET = "parking-spot-images";

export const PUBLISHED_SPOTS_TAG = "published-spots";

export const LISTING_DESCRIPTION_MAX = 120;

export const LISTING_ACCESS_INSTRUCTIONS_MAX = 180;

export const DEFAULT_MAP_CENTER = {
  latitude: 34.4129,
  longitude: -119.861
};

export const DEFAULT_MAP_ZOOM = 14.3;

export const LOCATION_PRESETS: Record<
  string,
  {
    label: string;
    latitude: number;
    longitude: number;
    zoom: number;
  }
> = {
  "isla vista": {
    label: "Isla Vista",
    latitude: 34.4129,
    longitude: -119.861,
    zoom: 14.3
  },
  ucsb: {
    label: "UCSB",
    latitude: 34.414,
    longitude: -119.8489,
    zoom: 14.1
  },
  "santa barbara": {
    label: "Santa Barbara",
    latitude: 34.4208,
    longitude: -119.6982,
    zoom: 12.2
  },
  goleta: {
    label: "Goleta",
    latitude: 34.4358,
    longitude: -119.8276,
    zoom: 12.5
  },
  "los angeles": {
    label: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    zoom: 10.8
  },
  "san francisco": {
    label: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 11.2
  }
} as const;
