import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserve",
  robots: { index: false, follow: false }
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
