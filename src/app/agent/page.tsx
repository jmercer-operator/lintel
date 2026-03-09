import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgent, getAgents } from "@/lib/data/agents";
import { getAgentStockStats, getAgentClients, getAgentStock } from "@/lib/data/agent-portal";
import { AgentDashboardClient } from "./AgentDashboardClient";

export default async function AgentDashboardPage() {
  const agent = await getAgent(PREVIEW_AGENT_ID);
  const stats = await getAgentStockStats(PREVIEW_AGENT_ID);
  const clients = await getAgentClients(PREVIEW_AGENT_ID);
  const stock = await getAgentStock(PREVIEW_AGENT_ID);
  const agents = await getAgents();

  // Recent activity: last 5 lots updated
  const recentLots = [...stock]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <AgentDashboardClient
      agentName={agent?.first_name || "Agent"}
      stats={stats}
      clientCount={clients.length}
      recentLots={recentLots}
      agents={agents}
      agentId={PREVIEW_AGENT_ID}
    />
  );
}
