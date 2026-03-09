import { createClient } from "@/lib/supabase/server";
import type { StockItem, StockStats, Project, ProjectWithStats } from "@/lib/types";
import type { ProjectDocument, DocumentCategory } from "@/lib/data/documents";
import type { ProjectMilestone } from "@/lib/data/milestones";

/**
 * Get all stock items assigned to a specific agent, across all projects.
 * Includes commission_rate and commission_type from stock, plus project logo_url.
 */
export async function getAgentStock(agentId: string): Promise<
  (StockItem & { project_name: string; project_logo_url: string | null })[]
> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .select("*")
    .eq("agent_id", agentId)
    .order("project_id", { ascending: true });

  if (error) throw error;
  if (!stock || stock.length === 0) return [];

  // Get project names and logos
  const projectIds = [...new Set(stock.map((s) => s.project_id))];
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, logo_url")
    .in("id", projectIds);

  const projectMap: Record<string, { name: string; logo_url: string | null }> = {};
  for (const p of projects || []) {
    projectMap[p.id] = { name: p.name, logo_url: p.logo_url };
  }

  return (stock as StockItem[]).map((s) => ({
    ...s,
    project_name: projectMap[s.project_id]?.name || "Unknown",
    project_logo_url: projectMap[s.project_id]?.logo_url || null,
  }));
}

/**
 * Get stats for an agent's stock.
 * activeLots = Available + EOI only (unsold lots)
 * allLots = total across all statuses
 */
export async function getAgentStockStats(agentId: string): Promise<StockStats & { activeLots: number; allLots: number }> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .select("status, price")
    .eq("agent_id", agentId);

  if (error) throw error;

  const stats: StockStats = { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 };

  for (const s of stock || []) {
    stats.total++;
    switch (s.status) {
      case "Available": stats.available++; break;
      case "EOI": stats.eoi++; break;
      case "Under Contract": stats.underContract++; break;
      case "Exchanged": stats.exchanged++; break;
      case "Settled": stats.settled++; break;
    }
  }

  const activeLots = stats.available + stats.eoi;
  const allLots = stats.total;

  return { ...stats, activeLots, allLots };
}

/**
 * Get projects assigned to an agent via agent_projects table.
 */
export async function getAgentProjects(agentId: string): Promise<ProjectWithStats[]> {
  const supabase = await createClient();

  const { data: assignments, error: apError } = await supabase
    .from("agent_projects")
    .select("project_id")
    .eq("agent_id", agentId);

  if (apError) throw apError;
  if (!assignments || assignments.length === 0) {
    // Fallback: if no assignments, show projects that have stock assigned to this agent
    const { data: stock } = await supabase
      .from("stock")
      .select("project_id")
      .eq("agent_id", agentId);

    const projectIds = [...new Set((stock || []).map((s) => s.project_id))];
    if (projectIds.length === 0) return [];

    return getProjectsByIds(projectIds);
  }

  const projectIds = assignments.map((a) => a.project_id);
  return getProjectsByIds(projectIds);
}

async function getProjectsByIds(ids: string[]): Promise<ProjectWithStats[]> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .in("id", ids)
    .order("name", { ascending: true });

  if (error) throw error;
  if (!projects) return [];

  const { data: stock } = await supabase
    .from("stock")
    .select("project_id, status")
    .in("project_id", ids);

  const statsMap: Record<string, StockStats> = {};
  for (const s of stock || []) {
    if (!statsMap[s.project_id]) {
      statsMap[s.project_id] = { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 };
    }
    const st = statsMap[s.project_id];
    st.total++;
    switch (s.status) {
      case "Available": st.available++; break;
      case "EOI": st.eoi++; break;
      case "Under Contract": st.underContract++; break;
      case "Exchanged": st.exchanged++; break;
      case "Settled": st.settled++; break;
    }
  }

  return (projects as Project[]).map((p) => ({
    ...p,
    stats: statsMap[p.id] || { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 },
  }));
}

/**
 * Get contacts where this agent is the referring_agent_id.
 */
export async function getAgentClients(agentId: string): Promise<
  Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    classification: string;
    created_at: string;
    linked_lots: Array<{ lot_number: string; project_name: string; status: string }>;
  }>
> {
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, classification, created_at")
    .eq("referring_agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!contacts || contacts.length === 0) return [];

  const contactIds = contacts.map((c) => c.id);

  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("contact_id, stock_id, project_id")
    .in("contact_id", contactIds);

  const stockIds = [...new Set((contactStock || []).map((cs) => cs.stock_id))];
  const projectIds = [...new Set((contactStock || []).map((cs) => cs.project_id))];

  let stockMap: Record<string, { lot_number: string; status: string }> = {};
  let projectMap: Record<string, string> = {};

  if (stockIds.length > 0) {
    const { data: stockItems } = await supabase
      .from("stock")
      .select("id, lot_number, status")
      .in("id", stockIds);
    for (const s of stockItems || []) {
      stockMap[s.id] = { lot_number: s.lot_number, status: s.status };
    }
  }

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const p of projects || []) {
      projectMap[p.id] = p.name;
    }
  }

  return contacts.map((c) => {
    const links = (contactStock || []).filter((cs) => cs.contact_id === c.id);
    return {
      ...c,
      linked_lots: links.map((cs) => ({
        lot_number: stockMap[cs.stock_id]?.lot_number || "—",
        project_name: projectMap[cs.project_id] || "—",
        status: stockMap[cs.stock_id]?.status || "Available",
      })),
    };
  });
}

/**
 * Check if a stock item has a linked customer via contact_stock.
 */
export async function stockHasLinkedCustomer(stockId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_stock")
    .select("id")
    .eq("stock_id", stockId)
    .limit(1);

  if (error) return false;
  return (data || []).length > 0;
}

/**
 * Get agent details for profile page.
 */
export async function getAgentForProfile(agentId: string): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Update agent profile (editable fields only: email, phone, secondary_phone, address).
 */
export async function updateAgentProfile(agentId: string, updates: {
  email?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", agentId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Get agent-visible project documents (visibility = 'agent' or 'client').
 */
export async function getAgentProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .in("visibility", ["agent", "client"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ProjectDocument[];
}

/**
 * Get project with stats for agent view.
 */
export async function getAgentProjectDetail(projectId: string): Promise<ProjectWithStats | null> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) return null;

  const { data: stock } = await supabase
    .from("stock")
    .select("status")
    .eq("project_id", projectId);

  const stats: StockStats = { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 };
  for (const s of stock || []) {
    stats.total++;
    switch (s.status) {
      case "Available": stats.available++; break;
      case "EOI": stats.eoi++; break;
      case "Under Contract": stats.underContract++; break;
      case "Exchanged": stats.exchanged++; break;
      case "Settled": stats.settled++; break;
    }
  }

  return { ...(project as Project), stats };
}

/**
 * Get all stock for a project (agent view — shows all lots, not just agent's).
 */
export async function getProjectStockForAgent(projectId: string): Promise<StockItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .eq("project_id", projectId)
    .order("lot_number", { ascending: true });

  if (error) throw error;
  return (data || []) as StockItem[];
}
