import Link from "next/link";
import { PlusCircle, UserCircle2 } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { getCurrentUserProfile } from "@/lib/supabase/queries";

const PROTECTED_NAV_HREFS = new Set(["/bookings", "/host"]);

function navHref(href: string, isSignedIn: boolean) {
  if (!isSignedIn && PROTECTED_NAV_HREFS.has(href)) {
    return `/sign-in?next=${encodeURIComponent(href)}`;
  }

  return href;
}

export async function SiteHeaderSession() {
  const { user, profile } = await getCurrentUserProfile();
  const profileName = profile?.fullName?.trim() || "CU";
  const avatarFallback = profileName.slice(0, 2).toUpperCase();
  const listSpotHref = user ? "/host" : `/sign-in?next=${encodeURIComponent("/host")}`;

  return (
    <>
      <nav className="hidden items-center gap-2 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={navHref(link.href, Boolean(user))}
            className="rounded-[1rem] px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link href={listSpotHref}>
          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            <PlusCircle className="h-4 w-4" />
            List your spot
          </Button>
        </Link>
        {user && profile ? (
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/bookings" className="interactive-lift flex items-center gap-3 rounded-[1rem] px-2 py-1">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profileName} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-semibold">{profileName}</div>
                <div className="text-xs text-muted-foreground">Reservations</div>
              </div>
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link href={`/sign-in?next=${encodeURIComponent("/bookings")}`}>
            <Button variant="ghost" size="icon" aria-label="Sign in">
              <UserCircle2 className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}
