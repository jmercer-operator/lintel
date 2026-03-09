import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { AgentProjectsClient } from "./AgentProjectsClient";

export default async function AgentProjectsPage() {
  const projects = await getAgentProjects(PREVIEW_AGENT_ID);
  return <AgentProjectsClient projects={projects} />;
}
