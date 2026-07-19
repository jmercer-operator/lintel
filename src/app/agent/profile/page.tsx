import { redirect } from "next/navigation";
import { getEffectiveAgentId } from "@/lib/auth/identity";
import { getAgent } from "@/lib/data/agents";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { AgentProfileClient } from "./AgentProfileClient";

export default async function AgentProfilePage() {
  const agentId = await getEffectiveAgentId();
  if (!agentId) redirect("/login");
  const agent = await getAgent(agentId);
  const projects = await getAgentProjects(agentId);

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-heading font-semibold">Agent not found</p>
      </div>
    );
  }

  return <AgentProfileClient agent={agent} projects={projects} />;
}
