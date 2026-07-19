import { redirect } from "next/navigation";
import { getEffectiveAgentId } from "@/lib/auth/identity";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { AgentProjectsClient } from "./AgentProjectsClient";

export default async function AgentProjectsPage() {
  const agentId = await getEffectiveAgentId();
  if (!agentId) redirect("/login");
  const projects = await getAgentProjects(agentId);
  return <AgentProjectsClient projects={projects} />;
}
