import { DEFAULT_MAP_CENTER } from "@/lib/config/constants";

type GeocodeResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const trimmed = query.trim();

  if (!token || trimmed.length < 3) {
    return null;
  }

  const encoded = encodeURIComponent(trimmed);
  const proximity = `${DEFAULT_MAP_CENTER.longitude},${DEFAULT_MAP_CENTER.latitude}`;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&proximity=${proximity}&country=us`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      features?: Array<{
        center?: [number, number];
        place_name?: string;
      }>;
    };

    const feature = data.features?.[0];
    const [longitude, latitude] = feature?.center ?? [];

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }

    return {
      latitude,
      longitude,
      placeName: feature?.place_name ?? trimmed
    };
  } catch {
    return null;
  }
}
