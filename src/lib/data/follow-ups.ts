import { createClient } from "@/lib/supabase/server";
import type { FollowUp } from "@/lib/types";

function mapRow(row: Record<string, unknown>): FollowUp {
  const contact = row.contacts as { first_name: string; last_name: string } | null;
  const agent = row.agents as { first_name: string; last_name: string } | null;
  const stock = row.stock as { lot_number: string; projects: { name: string } | null } | null;

  return {
    id: row.id as string,
    org_id: row.org_id as string,
    contact_id: row.contact_id as string,
    stock_id: row.stock_id as string | null,
    agent_id: row.agent_id as string | null,
    action_type: row.action_type as FollowUp["action_type"],
    description: row.description as string,
    due_date: row.due_date as string,
    completed: row.completed as boolean,
    completed_at: row.completed_at as string | null,
    priority: row.priority as FollowUp["priority"],
    created_at: row.created_at as string,
    contact_name: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
    agent_name: agent ? `${agent.first_name} ${agent.last_name}` : undefined,
    project_name: stock?.projects?.name || undefined,
    lot_number: stock?.lot_number || undefined,
  };
}

export async function getFollowUps(agentId?: string, options?: { todayOnly?: boolean }): Promise<FollowUp[]> {
  const supabase = await createClient();

  let query = supabase
    .from("follow_ups")
    .select(`
      *,
      contacts:contact_id (first_name, last_name),
      agents:agent_id (first_name, last_name),
      stock:stock_id (lot_number, projects:project_id (name))
    `)
    .eq("completed", false)
    .order("due_date", { ascending: true });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  // Filter to today and overdue only (for staff dashboard "Today's Follow-ups")
  if (options?.todayOnly) {
    const today = new Date().toISOString().split("T")[0];
    query = query.lte("due_date", today);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching follow-ups:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => mapRow(row));
}

export async function getFollowUpsByContact(contactId: string): Promise<FollowUp[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      *,
      contacts:contact_id (first_name, last_name),
      agents:agent_id (first_name, last_name),
      stock:stock_id (lot_number, projects:project_id (name))
    `)
    .eq("contact_id", contactId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching follow-ups:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => mapRow(row));
}

export async function createFollowUp(data: {
  contact_id: string;
  action_type: string;
  description: string;
  due_date: string;
  priority?: string;
  agent_id?: string;
  stock_id?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("follow_ups").insert({
    contact_id: data.contact_id,
    action_type: data.action_type,
    description: data.description,
    due_date: data.due_date,
    priority: data.priority || "normal",
    agent_id: data.agent_id || null,
    stock_id: data.stock_id || null,
  });

  if (error) return { error: error.message };
  return {};
}

export async function completeFollowUp(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}
