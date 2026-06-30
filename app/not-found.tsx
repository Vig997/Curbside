import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The route, listing, or booking could not be found. It may have been removed or you may not have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/explore">
            <Button>Back to map</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
