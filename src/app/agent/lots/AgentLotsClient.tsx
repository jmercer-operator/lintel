"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { useRouter } from "next/navigation";
import type { StockItem, StockStatus } from "@/lib/types";
import { formatPrice, formatArea, ALL_STATUSES } from "@/lib/types";

// Agents cannot set status to "Settled"
const AGENT_ALLOWED_STATUSES: StockStatus[] = ["Available", "EOI", "Under Contract", "Exchanged"];

interface Props {
  stock: (StockItem & { project_name: string })[];
}

export function AgentLotsClient({ stock }: Props) {
  const [filter, setFilter] = useState<string>("All");
  const [changingId, setChangingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Group by project
  const grouped: Record<string, { projectName: string; lots: (StockItem & { project_name: string })[] }> = {};
  for (const lot of stock) {
    if (!grouped[lot.project_id]) {
      grouped[lot.project_id] = { projectName: lot.project_name, lots: [] };
    }
    grouped[lot.project_id].lots.push(lot);
  }

  const filteredGroups = Object.entries(grouped).map(([projectId, group]) => ({
    projectId,
    projectName: group.projectName,
    lots: filter === "All" ? group.lots : group.lots.filter((l) => l.status === filter),
  })).filter((g) => g.lots.length > 0);

  async function handleStatusChange(lotId: string, newStatus: string) {
    setChangingId(lotId);
    try {
      const res = await fetch("/api/agent/update-lot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lotId, status: newStatus }),
      });
      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      // silently handle
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Lots</h1>
        <p className="text-secondary text-sm mt-1">{stock.length} lot{stock.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} project{Object.keys(grouped).length !== 1 ? "s" : ""}</p>
      </div>

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
            <h2 className="text-base font-semibold text-heading mb-3">{group.projectName}</h2>
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
                    </tr>
                  </thead>
                  <tbody>
                    {group.lots.map((lot) => (
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
                            value={lot.status}
                            onChange={(e) => handleStatusChange(lot.id, e.target.value)}
                            disabled={changingId === lot.id || lot.status === "Settled"}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
