"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "./roles";

export interface AuthResult {
  error?: string;
  redirectTo?: string;
}

/**
 * Sign in with email + password.
 * Determines the user's role and returns the redirect path.
 * Fails closed: users that cannot be mapped to staff/agent/client are
 * signed out and rejected.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Authentication failed" };
  }

  // Determine role by looking up auth_user_id in tables
  const role = await getUserRoleByAuthId(data.user.id);

  if (!role) {
    // Unknown user — do not grant any access.
    await supabase.auth.signOut();
    return {
      error:
        "Your account is not provisioned for access. Please contact your administrator.",
    };
  }

  // Redirect based on role
  switch (role) {
    case "agent":
      return { redirectTo: "/agent" };
    case "client":
      return { redirectTo: "/portal" };
    case "staff":
      return { redirectTo: "/" };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Get the role for a given auth user ID by checking user_profiles, agents,
 * contacts. Returns null when the user cannot be mapped (fail closed — the
 * caller must deny access; unknown users are NOT treated as staff).
 */
export async function getUserRoleByAuthId(
  authUserId: string
): Promise<UserRole | null> {
  const supabase = await createClient();

  // Check user_profiles first (staff)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profile?.role === "staff") return "staff";

  // Check agents
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (agent) return "agent";

  // Check contacts
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (contact) return "client";

  // Profile exists with an explicit non-staff role we recognise
  if (profile?.role === "agent" || profile?.role === "client") {
    return profile.role as UserRole;
  }

  return null;
}

/**
 * Get the current authenticated user's role and details.
 * Returns null if not authenticated or if the user cannot be mapped to a
 * known staff/agent/client identity.
 */
export async function getAuthenticatedUser(): Promise<{
  id: string;
  email: string;
  role: UserRole;
  profileId?: string;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = await getUserRoleByAuthId(user.id);
  if (!role) return null;

  // Get the profile/agent/contact ID for data scoping
  let profileId: string | undefined;

  if (role === "agent") {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    profileId = data?.id;
  } else if (role === "client") {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    profileId = data?.id;
  } else {
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    profileId = data?.id;
  }

  return {
    id: user.id,
    email: user.email || "",
    role,
    profileId,
  };
}
