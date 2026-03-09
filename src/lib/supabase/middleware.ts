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

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // PREVIEW MODE: bypass auth when enabled
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === "true") {
    return supabaseResponse;
  }

  // Public routes — always accessible
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth")
  ) {
    // If already logged in, redirect away from login
    if (user && pathname.startsWith("/login")) {
      // Determine role and redirect
      const role = await getUserRoleFromDB(supabase, user.id);
      const redirectTo = getRoleRedirect(role);
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Determine user role for route protection
  const role = await getUserRoleFromDB(supabase, user.id);

  // Route protection by role
  // Staff can access everything
  if (role === "staff") {
    return supabaseResponse;
  }

  // Agent can access /agent/* and /api/agent/*
  if (role === "agent") {
    if (
      pathname.startsWith("/agent") ||
      pathname.startsWith("/api/agent") ||
      pathname.startsWith("/api/portal")
    ) {
      return supabaseResponse;
    }
    // Redirect agent to their portal
    const url = request.nextUrl.clone();
    url.pathname = "/agent";
    return NextResponse.redirect(url);
  }

  // Client can access /portal/* and /api/portal/*
  if (role === "client") {
    if (
      pathname.startsWith("/portal") ||
      pathname.startsWith("/api/portal")
    ) {
      return supabaseResponse;
    }
    // Redirect client to their portal
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/**
 * Look up user role from DB tables. Lightweight check for middleware.
 */
async function getUserRoleFromDB(
  supabase: ReturnType<typeof createServerClient>,
  authUserId: string
): Promise<string> {
  // Check user_profiles (staff)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .single();

  if (profile?.role === "staff") return "staff";

  // Check agents
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (agent) return "agent";

  // Check contacts
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (contact) return "client";

  if (profile) return profile.role || "staff";

  return "staff";
}

function getRoleRedirect(role: string): string {
  switch (role) {
    case "agent":
      return "/agent";
    case "client":
      return "/portal";
    default:
      return "/";
  }
}
