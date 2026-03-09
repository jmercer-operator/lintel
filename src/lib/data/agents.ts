import { createClient } from "@/lib/supabase/server";
import type { Agent, AgentWithStats, AgentProject } from "@/lib/types";

export async function getAgents(): Promise<Agent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("first_name", { ascending: true });

  if (error) throw error;
  return (data || []) as Agent[];
}

export async function getAgent(id: string): Promise<Agent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Agent;
}

export async function getAgentWithStats(id: string): Promise<AgentWithStats | null> {
  const supabase = await createClient();

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !agent) return null;

  // Get assigned projects
  const { data: agentProjects } = await supabase
    .from("agent_projects")
    .select("project_id")
    .eq("agent_id", id);

  // Get stock assigned to this agent
  const { data: stock } = await supabase
    .from("stock")
    .select("status, price, agent_id")
    .eq("agent_id", id);

  const lots_by_status: Record<string, number> = {};
  let total_value = 0;
  for (const s of stock || []) {
    lots_by_status[s.status] = (lots_by_status[s.status] || 0) + 1;
    if (s.price) total_value += Number(s.price);
  }

  return {
    ...(agent as Agent),
    assigned_projects: (agentProjects || []).map((ap) => ap.project_id),
    total_lots: (stock || []).length,
    lots_by_status,
    total_value,
  };
}

export async function getAgentsWithProjectCounts(): Promise<
  (Agent & { project_count: number; lot_count: number; available_count: number })[]
> {
  const supabase = await createClient();

  const { data: agents, error } = await supabase
    .from("agents")
    .select("*")
    .order("first_name", { ascending: true });

  if (error) throw error;
  if (!agents || agents.length === 0) return [];

  const agentIds = agents.map((a) => a.id);

  // Get project counts
  const { data: agentProjects } = await supabase
    .from("agent_projects")
    .select("agent_id, project_id")
    .in("agent_id", agentIds);

  // Get lot counts
  const { data: stock } = await supabase
    .from("stock")
    .select("agent_id")
    .in("agent_id", agentIds);

  const projectCounts: Record<string, number> = {};
  const lotCounts: Record<string, number> = {};

  for (const ap of agentProjects || []) {
    projectCounts[ap.agent_id] = (projectCounts[ap.agent_id] || 0) + 1;
  }
  for (const s of stock || []) {
    if (s.agent_id) lotCounts[s.agent_id] = (lotCounts[s.agent_id] || 0) + 1;
  }

  // Get available lot counts per agent
  const { data: availableStock } = await supabase
    .from("stock")
    .select("agent_id")
    .in("agent_id", agentIds)
    .eq("status", "Available");

  const availableCounts: Record<string, number> = {};
  for (const s of availableStock || []) {
    if (s.agent_id) availableCounts[s.agent_id] = (availableCounts[s.agent_id] || 0) + 1;
  }

  return (agents as Agent[]).map((a) => ({
    ...a,
    project_count: projectCounts[a.id] || 0,
    lot_count: lotCounts[a.id] || 0,
    available_count: availableCounts[a.id] || 0,
  }));
}

export async function getAgentProjectsWithCommission(agentId: string): Promise<AgentProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_projects")
    .select("*")
    .eq("agent_id", agentId);

  if (error) throw error;
  return (data || []) as AgentProject[];
}
