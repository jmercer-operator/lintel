import { redirect } from "next/navigation";
import { getEffectiveAgentId } from "@/lib/auth/identity";
import { getAgentStock, getAgentClients } from "@/lib/data/agent-portal";
import { getAgents } from "@/lib/data/agents";
import { getActiveDealsByStockIds } from "@/lib/data/deals";
import { createDataClient } from "@/lib/supabase/data-client";
import { AgentLotsClient } from "./AgentLotsClient";

export default async function AgentLotsPage() {
  const agentId = await getEffectiveAgentId();
  if (!agentId) redirect("/login");
  const [stock, agentClientsRaw, agents] = await Promise.all([
    getAgentStock(agentId),
    getAgentClients(agentId),
    getAgents(),
  ]);

  // Build map of stock_id → has linked customer
  const supabase = await createDataClient();
  const stockIds = stock.map((s) => s.id);
  const stockCustomerMap: Record<string, boolean> = {};

  if (stockIds.length > 0) {
    const { data: links } = await supabase
      .from("contact_stock")
      .select("stock_id")
      .in("stock_id", stockIds);

    for (const link of links || []) {
      stockCustomerMap[link.stock_id] = true;
    }
  }

  // Active reservation holds (RLS restricts agents to their own deals).
  // Fails closed to an empty map when the deal spine isn't enabled.
  const dealsRes = await getActiveDealsByStockIds(stockIds);
  const holdExpiryMap: Record<string, string> = {};
  for (const [stockId, deal] of dealsRes.data) {
    if (deal.stage === "reservation") holdExpiryMap[stockId] = deal.hold_expires_at;
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
      holdExpiryMap={holdExpiryMap}
      agentContacts={agentContacts}
      agents={agents}
      agentId={agentId}
    />
  );
}
