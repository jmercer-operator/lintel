import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminEmails(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("is_admin", true);
  return (data || []).map((u: { email: string }) => u.email).filter(Boolean);
}

export async function getAdminUsers(): Promise<Array<{ id: string; email: string }>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("is_admin", true);
  return (data || []) as Array<{ id: string; email: string }>;
}
