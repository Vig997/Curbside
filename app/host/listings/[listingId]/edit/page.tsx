import { notFound, redirect } from "next/navigation";

import { ListingForm } from "@/components/host/listing-form";
import { updateListingAction } from "@/lib/actions/listings";
import { getCurrentUserProfile, getParkingSpotById } from "@/lib/supabase/queries";

export default async function EditListingPage({
  params
}: {
  params: Promise<{ listingId: string }>;
}) {
  const [{ listingId }, { user }] = await Promise.all([params, getCurrentUserProfile()]);
  const spot = await getParkingSpotById(listingId);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/host/listings/${listingId}/edit`)}`);
  }

  if (!spot || spot.ownerId !== user.id) {
    notFound();
  }

  const action = updateListingAction.bind(null, listingId);

  return <ListingForm action={action} initialSpot={spot} mode="edit" />;
}
