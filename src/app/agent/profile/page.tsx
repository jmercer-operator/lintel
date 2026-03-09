import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgent } from "@/lib/data/agents";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { AgentProfileClient } from "./AgentProfileClient";

export default async function AgentProfilePage() {
  const agent = await getAgent(PREVIEW_AGENT_ID);
  const projects = await getAgentProjects(PREVIEW_AGENT_ID);

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-heading font-semibold">Agent not found</p>
      </div>
    );
  }

  return <AgentProfileClient agent={agent} projects={projects} />;
}
