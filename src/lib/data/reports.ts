import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioStats,
  ProjectSalesBreakdown,
  AgentPerformanceRow,
  CommissionSummary,
  SettlementRow,
  HeatmapProject,
  SettlementStatus,
  StockStatus,
} from "@/lib/types";

const SOLD_STATUSES: StockStatus[] = ["Under Contract", "Exchanged", "Settled"];

export async function getPortfolioStats(): Promise<PortfolioStats> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .select("price, status, reservation_date");

  if (error) throw error;
  if (!stock || stock.length === 0) {
    return {
      totalValue: 0,
      soldValue: 0,
      availableValue: 0,
      sellThroughRate: 0,
      averagePrice: 0,
      salesVelocity: 0,
      totalLots: 0,
      soldLots: 0,
    };
  }

  const totalLots = stock.length;
  const totalValue = stock.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const soldItems = stock.filter((s) => SOLD_STATUSES.includes(s.status as StockStatus));
  const soldValue = soldItems.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const availableItems = stock.filter((s) => s.status === "Available");
  const availableValue = availableItems.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const soldLots = soldItems.length;
  const sellThroughRate = totalLots > 0 ? (soldLots / totalLots) * 100 : 0;
  const averagePrice = totalLots > 0 ? totalValue / totalLots : 0;

  // Sales velocity: settled count / months since earliest reservation
  const settledCount = stock.filter((s) => s.status === "Settled").length;
  const reservationDates = stock
    .filter((s) => s.reservation_date)
    .map((s) => new Date(s.reservation_date as string).getTime());

  let salesVelocity = 0;
  if (reservationDates.length > 0 && settledCount > 0) {
    const earliest = Math.min(...reservationDates);
    const monthsElapsed = Math.max(
      1,
      (Date.now() - earliest) / (1000 * 60 * 60 * 24 * 30)
    );
    salesVelocity = settledCount / monthsElapsed;
  }

  return {
    totalValue,
    soldValue,
    availableValue,
    sellThroughRate,
    averagePrice,
    salesVelocity,
    totalLots,
    soldLots,
  };
}

export async function getProjectSalesBreakdown(): Promise<ProjectSalesBreakdown[]> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .select("project_id, price, status, projects:project_id(name)");

  if (error) throw error;
  if (!stock) return [];

  const projectMap = new Map<string, ProjectSalesBreakdown>();

  for (const item of stock) {
    const pid = item.project_id as string;
    const projects = item.projects as unknown as { name: string } | null;
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        project_id: pid,
        project_name: projects?.name || "Unknown",
        total: 0,
        available: 0,
        eoi: 0,
        under_contract: 0,
        exchanged: 0,
        settled: 0,
        revenue: 0,
        sold_value: 0,
        sell_through: 0,
      });
    }
    const p = projectMap.get(pid)!;
    p.total++;
    const price = Number(item.price) || 0;
    // Revenue = total value of ALL stock in the project
    p.revenue += price;
    switch (item.status) {
      case "Available":
        p.available++;
        break;
      case "EOI":
        p.eoi++;
        break;
      case "Under Contract":
        p.under_contract++;
        break;
      case "Exchanged":
        p.exchanged++;
        // Sold Value = only "Exchanged" status
        p.sold_value += price;
        break;
      case "Settled":
        p.settled++;
        break;
    }
  }

  for (const p of projectMap.values()) {
    const sold = p.under_contract + p.exchanged + p.settled;
    p.sell_through = p.total > 0 ? (sold / p.total) * 100 : 0;
  }

  return Array.from(projectMap.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getAgentPerformance(): Promise<AgentPerformanceRow[]> {
  const supabase = await createClient();

  // Get all stock with agent info
  const { data: stock, error: stockErr } = await supabase
    .from("stock")
    .select("id, project_id, price, status, agent_id, agents:agent_id(first_name, last_name, agency)")
    .not("agent_id", "is", null);

  if (stockErr) throw stockErr;
  if (!stock) return [];

  // Get agent_projects commission rates
  const { data: agentProjects, error: apErr } = await supabase
    .from("agent_projects")
    .select("agent_id, project_id, commission_type, commission_rate");

  if (apErr) throw apErr;

  // Build commission lookup: agent_id+project_id → rate
  const commissionMap = new Map<string, { type: string; rate: number }>();
  for (const ap of agentProjects || []) {
    commissionMap.set(`${ap.agent_id}_${ap.project_id}`, {
      type: ap.commission_type || "percentage",
      rate: Number(ap.commission_rate) || 0,
    });
  }

  const agentMap = new Map<string, AgentPerformanceRow>();

  for (const item of stock) {
    const agentId = item.agent_id as string;
    const agents = item.agents as unknown as { first_name: string; last_name: string; agency: string | null } | null;

    if (!SOLD_STATUSES.includes(item.status as StockStatus)) continue;

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        agent_id: agentId,
        agent_name: agents ? `${agents.first_name} ${agents.last_name}` : "Unknown",
        agency: agents?.agency || null,
        total_sales: 0,
        revenue: 0,
        avg_sale_price: 0,
        commission_due: 0,
      });
    }

    const a = agentMap.get(agentId)!;
    const price = Number(item.price) || 0;
    a.total_sales++;
    a.revenue += price;

    // Calculate commission
    const comm = commissionMap.get(`${agentId}_${item.project_id}`);
    if (comm) {
      if (comm.type === "percentage") {
        a.commission_due += price * (comm.rate / 100);
      } else {
        a.commission_due += comm.rate;
      }
    }
  }

  for (const a of agentMap.values()) {
    a.avg_sale_price = a.total_sales > 0 ? a.revenue / a.total_sales : 0;
  }

  return Array.from(agentMap.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  const supabase = await createClient();

  const { data: stock, error: stockErr } = await supabase
    .from("stock")
    .select("project_id, price, status, agent_id")
    .not("agent_id", "is", null)
    .in("status", SOLD_STATUSES);

  if (stockErr) throw stockErr;

  const { data: agentProjects, error: apErr } = await supabase
    .from("agent_projects")
    .select("agent_id, project_id, commission_type, commission_rate");

  if (apErr) throw apErr;

  const commissionMap = new Map<string, { type: string; rate: number }>();
  for (const ap of agentProjects || []) {
    commissionMap.set(`${ap.agent_id}_${ap.project_id}`, {
      type: ap.commission_type || "percentage",
      rate: Number(ap.commission_rate) || 0,
    });
  }

  let totalCommissionsDue = 0;
  let commissionsOnSettled = 0;
  let commissionsPending = 0;

  for (const item of stock || []) {
    const price = Number(item.price) || 0;
    const comm = commissionMap.get(`${item.agent_id}_${item.project_id}`);
    if (!comm) continue;

    const commAmount = comm.type === "percentage" ? price * (comm.rate / 100) : comm.rate;
    totalCommissionsDue += commAmount;

    if (item.status === "Settled") {
      commissionsOnSettled += commAmount;
    } else {
      commissionsPending += commAmount;
    }
  }

  return { totalCommissionsDue, commissionsOnSettled, commissionsPending };
}

export async function getSettlementPipeline(): Promise<SettlementRow[]> {
  const supabase = await createClient();

  // Get exchanged stock with settlement dates
  const { data: stock, error } = await supabase
    .from("stock")
    .select(
      "id, lot_number, project_id, price, contract_exchanged_date, settlement_date, settlement_status, projects:project_id(name)"
    )
    .eq("status", "Exchanged")
    .not("settlement_date", "is", null)
    .order("settlement_date", { ascending: true });

  if (error) throw error;
  if (!stock) return [];

  // Get customer names for these stock items
  const stockIds = stock.map((s) => s.id);
  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("stock_id, contacts:contact_id(first_name, last_name)")
    .in("stock_id", stockIds);

  const customerMap = new Map<string, string>();
  for (const cs of contactStock || []) {
    const contacts = cs.contacts as unknown as { first_name: string; last_name: string } | null;
    if (contacts) {
      customerMap.set(cs.stock_id as string, `${contacts.first_name} ${contacts.last_name}`);
    }
  }

  const now = new Date();
  return stock.map((s) => {
    const projects = s.projects as unknown as { name: string } | null;
    const settlementDate = s.settlement_date ? new Date(s.settlement_date as string) : null;
    const daysUntil = settlementDate
      ? Math.ceil((settlementDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      stock_id: s.id as string,
      lot_number: s.lot_number as string,
      project_name: projects?.name || "Unknown",
      customer_name: customerMap.get(s.id as string) || null,
      exchange_date: (s.contract_exchanged_date as string) || null,
      settlement_date: (s.settlement_date as string) || null,
      settlement_status: (s.settlement_status as SettlementStatus) || "not_applicable",
      days_until: daysUntil,
      price: Number(s.price) || null,
    };
  });
}

export async function getSalesHeatmapData(): Promise<HeatmapProject[]> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .select("id, lot_number, status, level, bedrooms, price, project_id, projects:project_id(name)")
    .order("lot_number", { ascending: true });

  if (error) throw error;
  if (!stock) return [];

  const projectMap = new Map<string, HeatmapProject>();

  for (const item of stock) {
    const pid = item.project_id as string;
    const projects = item.projects as unknown as { name: string } | null;
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        project_id: pid,
        project_name: projects?.name || "Unknown",
        lots: [],
      });
    }
    projectMap.get(pid)!.lots.push({
      id: item.id as string,
      lot_number: item.lot_number as string,
      status: item.status as StockStatus,
      level: item.level as number | null,
      bedrooms: item.bedrooms as number,
      price: Number(item.price) || null,
    });
  }

  return Array.from(projectMap.values());
}
