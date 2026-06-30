import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { ProtectedLink } from "@/components/auth/protected-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HeroPanel() {
  return (
    <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-none bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.35),transparent_46%),linear-gradient(135deg,rgba(13,148,136,0.96),rgba(15,23,42,0.95))] text-white shadow-floating animate-fade-in">
      <CardContent className="grid h-full min-h-0 flex-1 items-stretch gap-5 overflow-hidden p-5 md:grid-cols-[1.2fr_0.8fr] md:gap-8 md:p-8 lg:p-10">
        <div className="flex min-h-0 flex-col justify-center gap-5 md:gap-8 animate-fade-up">
          <div className="space-y-4 md:space-y-5">
            <h1 className="font-display text-3xl font-semibold leading-[1.15] sm:text-4xl md:text-5xl lg:text-[3.1rem]">
              Find a better parking spot before traffic finds you.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base md:text-lg">
              Browse nearby listings, compare prices on the map, and get entry details when you book.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4">
            <Link href="/explore">
              <Button variant="secondary" className="bg-white text-teal-900 hover:bg-white/90">
                Explore spots
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <ProtectedLink href="/host">
              <Button variant="outline" className="border-white/40 bg-white/18 text-white hover:bg-white/28">
                List your space
              </Button>
            </ProtectedLink>
          </div>
        </div>
        <div className="grid h-full min-h-0 max-h-full grid-cols-3 gap-2 sm:gap-3 md:grid-cols-1 md:grid-rows-3 md:gap-3 md:pl-4 lg:gap-4 lg:pl-6 animate-fade-up [animation-delay:120ms]">
          {[
            { icon: ShieldCheck, label: "Student hosts", value: "IV + UCSB area" },
            { icon: Zap, label: "Fast booking", value: "Book in under 30 sec" },
            { icon: Sparkles, label: "Clear access", value: "Gate codes after checkout" }
          ].map((item) => (
            <div
              key={item.label}
              className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[1.25rem] border border-white/28 bg-white/18 p-2.5 backdrop-blur-md transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-white/24 sm:rounded-[1.5rem] sm:p-3 md:rounded-[1.75rem] md:p-4"
            >
              <item.icon className="mb-1.5 h-4 w-4 shrink-0 text-white/90 sm:mb-2 sm:h-4 sm:w-4 md:mb-2.5 md:h-5 md:w-5" />
              <div className="text-[10px] font-medium leading-tight sm:text-xs md:text-sm">{item.label}</div>
              <div className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-white/70 sm:text-[10px] md:mt-1 md:text-xs">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
