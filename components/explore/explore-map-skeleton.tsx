import { Card, CardContent } from "@/components/ui/card";

export function ExploreMapSkeleton() {
  return (
    <Card className="h-full animate-fade-in">
      <CardContent className="flex h-full min-h-[560px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-primary/20" />
        <p className="animate-pulse">Loading spots and map...</p>
      </CardContent>
    </Card>
  );
}
