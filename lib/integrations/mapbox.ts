import type { MapSpotSummary } from "@/lib/types";

export function spotsToGeoJson(spots: MapSpotSummary[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((spot) => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        spotId: spot.id,
        pricePerHour: spot.pricePerHour
      },
      geometry: {
        type: "Point" as const,
        coordinates: [spot.longitude, spot.latitude]
      }
    }))
  };
}
