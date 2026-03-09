import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentClients } from "@/lib/data/agent-portal";
import { getAgents } from "@/lib/data/agents";
import { AgentClientsClient } from "./AgentClientsClient";

export default async function AgentClientsPage() {
  const clients = await getAgentClients(PREVIEW_AGENT_ID);
  const agents = await getAgents();
  return <AgentClientsClient clients={clients} agents={agents} agentId={PREVIEW_AGENT_ID} />;
}
