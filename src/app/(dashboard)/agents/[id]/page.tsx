import { notFound } from "next/navigation";
import { getAgentWithStats, getAgentProjectsWithCommission } from "@/lib/data/agents";
import { getProjects } from "@/lib/data/projects";
import { AgentDetailClient } from "./AgentDetailClient";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [agent, projects, agentProjectCommissions] = await Promise.all([
    getAgentWithStats(id),
    getProjects(),
    getAgentProjectsWithCommission(id),
  ]);

  if (!agent) notFound();

  // Get stock for this agent
  const supabase = await createClient();
  const { data: stock } = await supabase
    .from("stock")
    .select("*, projects:project_id(name)")
    .eq("agent_id", id)
    .order("lot_number", { ascending: true });

  // Count available lots for this agent
  const availableCount = (stock || []).filter((s) => s.status === "Available").length;

  // Get available stock for assignment (not assigned to any agent, status = Available)
  // Only for projects the agent has access to
  const agentProjectIds = agentProjectCommissions.map((ap) => ap.project_id);
  let availableStock: Array<{
    id: string;
    lot_number: string;
    bedrooms: number;
    bathrooms: number;
    car_spaces: number;
    price: number | null;
    project_id: string;
    project_name: string;
  }> = [];

  if (agentProjectIds.length > 0) {
    const { data } = await supabase
      .from("stock")
      .select("id, lot_number, bedrooms, bathrooms, car_spaces, price, project_id, projects:project_id(name)")
      .in("project_id", agentProjectIds)
      .eq("status", "Available")
      .is("agent_id", null)
      .order("lot_number", { ascending: true });
    availableStock = (data || []).map((row: Record<string, unknown>) => {
      const projects = row.projects as { name: string } | { name: string }[] | null;
      const projectName = Array.isArray(projects) ? projects[0]?.name : projects?.name;
      return {
        id: row.id as string,
        lot_number: row.lot_number as string,
        bedrooms: row.bedrooms as number,
        bathrooms: row.bathrooms as number,
        car_spaces: row.car_spaces as number,
        price: row.price as number | null,
        project_id: row.project_id as string,
        project_name: projectName || "Unknown",
      };
    });
  }

  // Determine which projects have assigned stock for this agent (for filtering display)
  const projectsWithStock = new Set<string>();
  for (const s of stock || []) {
    projectsWithStock.add(s.project_id);
  }

  return (
    <AgentDetailClient
      agent={agent}
      projects={projects}
      stock={stock || []}
      agentProjectCommissions={agentProjectCommissions}
      availableCount={availableCount}
      availableStockForAssignment={availableStock}
      projectIdsWithAssignedStock={Array.from(projectsWithStock)}
    />
  );
}
