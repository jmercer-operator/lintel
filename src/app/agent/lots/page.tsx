import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getAgentStock } from "@/lib/data/agent-portal";
import { createClient } from "@/lib/supabase/server";
import { AgentLotsClient } from "./AgentLotsClient";

export default async function AgentLotsPage() {
  const stock = await getAgentStock(PREVIEW_AGENT_ID);

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

  return <AgentLotsClient stock={stock} stockCustomerMap={stockCustomerMap} />;
}
