export function SiteHeaderAuthSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden h-9 w-28 animate-pulse rounded-[1.2rem] bg-muted md:block" />
      <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
