import Link from "next/link";
import { Suspense } from "react";
import { CarFront } from "lucide-react";

import { HideOnScroll } from "@/components/layout/hide-on-scroll";
import { SiteHeaderSession } from "@/components/layout/site-header-session";
import { SiteHeaderAuthSkeleton } from "@/components/layout/site-header-auth-skeleton";

export function SiteHeader() {
  return (
    <HideOnScroll>
      <header>
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[2rem] border border-white/80 bg-white/84 px-4 py-3 shadow-soft backdrop-blur md:px-6">
          <Link href="/" className="interactive-scale flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground shadow-soft transition-transform duration-300 ease-smooth group-hover:scale-105">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Curbside</div>
              <div className="text-xs text-muted-foreground">Parking around IV & UCSB</div>
            </div>
          </Link>

          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-end gap-2">
                <SiteHeaderAuthSkeleton />
              </div>
            }
          >
            <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
              <SiteHeaderSession />
            </div>
          </Suspense>
        </div>
      </header>
    </HideOnScroll>
  );
}
