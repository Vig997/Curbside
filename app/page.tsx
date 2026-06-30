import type { Metadata } from "next";

import { HeroPanel } from "@/components/home/hero-panel";

export const metadata: Metadata = {
  title: "Home",
  description: "Find parking near Isla Vista and UCSB before you hit traffic."
};

export default function HomePage() {
  return (
    <main className="mx-auto flex h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] max-w-7xl flex-col overflow-hidden px-4 py-3 md:px-6 md:py-4">
      <HeroPanel />
    </main>
  );
}
