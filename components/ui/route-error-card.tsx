"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteErrorCardProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  reset: () => void;
}

export function RouteErrorCard({
  title = "Something went wrong",
  description = "This page hit an unexpected error. Try again or go back.",
  backHref = "/",
  backLabel = "Go home",
  reset
}: RouteErrorCardProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href={backHref}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
