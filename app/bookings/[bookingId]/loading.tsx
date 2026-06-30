import { Card, CardContent } from "@/components/ui/card";

export default function BookingDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
