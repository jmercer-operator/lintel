import { createClient } from "@/lib/supabase/server";
import type { PipelineStage, PipelineContact } from "@/lib/types";

export async function getPipelineStats(): Promise<Record<PipelineStage, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("pipeline_stage");

  if (error) {
    console.error("Error fetching pipeline stats:", error);
    return {
      new_lead: 0, contacted: 0, inspection_booked: 0, offer_submitted: 0,
      reserved: 0, contract_issued: 0, exchanged: 0, settled: 0,
    };
  }

  const stats: Record<PipelineStage, number> = {
    new_lead: 0, contacted: 0, inspection_booked: 0, offer_submitted: 0,
    reserved: 0, contract_issued: 0, exchanged: 0, settled: 0,
  };

  for (const row of data || []) {
    const stage = row.pipeline_stage as PipelineStage;
    if (stage && stage in stats) {
      stats[stage]++;
    }
  }

  return stats;
}

export async function getPipelineContacts(stage?: PipelineStage, agentId?: string): Promise<PipelineContact[]> {
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select(`
      id, first_name, last_name, pipeline_stage, next_action, next_action_date,
      referring_agent_id, created_at, updated_at,
      agents:referring_agent_id (first_name, last_name),
      contact_stock (
        stock:stock_id (
          lot_number,
          projects:project_id (name)
        )
      )
    `)
    .not("pipeline_stage", "is", null)
    .order("updated_at", { ascending: false });

  if (stage) {
    query = query.eq("pipeline_stage", stage);
  }

  if (agentId) {
    query = query.eq("referring_agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pipeline contacts:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const agent = row.agents as { first_name: string; last_name: string } | null;
    const contactStock = row.contact_stock as Array<{
      stock: { lot_number: string; projects: { name: string } | null } | null;
    }> | null;
    const firstStock = contactStock?.[0]?.stock;

    return {
      id: row.id as string,
      first_name: row.first_name as string,
      last_name: row.last_name as string,
      pipeline_stage: row.pipeline_stage as PipelineStage,
      next_action: row.next_action as string | null,
      next_action_date: row.next_action_date as string | null,
      referring_agent_id: row.referring_agent_id as string | null,
      agent_name: agent ? `${agent.first_name} ${agent.last_name}` : undefined,
      project_name: firstStock?.projects?.name || undefined,
      lot_number: firstStock?.lot_number || undefined,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });
}

export async function updatePipelineStage(
  contactId: string,
  stage: PipelineStage,
  nextAction?: string,
  nextActionDate?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({
      pipeline_stage: stage,
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
    })
    .eq("id", contactId);

  if (error) return { error: error.message };
  return {};
}
