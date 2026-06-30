import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreMapSection } from "@/components/explore/explore-map-section";
import { ExploreMapSkeleton } from "@/components/explore/explore-map-skeleton";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse parking spots on the map with filters, price markers, and spot details."
};

export const revalidate = 60;

export default async function ExplorePage({
  searchParams
}: {
  searchParams?: Promise<{ spot?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <main className="mx-auto flex h-[calc(100vh-96px)] max-w-7xl flex-col gap-4 px-4 pb-4 pt-4 md:px-6">
      <div className="flex-1 min-h-0">
        <Suspense fallback={<ExploreMapSkeleton />}>
          <ExploreMapSection highlightSpotId={params?.spot} />
        </Suspense>
      </div>
    </main>
  );
}
