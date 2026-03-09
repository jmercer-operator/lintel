"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "./roles";

export interface AuthResult {
  error?: string;
  redirectTo?: string;
}

/**
 * Sign in with email + password.
 * Determines the user's role and returns the redirect path.
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

  // Redirect based on role
  switch (role) {
    case "agent":
      return { redirectTo: "/agent" };
    case "client":
      return { redirectTo: "/portal" };
    case "staff":
    default:
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
 * Get the role for a given auth user ID by checking user_profiles, agents, contacts.
 */
export async function getUserRoleByAuthId(
  authUserId: string
): Promise<UserRole> {
  const supabase = await createClient();

  // Check user_profiles first (staff)
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

  // Default to staff if found in user_profiles with any role
  if (profile) return (profile.role as UserRole) || "staff";

  return "staff";
}

/**
 * Get the current authenticated user's role and details.
 * Returns null if not authenticated (preview mode or no session).
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

  // Get the profile/agent/contact ID for data scoping
  let profileId: string | undefined;

  if (role === "agent") {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    profileId = data?.id;
  } else if (role === "client") {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    profileId = data?.id;
  } else {
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    profileId = data?.id;
  }

  return {
    id: user.id,
    email: user.email || "",
    role,
    profileId,
  };
}

/**
 * Check if preview mode is enabled.
 */
export function isPreviewMode(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";
}

/**
 * Create test auth users and link them to existing records.
 */
export async function createTestUsers(): Promise<{
  results: Array<{ email: string; success: boolean; error?: string }>;
}> {
  const admin = createAdminClient();
  const results: Array<{ email: string; success: boolean; error?: string }> =
    [];

  const testUsers = [
    {
      email: "am@mproperty.melbourne",
      password: "Lintel2026!",
      role: "staff" as const,
      table: "user_profiles",
      matchField: "email",
    },
    {
      email: "sarah.mitchell@example.com",
      password: "Lintel2026!",
      role: "agent" as const,
      table: "agents",
      matchField: "email",
    },
    {
      email: "david.chen@example.com",
      password: "Lintel2026!",
      role: "client" as const,
      table: "contacts",
      matchField: "email",
    },
  ];

  for (const testUser of testUsers) {
    try {
      // Check if auth user already exists
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u) => u.email === testUser.email
      );

      let authUserId: string;

      if (existing) {
        authUserId = existing.id;
        // Update password
        await admin.auth.admin.updateUserById(authUserId, {
          password: testUser.password,
          email_confirm: true,
        });
      } else {
        // Create the auth user
        const { data: newUser, error: createError } =
          await admin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
          });

        if (createError || !newUser.user) {
          results.push({
            email: testUser.email,
            success: false,
            error: createError?.message || "Failed to create user",
          });
          continue;
        }

        authUserId = newUser.user.id;
      }

      // Link auth_user_id in the corresponding table
      const { error: updateError } = await admin
        .from(testUser.table)
        .update({ auth_user_id: authUserId })
        .eq(testUser.matchField, testUser.email);

      if (updateError) {
        results.push({
          email: testUser.email,
          success: false,
          error: `Auth user created but DB link failed: ${updateError.message}`,
        });
        continue;
      }

      results.push({ email: testUser.email, success: true });
    } catch (err) {
      results.push({
        email: testUser.email,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results };
}
