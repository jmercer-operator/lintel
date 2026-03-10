"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectLogo } from "@/components/ProjectLogo";
import { AgentLinkCustomerModal } from "@/components/AgentLinkCustomerModal";
import { useRouter } from "next/navigation";
import type { StockItem, StockStatus, Agent } from "@/lib/types";
import { formatPrice, formatArea, ALL_STATUSES } from "@/lib/types";

// Agents cannot set status to "Settled"
const AGENT_ALLOWED_STATUSES: StockStatus[] = ["Available", "EOI", "Under Contract", "Exchanged"];

interface LotWithCommission extends StockItem {
  project_name: string;
  project_logo_url: string | null;
}

interface AgentContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  classification: string;
}

interface Props {
  stock: LotWithCommission[];
  stockCustomerMap: Record<string, boolean>;
  agentContacts: AgentContact[];
  agents: Agent[];
  agentId: string;
}

export function AgentLotsClient({ stock, stockCustomerMap, agentContacts, agents, agentId }: Props) {
  const [filter, setFilter] = useState<string>("All");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Link customer modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalLot, setLinkModalLot] = useState<LotWithCommission | null>(null);

  // Group by project
  const grouped: Record<string, { projectName: string; projectLogoUrl: string | null; lots: LotWithCommission[] }> = {};
  for (const lot of stock) {
    if (!grouped[lot.project_id]) {
      grouped[lot.project_id] = { projectName: lot.project_name, projectLogoUrl: lot.project_logo_url, lots: [] };
    }
    grouped[lot.project_id].lots.push(lot);
  }

  const filteredGroups = Object.entries(grouped).map(([projectId, group]) => ({
    projectId,
    projectName: group.projectName,
    projectLogoUrl: group.projectLogoUrl,
    lots: filter === "All" ? group.lots : group.lots.filter((l) => l.status === filter),
  })).filter((g) => g.lots.length > 0);

  function handleStatusSelect(lotId: string, newStatus: string, currentStatus: string) {
    const lot = stock.find((l) => l.id === lotId);

    // If changing to any different status (except back to Available), show link customer modal
    if (lot && newStatus !== currentStatus && newStatus !== "Available") {
      setPendingChanges((prev) => ({ ...prev, [lotId]: newStatus }));
      // Set lot first, then open modal in next tick to avoid React batching issues
      setLinkModalLot(lot);
      setTimeout(() => setLinkModalOpen(true), 0);
      return;
    }

    if (newStatus === currentStatus) {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[lotId];
        return next;
      });
    } else {
      setPendingChanges((prev) => ({ ...prev, [lotId]: newStatus }));
    }
    setErrorMsg(null);
  }

  async function handleSave(lotId: string) {
    const newStatus = pendingChanges[lotId];
    if (!newStatus) return;

    setSavingId(lotId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/agent/update-lot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lotId, status: newStatus }),
      });
      if (res.ok) {
        setSavedId(lotId);
        setPendingChanges((prev) => {
          const next = { ...prev };
          delete next[lotId];
          return next;
        });
        setTimeout(() => setSavedId(null), 2000);
        startTransition(() => {
          router.refresh();
        });
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to update status");
      }
    } catch {
      setErrorMsg("Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  function formatCommission(rate: number | null, type: string | null): string {
    if (rate === null || rate === undefined) return "—";
    if (type === "flat") return formatPrice(rate);
    return `${rate}%`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Lots</h1>
        <p className="text-secondary text-sm mt-1">{stock.length} lot{stock.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} project{Object.keys(grouped).length !== 1 ? "s" : ""}</p>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">
          {errorMsg}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["All", ...ALL_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filter === s
                ? "bg-emerald-primary text-white"
                : "bg-bg-alt text-secondary hover:text-heading border border-border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grouped lots */}
      {filteredGroups.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-heading font-semibold">No lots found</p>
            <p className="text-sm text-muted mt-1">Try adjusting your filter</p>
          </div>
        </Card>
      ) : (
        filteredGroups.map((group) => (
          <div key={group.projectId}>
            <div className="flex items-center gap-2 mb-3">
              <ProjectLogo logoUrl={group.projectLogoUrl} name={group.projectName} size={24} />
              <h2 className="text-base font-semibold text-heading">{group.projectName}</h2>
            </div>
            <Card padding="sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Lot</th>
                      <th className="text-center py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Bed</th>
                      <th className="text-center py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Bath</th>
                      <th className="text-center py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Car</th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">m² Int</th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">m² Ext</th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Price</th>
                      <th className="text-left py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Commission</th>
                      <th className="text-center py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lots.map((lot) => {
                      const hasPending = pendingChanges[lot.id] !== undefined;
                      const displayStatus = pendingChanges[lot.id] || lot.status;
                      return (
                        <tr key={lot.id} className="border-b border-border last:border-0 hover:bg-bg-alt/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-semibold text-heading">{lot.lot_number}</td>
                          <td className="py-3 px-3 text-center text-secondary">{lot.bedrooms}</td>
                          <td className="py-3 px-3 text-center text-secondary">{lot.bathrooms}</td>
                          <td className="py-3 px-3 text-center text-secondary">{lot.car_spaces}</td>
                          <td className="py-3 px-3 text-right text-secondary font-mono">{formatArea(lot.internal_area)}</td>
                          <td className="py-3 px-3 text-right text-secondary font-mono">{formatArea(lot.external_area)}</td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-heading">{formatPrice(lot.price)}</td>
                          <td className="py-3 px-3">
                            <select
                              value={displayStatus}
                              onChange={(e) => handleStatusSelect(lot.id, e.target.value, lot.status)}
                              disabled={savingId === lot.id || lot.status === "Settled"}
                              className="text-xs font-semibold rounded-full px-2 py-1 border border-border bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {AGENT_ALLOWED_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {lot.status === "Settled" && (
                                <option value="Settled">Settled</option>
                              )}
                            </select>
                          </td>
                          <td className="py-3 px-3 text-right text-secondary text-xs font-mono opacity-70">
                            {formatCommission(lot.commission_rate, lot.commission_type)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {hasPending && (
                              <button
                                onClick={() => handleSave(lot.id)}
                                disabled={savingId === lot.id}
                                className="px-3 py-1 text-xs font-semibold rounded-[var(--radius-button)] bg-emerald-primary text-white hover:bg-emerald-dark transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {savingId === lot.id ? "…" : "Save"}
                              </button>
                            )}
                            {savedId === lot.id && !hasPending && (
                              <svg className="text-emerald-primary mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))
      )}

      {/* Link Customer Modal — always mounted to avoid React re-mount issues */}
      <AgentLinkCustomerModal
        open={linkModalOpen}
        onClose={() => {
          setLinkModalOpen(false);
          // Clear the pending change for this lot since modal was dismissed
          if (linkModalLot) {
            setPendingChanges((prev) => {
              const next = { ...prev };
              delete next[linkModalLot.id];
              return next;
            });
          }
        }}
        lotId={linkModalLot?.id || ""}
        lotNumber={linkModalLot?.lot_number || ""}
        projectId={linkModalLot?.project_id || ""}
        agents={agents}
        agentContacts={agentContacts}
        agentId={agentId}
      />
    </div>
  );
}
