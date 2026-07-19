"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import {
  advanceDealStageAction,
  placeDealHoldAction,
  releaseDealHoldAction,
  updateDealDetailsAction,
} from "@/lib/actions";
import {
  DEAL_STAGE_LABELS,
  type Deal,
  type StaffDealInfo,
} from "@/lib/deal-types";

interface ContactOption {
  id: string;
  name: string;
}

interface Props {
  stockId: string;
  projectId: string;
  lotNumber: string;
  stockStatus: string;
  /** False when the deal-spine migration is not applied in this environment. */
  dealsAvailable: boolean;
  dealInfo: StaffDealInfo | null;
  contacts: ContactOption[];
}

const STAGE_ORDER: Deal["stage"][] = [
  "reservation",
  "contract_issued",
  "exchanged",
  "settled",
];

const NEXT_STAGE: Partial<Record<Deal["stage"], { stage: string; label: string }>> = {
  reservation: { stage: "contract_issued", label: "Issue Contract" },
  contract_issued: { stage: "exchanged", label: "Mark Exchanged" },
  exchanged: { stage: "settled", label: "Mark Settled" },
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const inputClass =
  "w-full px-3 py-2 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-secondary mb-1";
const sectionClass = "border border-border rounded-[10px] p-4 space-y-3";

export function DealPanel({
  stockId,
  projectId,
  lotNumber,
  stockStatus,
  dealsAvailable,
  dealInfo,
  contacts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [holdContactId, setHoldContactId] = useState("");
  const [holdHours, setHoldHours] = useState("72");

  if (!dealsAvailable) {
    return (
      <div className="px-4 py-6 text-center border border-dashed border-border rounded-[10px]">
        <p className="text-sm font-semibold text-heading mb-1">Deal management not enabled</p>
        <p className="text-xs text-secondary">
          The deal-spine database migration has not been applied in this
          environment. Reservation holds, contract tracking and deposits are
          unavailable until it is.
        </p>
      </div>
    );
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else {
        setNotice(successMsg);
        router.refresh();
      }
    });
  }

  // ── No active deal ──
  if (!dealInfo) {
    return (
      <div className="space-y-4">
        {error && <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>}
        {notice && <div className="px-3 py-2 rounded-[var(--radius-input)] bg-emerald-primary/10 text-emerald-primary text-sm">{notice}</div>}

        <p className="text-sm text-secondary">No active deal on Lot {lotNumber}.</p>

        {stockStatus === "Available" ? (
          <div className={sectionClass}>
            <p className="text-sm font-semibold text-heading">Place Reservation Hold</p>
            <div>
              <label className={labelClass}>Buyer</label>
              <select
                value={holdContactId}
                onChange={(e) => setHoldContactId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hold Duration (hours)</label>
              <input
                type="number"
                min={1}
                max={336}
                value={holdHours}
                onChange={(e) => setHoldHours(e.target.value)}
                className={inputClass}
              />
            </div>
            <Button
              disabled={!holdContactId || isPending}
              onClick={() =>
                run(async () => {
                  const fd = new FormData();
                  fd.set("stock_id", stockId);
                  fd.set("project_id", projectId);
                  fd.set("contact_id", holdContactId);
                  fd.set("hold_hours", holdHours || "72");
                  return placeDealHoldAction(fd);
                }, "Reservation hold placed — lot moved to EOI.")
              }
            >
              {isPending ? "Placing…" : "Place Hold"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-secondary">
            Holds can only be placed on Available lots.
          </p>
        )}
      </div>
    );
  }

  const { deal, buyerName, trustReceiptOptions } = dealInfo;
  const next = NEXT_STAGE[deal.stage];
  const holdExpired =
    deal.stage === "reservation" && new Date(deal.hold_expires_at) < new Date();

  return (
    <div className="space-y-4">
      {error && <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>}
      {notice && <div className="px-3 py-2 rounded-[var(--radius-input)] bg-emerald-primary/10 text-emerald-primary text-sm">{notice}</div>}

      {/* Stage progress */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-heading">
            {DEAL_STAGE_LABELS[deal.stage]}
          </p>
          <p className="text-xs text-secondary">Buyer: <span className="font-semibold text-heading">{buyerName}</span></p>
        </div>
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((stage, i) => {
            const currentIdx = STAGE_ORDER.indexOf(deal.stage);
            const done = currentIdx >= i;
            return (
              <div key={stage} className="flex-1 flex items-center gap-1">
                <div
                  className={`h-1.5 flex-1 rounded-full ${done ? "bg-emerald-primary" : "bg-border"}`}
                  title={DEAL_STAGE_LABELS[stage]}
                />
              </div>
            );
          })}
        </div>
        {deal.stage === "reservation" && (
          <p className={`text-xs ${holdExpired ? "text-error font-semibold" : "text-secondary"}`}>
            {holdExpired ? "Hold expired " : "Hold expires "}
            {formatDateTime(deal.hold_expires_at)}
          </p>
        )}

        {/* Stage actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {next && (
            <Button
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const fd = new FormData();
                  fd.set("deal_id", deal.id);
                  fd.set("project_id", projectId);
                  fd.set("target_stage", next.stage);
                  return advanceDealStageAction(fd);
                }, `Deal moved to ${next.stage.replace(/_/g, " ")}.`)
              }
            >
              {next.label}
            </Button>
          )}
          {deal.stage === "reservation" && (
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const fd = new FormData();
                  fd.set("deal_id", deal.id);
                  fd.set("project_id", projectId);
                  return releaseDealHoldAction(fd);
                }, "Hold released — lot returned to Available.")
              }
            >
              Release Hold
            </Button>
          )}
          {deal.stage !== "settled" && deal.stage !== "reservation" && (
            <Button variant="secondary" disabled={isPending} onClick={() => setShowCancel((v) => !v)}>
              Cancel Deal…
            </Button>
          )}
        </div>

        {showCancel && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label className={labelClass}>Cancellation reason (required)</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Finance declined, buyer withdrew"
              className={inputClass}
            />
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || isPending}
              onClick={() =>
                run(async () => {
                  const fd = new FormData();
                  fd.set("deal_id", deal.id);
                  fd.set("project_id", projectId);
                  fd.set("target_stage", "cancelled");
                  fd.set("reason", cancelReason.trim());
                  return advanceDealStageAction(fd);
                }, "Deal cancelled — lot returned to Available.")
              }
            >
              Confirm Cancellation
            </Button>
          </div>
        )}
      </div>

      {/* Progressive detail form */}
      <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("deal_id", deal.id);
            fd.set("project_id", projectId);
            run(async () => updateDealDetailsAction(fd), "Deal details saved.");
          }}
          className="space-y-4"
        >
          <div className={sectionClass}>
            <p className="text-sm font-semibold text-heading">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Contract Issued</label>
                <input type="date" name="contract_issued_date" defaultValue={deal.contract_issued_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Exchanged</label>
                <input type="date" name="exchanged_date" defaultValue={deal.exchanged_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Cooling-off Ends</label>
                <input type="date" name="cooling_off_ends_date" defaultValue={deal.cooling_off_ends_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sunset Date</label>
                <input type="date" name="sunset_date" defaultValue={deal.sunset_date || ""} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="text-sm font-semibold text-heading">Deposit</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Amount (AUD)</label>
                <input type="number" step="0.01" min="0" name="deposit_amount" defaultValue={deal.deposit_amount ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select name="deposit_status" defaultValue={deal.deposit_status} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Due</label>
                <input type="date" name="deposit_due_date" defaultValue={deal.deposit_due_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Paid</label>
                <input type="date" name="deposit_paid_date" defaultValue={deal.deposit_paid_date || ""} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Trust Receipt Document</label>
              <select
                name="trust_receipt_document_id"
                defaultValue={deal.trust_receipt_document_id || ""}
                className={inputClass}
              >
                <option value="">None</option>
                {trustReceiptOptions.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.file_name} ({doc.document_type})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-secondary mt-1">
                Links the buyer&apos;s uploaded trust receipt to this deal.
              </p>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="text-sm font-semibold text-heading">Conditions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Finance</label>
                <select name="finance_status" defaultValue={deal.finance_status} className={inputClass}>
                  <option value="not_required">Not Required</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Finance Due</label>
                <input type="date" name="finance_due_date" defaultValue={deal.finance_due_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>FIRB</label>
                <select name="firb_status" defaultValue={deal.firb_status} className={inputClass}>
                  <option value="not_required">Not Required</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>FIRB Due</label>
                <input type="date" name="firb_due_date" defaultValue={deal.firb_due_date || ""} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="text-sm font-semibold text-heading">Settlement</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Target</label>
                <input type="date" name="settlement_target_date" defaultValue={deal.settlement_target_date || ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Actual</label>
                <input type="date" name="settlement_actual_date" defaultValue={deal.settlement_actual_date || ""} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Deal Details"}
            </Button>
          </div>
        </form>
    </div>
  );
}
