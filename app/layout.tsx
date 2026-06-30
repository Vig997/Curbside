import type { Metadata } from "next";

import "@/app/globals.css";

import { SiteHeader } from "@/components/layout/site-header";

function getMetadataBase() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    try {
      return new URL(siteUrl);
    } catch {
      console.warn("[layout] Ignoring invalid NEXT_PUBLIC_SITE_URL:", siteUrl);
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    try {
      return new URL(`https://${vercelUrl}`);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "Curbside",
    template: "%s · Curbside"
  },
  description: "Find and reserve parking near Isla Vista and UCSB.",
  openGraph: {
    title: "Curbside",
    description: "Find and reserve parking near Isla Vista and UCSB.",
    type: "website",
    images: [
      {
        url: "/screenshots/explore.png",
        width: 1200,
        height: 800,
        alt: "Curbside explore map with parking spots"
      }
    ]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen pb-12">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
