import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentStock } from "@/lib/data/agent-portal";
import { AgentLotsClient } from "./AgentLotsClient";

export default async function AgentLotsPage() {
  const stock = await getAgentStock(PREVIEW_AGENT_ID);
  return <AgentLotsClient stock={stock} />;
}
