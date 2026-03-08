import { notFound } from "next/navigation";
import { getAgentWithStats } from "@/lib/data/agents";
import { getProjects } from "@/lib/data/projects";
import { AgentDetailClient } from "./AgentDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [agent, projects] = await Promise.all([getAgentWithStats(id), getProjects()]);

  if (!agent) notFound();

  // Get stock for this agent
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: stock } = await supabase
    .from("stock")
    .select("*, projects:project_id(name)")
    .eq("agent_id", id)
    .order("lot_number", { ascending: true });

  return <AgentDetailClient agent={agent} projects={projects} stock={stock || []} />;
}
