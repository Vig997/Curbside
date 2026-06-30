import { ExploreMapSkeleton } from "@/components/explore/explore-map-skeleton";

export default function ExploreLoading() {
  return (
    <main className="mx-auto flex h-[calc(100vh-96px)] max-w-7xl flex-col gap-4 px-4 pb-4 pt-4 md:px-6">
      <div className="flex-1 min-h-0">
        <ExploreMapSkeleton />
      </div>
    </main>
  );
}
