import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgent, getAgents } from "@/lib/data/agents";
import { getAgentStockStats, getAgentClients, getAgentStock, getAgentProjects } from "@/lib/data/agent-portal";
import { getPipelineStats, getPipelineContacts } from "@/lib/data/pipeline";
import { getFollowUps } from "@/lib/data/follow-ups";
import { AgentDashboardClient } from "./AgentDashboardClient";

export default async function AgentDashboardPage() {
  const agent = await getAgent(PREVIEW_AGENT_ID);
  const [stats, clients, stock, agents, pipelineStats, pipelineContacts, followUps, agentProjects] = await Promise.all([
    getAgentStockStats(PREVIEW_AGENT_ID),
    getAgentClients(PREVIEW_AGENT_ID),
    getAgentStock(PREVIEW_AGENT_ID),
    getAgents(),
    getPipelineStats(),
    getPipelineContacts(undefined, PREVIEW_AGENT_ID),
    getFollowUps(PREVIEW_AGENT_ID),
    getAgentProjects(PREVIEW_AGENT_ID),
  ]);

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
      pipelineStats={pipelineStats}
      pipelineContacts={pipelineContacts}
      followUps={followUps}
      agentProjects={agentProjects.map(p => ({ id: p.id, name: p.name }))}
      agentContacts={clients.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone }))}
    />
  );
}
