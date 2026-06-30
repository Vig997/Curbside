import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));

            response = NextResponse.next({
              request
            });

            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          }
        }
      }
    );

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (
      (request.nextUrl.pathname.startsWith("/host") ||
        request.nextUrl.pathname.startsWith("/bookings") ||
        request.nextUrl.pathname.startsWith("/reserve")) &&
      !user
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );

      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    if (
      request.nextUrl.pathname.startsWith("/host") ||
      request.nextUrl.pathname.startsWith("/bookings") ||
      request.nextUrl.pathname.startsWith("/reserve")
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );

      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
