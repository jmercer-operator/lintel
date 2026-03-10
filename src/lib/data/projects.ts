import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectWithStats, StockStats } from "@/lib/types";

export async function getProjects(): Promise<ProjectWithStats[]> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!projects) return [];

  // Fetch stock stats for all projects
  const { data: stock, error: stockError } = await supabase
    .from("stock")
    .select("project_id, status");

  if (stockError) throw stockError;

  const statsMap: Record<string, StockStats> = {};
  for (const s of stock || []) {
    if (!statsMap[s.project_id]) {
      statsMap[s.project_id] = { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 };
    }
    const stats = statsMap[s.project_id];
    stats.total++;
    switch (s.status) {
      case "Available": stats.available++; break;
      case "EOI": stats.eoi++; break;
      case "Under Contract": stats.underContract++; break;
      case "Exchanged": stats.exchanged++; break;
      case "Settled": stats.settled++; break;
    }
  }

  return (projects as Project[]).map((p) => ({
    ...p,
    stats: statsMap[p.id] || { total: 0, available: 0, eoi: 0, underContract: 0, exchanged: 0, settled: 0 },
  }));
}

export async function getProject(id: string): Promise<ProjectWithStats | null> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) return null;

  const { data: stock } = await supabase
    .from("stock")
    .select("status")
    .eq("project_id", id);

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

export async function createProject(data: {
  name: string;
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  org_id: string;
}): Promise<Project> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      ...data,
      status: "active",
      total_lots: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-seed default milestones for new projects
  const DEFAULT_MILESTONES = [
    { name: "Planning Approved", description: "Council planning permit approved", sort_order: 1 },
    { name: "Demolition Complete", description: "Site cleared and ready for construction", sort_order: 2 },
    { name: "Foundation & Slab", description: "Concrete slab poured", sort_order: 3 },
    { name: "Frame & Structure", description: "Structural framing complete", sort_order: 4 },
    { name: "Lock Up", description: "External walls, roof, windows installed", sort_order: 5 },
    { name: "Fit Out", description: "Internal fit-out and services", sort_order: 6 },
    { name: "Completion", description: "Occupancy certificate issued", sort_order: 7 },
  ];

  await supabase.from("project_milestones").insert(
    DEFAULT_MILESTONES.map((m) => ({
      ...m,
      project_id: project.id,
      org_id: data.org_id,
      status: "upcoming",
    }))
  );

  return project as Project;
}

export async function getAggregateStats(projectId?: string): Promise<StockStats> {
  const supabase = await createClient();

  let query = supabase.from("stock").select("status");
  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: stock, error } = await query;
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
  return stats;
}
