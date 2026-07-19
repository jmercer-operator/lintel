/**
 * Client-safe deal spine types and labels — no server-only imports.
 * Server-side reads/RPCs live in src/lib/data/deals.ts.
 */

export type DealStage =
  | "reservation"
  | "contract_issued"
  | "exchanged"
  | "settled"
  | "cancelled";

export type DealCancelKind = "released" | "expired" | "fell_over";
export type DepositStatus = "pending" | "paid" | "refunded";
export type ConditionStatus = "not_required" | "pending" | "approved" | "declined";

export interface Deal {
  id: string;
  org_id: string;
  project_id: string;
  stock_id: string;
  contact_id: string;
  agent_id: string | null;
  stage: DealStage;
  hold_placed_at: string;
  hold_expires_at: string;
  hold_released_at: string | null;
  cancelled_at: string | null;
  cancel_kind: DealCancelKind | null;
  cancel_reason: string | null;
  contract_issued_date: string | null;
  exchanged_date: string | null;
  sunset_date: string | null;
  cooling_off_ends_date: string | null;
  deposit_amount: number | null;
  deposit_due_date: string | null;
  deposit_paid_date: string | null;
  deposit_status: DepositStatus;
  trust_receipt_document_id: string | null;
  finance_status: ConditionStatus;
  finance_due_date: string | null;
  firb_status: ConditionStatus;
  firb_due_date: string | null;
  settlement_target_date: string | null;
  settlement_actual_date: string | null;
  created_at: string;
  updated_at: string;
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  reservation: "Reserved",
  contract_issued: "Contract Issued",
  exchanged: "Exchanged",
  settled: "Settled",
  cancelled: "Cancelled",
};

export interface TrustReceiptOption {
  id: string;
  file_name: string;
  document_type: string;
}

export interface StaffDealInfo {
  deal: Deal;
  buyerName: string;
  /** Buyer's client documents usable as the trust receipt reference. */
  trustReceiptOptions: TrustReceiptOption[];
}
