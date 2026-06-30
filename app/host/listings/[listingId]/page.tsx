import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile, getParkingSpotById } from "@/lib/supabase/queries";
import { formatCurrency, formatSpotType, summarizeAvailability } from "@/lib/helpers";

export default async function HostListingDetailPage({
  params
}: {
  params: Promise<{ listingId: string }>;
}) {
  const [{ listingId }, { user }] = await Promise.all([params, getCurrentUserProfile()]);
  const spot = await getParkingSpotById(listingId);

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/host/listings/${listingId}`)}`);
  }

  if (!spot || spot.ownerId !== user.id) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden">
        <div className="relative h-72">
          <Image
            src={spot.photos[0]?.url ?? "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"}
            alt={spot.title}
            fill
            className="object-cover"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{spot.title}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{spot.locationNotes}</p>
            </div>
            <Badge variant={spot.isPublished ? "success" : "outline"}>
              {spot.isPublished ? "Published" : "Unpublished"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{formatSpotType(spot.spotType)}</Badge>
            <Badge variant="outline">{formatCurrency(spot.pricePerHour)}/hr</Badge>
            <Badge variant="outline">{summarizeAvailability(spot.availabilityWindows)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{spot.description}</p>
          <div className="rounded-3xl bg-surface/80 p-4 text-sm">
            <div className="font-medium text-foreground">Access instructions</div>
            <div className="mt-2 line-clamp-4 leading-relaxed text-muted-foreground">{spot.accessInstructions}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl bg-surface/80 p-4 text-sm">
            <div className="font-medium text-foreground">Vehicle size</div>
            <div className="mt-2 text-muted-foreground">{spot.vehicleSizeRestrictions}</div>
          </div>
          <Link href={`/host/listings/${spot.id}/edit`}>
            <Button className="w-full">Edit listing</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
