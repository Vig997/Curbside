import { Card, CardContent } from "@/components/ui/card";

export default function ReserveLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
