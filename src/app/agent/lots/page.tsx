import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentStock, getAgentClients } from "@/lib/data/agent-portal";
import { getAgents } from "@/lib/data/agents";
import { createClient } from "@/lib/supabase/server";
import { AgentLotsClient } from "./AgentLotsClient";

export default async function AgentLotsPage() {
  const [stock, agentClientsRaw, agents] = await Promise.all([
    getAgentStock(PREVIEW_AGENT_ID),
    getAgentClients(PREVIEW_AGENT_ID),
    getAgents(),
  ]);

  // Build map of stock_id → has linked customer
  const supabase = await createClient();
  const stockIds = stock.map((s) => s.id);
  let stockCustomerMap: Record<string, boolean> = {};

  if (stockIds.length > 0) {
    const { data: links } = await supabase
      .from("contact_stock")
      .select("stock_id")
      .in("stock_id", stockIds);

    for (const link of links || []) {
      stockCustomerMap[link.stock_id] = true;
    }
  }

  // Simplify agent contacts for the modal
  const agentContacts = agentClientsRaw.map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    classification: c.classification,
  }));

  return (
    <AgentLotsClient
      stock={stock}
      stockCustomerMap={stockCustomerMap}
      agentContacts={agentContacts}
      agents={agents}
      agentId={PREVIEW_AGENT_ID}
    />
  );
}
