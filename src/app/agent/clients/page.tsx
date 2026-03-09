import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentClients } from "@/lib/data/agent-portal";
import { AgentClientsClient } from "./AgentClientsClient";

export default async function AgentClientsPage() {
  const clients = await getAgentClients(PREVIEW_AGENT_ID);
  return <AgentClientsClient clients={clients} />;
}
