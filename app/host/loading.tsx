import { Card, CardContent } from "@/components/ui/card";

export default function HostLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      <div className="mb-6 space-y-3">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6">
        <Card>
          <CardContent className="h-40 animate-pulse bg-muted/40" />
        </Card>
        <Card>
          <CardContent className="h-64 animate-pulse bg-muted/40" />
        </Card>
      </div>
    </div>
  );
}
