import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Host",
  description: "Manage your parking listings, pricing, and reservations.",
  robots: { index: false, follow: false }
};

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Host Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your listings, pricing, and reservations.</p>
        </div>
        <Link href="/host/listings/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Listing
          </Button>
        </Link>
      </div>
      {children}
    </main>
  );
}

