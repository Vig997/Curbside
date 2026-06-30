"use client";

import { useEffect, useRef, useState } from "react";

export function HideOnScroll({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const lastY = lastYRef.current;
        const delta = y - lastY;

        // Don't hide immediately at the very top.
        if (y < 40) {
          setHidden(false);
        } else if (delta > 8) {
          // Scrolling down.
          setHidden(true);
        } else if (delta < -8) {
          // Scrolling up.
          setHidden(false);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "sticky top-0 z-40 px-4 pt-3 transition-all duration-300 ease-smooth md:pt-4",
        hidden ? "-translate-y-28 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      ].join(" ")}
    >
      {children}
    </div>
  );
}

