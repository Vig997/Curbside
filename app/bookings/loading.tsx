import { Card, CardContent } from "@/components/ui/card";

export default function BookingsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-6">
      <Card className="mb-6">
        <CardContent className="space-y-3 p-6">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardContent className="h-36 animate-pulse bg-muted/40 p-6" />
          </Card>
        ))}
      </div>
    </div>
  );
}
