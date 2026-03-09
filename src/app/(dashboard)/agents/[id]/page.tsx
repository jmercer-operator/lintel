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

  return (
    <AgentDetailClient
      agent={agent}
      projects={projects}
      stock={stock || []}
      agentProjectCommissions={agentProjectCommissions}
      availableCount={availableCount}
    />
  );
}
