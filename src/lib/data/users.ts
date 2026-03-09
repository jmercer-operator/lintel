import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "@/lib/auth/roles";

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function getUserRole(email: string): Promise<UserRole> {
  const profile = await getUserProfile(email);
  return profile?.role || "staff";
}

export async function getUsers(orgId: string): Promise<UserProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as UserProfile[];
}
