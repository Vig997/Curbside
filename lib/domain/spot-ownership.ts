import { SEED_EXAMPLE_SPOT_IDS } from "@/lib/data/seed-spot-ids";

export function isSeedExampleSpot(spotId: string) {
  return SEED_EXAMPLE_SPOT_IDS.has(spotId);
}

export function isBuiltInDemoSpot(spotId: string) {
  return spotId.startsWith("demo-");
}

export function isDemoSpot(spotId: string) {
  return isBuiltInDemoSpot(spotId) || isSeedExampleSpot(spotId);
}

export function isUserOwnedListing(
  spot: { id: string; ownerId: string },
  userId: string | null | undefined
) {
  if (!userId) {
    return false;
  }

  if (isDemoSpot(spot.id)) {
    return false;
  }

  return spot.ownerId === userId;
}
