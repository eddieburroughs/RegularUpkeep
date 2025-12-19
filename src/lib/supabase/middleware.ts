import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper to get user role from profiles table
  const getUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    console.log("[Middleware] getUserRole for", userId, ":", data?.role, error?.message);
    return data?.role || "customer";
  };

  // Protected customer routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Protected provider routes - redirect to login if not authenticated
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/provider") &&
    !request.nextUrl.pathname.startsWith("/provider/onboarding")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Protected handyman routes - redirect to login if not authenticated
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/handyman") &&
    !request.nextUrl.pathname.startsWith("/handyman/onboarding")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Role-based route protection and redirects for authenticated users
  if (user) {
    const role = await getUserRole(user.id);
    const pathname = request.nextUrl.pathname;
    console.log("[Middleware] User:", user.id, "Role:", role, "Path:", pathname);

    // Redirect authenticated users away from auth pages based on role
    if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register")) {
      const url = request.nextUrl.clone();
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");

      if (redirectTo) {
        url.pathname = redirectTo;
        url.search = "";
      } else if (role === "admin") {
        url.pathname = "/app";
      } else if (role === "provider") {
        url.pathname = "/provider/jobs";
      } else if (role === "handyman") {
        url.pathname = "/handyman/jobs";
      } else {
        url.pathname = "/app";
      }
      return NextResponse.redirect(url);
    }

    // Redirect admins from customer onboarding to app (admins don't need onboarding)
    if (role === "admin" && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }

    // Prevent customers from accessing provider routes
    if (
      role === "customer" &&
      pathname.startsWith("/provider") &&
      !pathname.startsWith("/provider/onboarding")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }

    // Redirect providers from customer onboarding to provider area
    if (role === "provider" && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/provider/jobs";
      return NextResponse.redirect(url);
    }

    // Redirect handymen from customer onboarding to handyman area
    if (role === "handyman" && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/handyman/jobs";
      return NextResponse.redirect(url);
    }

    // Redirect providers from /app to provider area
    if (role === "provider" && pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/provider/jobs";
      return NextResponse.redirect(url);
    }

    // Redirect handymen from /app to handyman area
    if (role === "handyman" && pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/handyman/jobs";
      return NextResponse.redirect(url);
    }

    // Prevent handymen from accessing provider routes (except onboarding)
    if (
      role === "handyman" &&
      pathname.startsWith("/provider") &&
      !pathname.startsWith("/provider/onboarding")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/handyman/jobs";
      return NextResponse.redirect(url);
    }

    // Prevent providers from accessing handyman routes (except onboarding)
    if (
      role === "provider" &&
      pathname.startsWith("/handyman") &&
      !pathname.startsWith("/handyman/onboarding")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/provider/jobs";
      return NextResponse.redirect(url);
    }

    // Prevent customers from accessing handyman routes
    if (
      role === "customer" &&
      pathname.startsWith("/handyman") &&
      !pathname.startsWith("/handyman/onboarding")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
