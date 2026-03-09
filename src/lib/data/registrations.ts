"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface AgentRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  agency: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  org_id: string | null;
}

const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";

export async function getRegistrations(
  status?: "pending" | "approved" | "rejected"
): Promise<AgentRegistration[]> {
  const supabase = await createClient();

  let query = supabase
    .from("agent_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AgentRegistration[];
}

export async function getPendingRegistrationCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("agent_registrations")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return 0;
  return count || 0;
}

export async function submitRegistration(formData: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  agency?: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("agent_registrations").insert({
    first_name: formData.first_name,
    last_name: formData.last_name,
    email: formData.email,
    phone: formData.phone || null,
    agency: formData.agency || null,
    message: formData.message || null,
    status: "pending",
    org_id: DEFAULT_ORG_ID,
  });

  if (error) {
    if (error.message.includes("duplicate")) {
      return { success: false, error: "An application with this email already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function approveRegistration(
  registrationId: string,
  reviewedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // 1. Get the registration
  const { data: reg, error: fetchError } = await admin
    .from("agent_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (fetchError || !reg) {
    return { success: false, error: "Registration not found" };
  }

  if (reg.status !== "pending") {
    return { success: false, error: "Registration has already been processed" };
  }

  // 2. Create Supabase Auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: reg.email,
    password: "Lintel2026!",
    email_confirm: true,
  });

  if (authError) {
    // If user already exists, try to find them
    if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === reg.email);
      if (!existing) {
        return { success: false, error: `Auth user creation failed: ${authError.message}` };
      }
      // Use existing auth user
      return await completeApproval(admin, reg, existing.id, reviewedBy);
    }
    return { success: false, error: `Auth user creation failed: ${authError.message}` };
  }

  if (!authUser.user) {
    return { success: false, error: "Auth user creation returned no user" };
  }

  return await completeApproval(admin, reg, authUser.user.id, reviewedBy);
}

async function completeApproval(
  admin: ReturnType<typeof createAdminClient>,
  reg: AgentRegistration,
  authUserId: string,
  reviewedBy?: string
): Promise<{ success: boolean; error?: string }> {
  // 3. Create agent record
  const { error: agentError } = await admin.from("agents").insert({
    first_name: reg.first_name,
    last_name: reg.last_name,
    email: reg.email,
    phone: reg.phone,
    agency: reg.agency,
    company: reg.agency,
    status: "active",
    org_id: reg.org_id || "a0000000-0000-0000-0000-000000000001",
    auth_user_id: authUserId,
  });

  if (agentError) {
    return { success: false, error: `Agent creation failed: ${agentError.message}` };
  }

  // 4. Create user_profile
  const { error: profileError } = await admin.from("user_profiles").insert({
    email: reg.email,
    display_name: `${reg.first_name} ${reg.last_name}`,
    role: "agent",
    org_id: reg.org_id || "a0000000-0000-0000-0000-000000000001",
    auth_user_id: authUserId,
  });

  if (profileError) {
    // Profile might already exist, continue anyway
    console.warn("Profile creation warning:", profileError.message);
  }

  // 5. Update registration status
  const { error: updateError } = await admin
    .from("agent_registrations")
    .update({
      status: "approved",
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reg.id);

  if (updateError) {
    return { success: false, error: `Status update failed: ${updateError.message}` };
  }

  revalidatePath("/registrations");
  return { success: true };
}

export async function rejectRegistration(
  registrationId: string,
  reviewedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("agent_registrations")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", registrationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/registrations");
  return { success: true };
}
