import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

export async function getActivities(contactId: string): Promise<Activity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select(`
      *,
      agents:agent_id (first_name, last_name)
    `)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const agent = row.agents as { first_name: string; last_name: string } | null;
    return {
      id: row.id as string,
      org_id: row.org_id as string,
      contact_id: row.contact_id as string,
      stock_id: row.stock_id as string | null,
      agent_id: row.agent_id as string | null,
      type: row.type as Activity["type"],
      title: row.title as string,
      description: row.description as string | null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      created_by: row.created_by as string | null,
      created_at: row.created_at as string,
      agent_name: agent ? `${agent.first_name} ${agent.last_name}` : undefined,
    };
  });
}

export async function createActivity(data: {
  contact_id: string;
  type: string;
  title: string;
  description?: string;
  agent_id?: string;
  stock_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("activities").insert({
    contact_id: data.contact_id,
    type: data.type,
    title: data.title,
    description: data.description || null,
    agent_id: data.agent_id || null,
    stock_id: data.stock_id || null,
    metadata: data.metadata || {},
  });

  if (error) return { error: error.message };
  return {};
}
