import { createDataClient } from "@/lib/supabase/data-client";

/**
 * Deal spine reads + RPC wrappers (public.deals — see
 * supabase/migrations/*_lintel_deal_spine.sql).
 *
 * The deals table is the CANONICAL record for reservation/contract/deposit/
 * settlement state. It is written ONLY by SECURITY DEFINER RPCs; this module
 * never writes the table directly.
 *
 * FAILS CLOSED: when the migration has not been applied (local review only),
 * reads return { available: false } and RPC wrappers surface a clear
 * "not enabled" error — nothing is faked.
 */

import type {
  ConditionStatus,
  Deal,
  DealStage,
  DepositStatus,
  StaffDealInfo,
  TrustReceiptOption,
} from "@/lib/deal-types";

export type {
  ConditionStatus,
  Deal,
  DealCancelKind,
  DealStage,
  DepositStatus,
  StaffDealInfo,
  TrustReceiptOption,
} from "@/lib/deal-types";
export { DEAL_STAGE_LABELS } from "@/lib/deal-types";

/** Missing table (42P01 / PGRST205) or missing function (42883 / PGRST202). */
export function isDealSpineMissing(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42883" ||
    error.code === "PGRST202"
  ) {
    return true;
  }
  const msg = (error.message || "").toLowerCase();
  return (
    (msg.includes("deals") || msg.includes("lintel_deal")) &&
    (msg.includes("does not exist") || msg.includes("schema cache"))
  );
}

export interface DealResult<T> {
  /** False when the deal-spine migration has not been applied. */
  available: boolean;
  data: T;
}

/** Active (non-cancelled) deal for a lot, if any. Staff/agent surfaces. */
export async function getActiveDealForStock(
  stockId: string
): Promise<DealResult<Deal | null>> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("stock_id", stockId)
    .neq("stage", "cancelled")
    .maybeSingle();

  if (error) {
    if (isDealSpineMissing(error)) return { available: false, data: null };
    throw error;
  }
  return { available: true, data: (data as Deal) || null };
}

/** All deals (incl. cancelled history) for a lot, newest first. */
export async function getDealHistoryForStock(
  stockId: string
): Promise<DealResult<Deal[]>> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("stock_id", stockId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isDealSpineMissing(error)) return { available: false, data: [] };
    throw error;
  }
  return { available: true, data: (data || []) as Deal[] };
}

/** Active deals keyed by stock_id — for annotating lot tables. */
export async function getActiveDealsByStockIds(
  stockIds: string[]
): Promise<DealResult<Map<string, Deal>>> {
  if (stockIds.length === 0) return { available: true, data: new Map() };

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .in("stock_id", stockIds)
    .neq("stage", "cancelled");

  if (error) {
    if (isDealSpineMissing(error)) return { available: false, data: new Map() };
    throw error;
  }
  const map = new Map<string, Deal>();
  for (const deal of (data || []) as Deal[]) map.set(deal.stock_id, deal);
  return { available: true, data: map };
}

/**
 * Buyer-safe deal summary: ONLY the buyer's own progress dates/statuses.
 * Explicit column list — never amounts, agent commission, internal reasons,
 * or audit data. RLS additionally restricts rows to contact_id = caller.
 */
export interface BuyerDealSummary {
  id: string;
  stock_id: string;
  stage: DealStage;
  hold_expires_at: string;
  contract_issued_date: string | null;
  exchanged_date: string | null;
  cooling_off_ends_date: string | null;
  sunset_date: string | null;
  deposit_status: DepositStatus;
  deposit_due_date: string | null;
  deposit_paid_date: string | null;
  finance_status: ConditionStatus;
  finance_due_date: string | null;
  firb_status: ConditionStatus;
  firb_due_date: string | null;
  settlement_target_date: string | null;
  settlement_actual_date: string | null;
}

const BUYER_SAFE_COLUMNS =
  "id, stock_id, stage, hold_expires_at, contract_issued_date, exchanged_date, " +
  "cooling_off_ends_date, sunset_date, deposit_status, deposit_due_date, " +
  "deposit_paid_date, finance_status, finance_due_date, firb_status, " +
  "firb_due_date, settlement_target_date, settlement_actual_date";

export async function getBuyerDealSummaries(
  contactId: string
): Promise<DealResult<BuyerDealSummary[]>> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("deals")
    .select(BUYER_SAFE_COLUMNS)
    .eq("contact_id", contactId)
    .neq("stage", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    if (isDealSpineMissing(error)) return { available: false, data: [] };
    throw error;
  }
  return { available: true, data: (data || []) as unknown as BuyerDealSummary[] };
}

// ── Staff surface assembly ──

export interface StaffDealAnnotations {
  available: boolean;
  byStockId: Record<string, StaffDealInfo>;
}

/**
 * Active deals + buyer names + trust-receipt candidates for a set of lots.
 * Read-only; document references are stable row ids (never storage paths).
 */
export async function getStaffDealAnnotations(
  stockIds: string[]
): Promise<StaffDealAnnotations> {
  const dealsRes = await getActiveDealsByStockIds(stockIds);
  if (!dealsRes.available) return { available: false, byStockId: {} };
  if (dealsRes.data.size === 0) return { available: true, byStockId: {} };

  const deals = [...dealsRes.data.values()];
  const contactIds = [...new Set(deals.map((d) => d.contact_id))];

  const supabase = await createDataClient();
  const [contactsRes, docsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .in("id", contactIds),
    supabase
      .from("client_documents")
      .select("id, contact_id, file_name, document_type")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false }),
  ]);

  const nameMap = new Map(
    ((contactsRes.data || []) as Array<{ id: string; first_name: string; last_name: string }>).map(
      (c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]
    )
  );
  const docsByContact = new Map<string, TrustReceiptOption[]>();
  for (const doc of (docsRes.data || []) as Array<{
    id: string; contact_id: string; file_name: string; document_type: string;
  }>) {
    const list = docsByContact.get(doc.contact_id) || [];
    list.push({ id: doc.id, file_name: doc.file_name, document_type: doc.document_type });
    docsByContact.set(doc.contact_id, list);
  }

  const byStockId: Record<string, StaffDealInfo> = {};
  for (const deal of deals) {
    byStockId[deal.stock_id] = {
      deal,
      buyerName: nameMap.get(deal.contact_id) || "Unknown buyer",
      trustReceiptOptions: docsByContact.get(deal.contact_id) || [],
    };
  }
  return { available: true, byStockId };
}

// ── RPC wrappers (SECURITY DEFINER functions enforce authorization in-DB) ──

export interface DealRpcOutcome {
  ok: boolean;
  /** True when the deal-spine migration is not applied (feature disabled). */
  notEnabled?: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

function rpcOutcome(error: { code?: string; message?: string } | null, data?: unknown): DealRpcOutcome {
  if (!error) return { ok: true, data: (data as Record<string, unknown>) ?? undefined };
  if (isDealSpineMissing(error)) {
    return {
      ok: false,
      notEnabled: true,
      error: "Deal management is not enabled in this environment yet.",
    };
  }
  return { ok: false, error: error.message || "Deal operation failed" };
}

/** Atomic reservation hold. DB enforces org/agent ownership + one active hold. */
export async function rpcPlaceHold(params: {
  stockId: string;
  contactId: string;
  holdHours?: number;
  actingAgentId?: string | null;
}): Promise<DealRpcOutcome> {
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("lintel_deal_place_hold", {
    target_stock_id: params.stockId,
    target_contact_id: params.contactId,
    hold_hours: params.holdHours ?? 72,
    acting_agent_id: params.actingAgentId ?? null,
  });
  return rpcOutcome(error, data);
}

export async function rpcReleaseHold(
  dealId: string,
  reason?: string | null
): Promise<DealRpcOutcome> {
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("lintel_deal_release_hold", {
    target_deal_id: dealId,
    release_reason: reason ?? null,
  });
  return rpcOutcome(error, data);
}

export async function rpcAdvanceStage(
  dealId: string,
  targetStage: Exclude<DealStage, "reservation">,
  reason?: string | null
): Promise<DealRpcOutcome> {
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("lintel_deal_advance_stage", {
    target_deal_id: dealId,
    target_stage: targetStage,
    reason: reason ?? null,
  });
  return rpcOutcome(error, data);
}

export async function rpcStaffUpdateDeal(
  dealId: string,
  updates: Record<string, unknown>
): Promise<DealRpcOutcome> {
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("lintel_deal_staff_update", {
    target_deal_id: dealId,
    updates,
  });
  return rpcOutcome(error, data);
}
