import { createListingAction } from "@/lib/actions/listings";
import { ListingForm } from "@/components/host/listing-form";

export default function NewListingPage() {
  return <ListingForm action={createListingAction} mode="create" />;
}
