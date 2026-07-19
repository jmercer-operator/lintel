import { redirect } from "next/navigation";
import { getEffectiveAgentId } from "@/lib/auth/identity";
import { getAgentClients } from "@/lib/data/agent-portal";
import { getAgents } from "@/lib/data/agents";
import { AgentClientsClient } from "./AgentClientsClient";

export default async function AgentClientsPage() {
  const agentId = await getEffectiveAgentId();
  if (!agentId) redirect("/login");
  const clients = await getAgentClients(agentId);
  const agents = await getAgents();
  return <AgentClientsClient clients={clients} agents={agents} agentId={agentId} />;
}
