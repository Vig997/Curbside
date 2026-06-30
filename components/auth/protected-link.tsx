"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

interface ProtectedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function ProtectedLink({ href, children, className, onClick }: ProtectedLinkProps) {
  const [resolvedHref, setResolvedHref] = useState(`/sign-in?next=${encodeURIComponent(href)}`);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } } | null } }) => {
      setResolvedHref(data.session ? href : `/sign-in?next=${encodeURIComponent(href)}`);
    });
  }, [href]);

  return (
    <Link href={resolvedHref} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
