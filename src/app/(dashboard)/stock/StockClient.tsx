"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectLogo } from "@/components/ProjectLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { StockForm } from "@/components/StockForm";
import {
  formatPrice,
  formatArea,
  timeAgo,
  ALL_STATUSES,
  type StockItem,
  type StockStatus,
  type Agent,
  type ProjectWithStats,
} from "@/lib/types";

interface StockWithProject extends StockItem {
  project_name: string;
  project_logo_url: string | null;
}

interface Props {
  stock: StockWithProject[];
  projects: ProjectWithStats[];
  agents: Agent[];
  filters: {
    projectId: string;
    status: string;
    agentId: string;
    search: string;
  };
}

export function StockClient({ stock, projects, agents, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/stock?${params.toString()}`);
  }

  const selectClass =
    "px-3 py-2 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer";

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Stock</h1>
        <p className="text-secondary text-sm mt-1">
          {stock.length} lot{stock.length !== 1 ? "s" : ""} across all projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filters.projectId || ""}
          onChange={(e) => updateFilter("project", e.target.value)}
          className={selectClass}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filters.status || "All"}
          onChange={(e) => updateFilter("status", e.target.value)}
          className={selectClass}
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filters.agentId || ""}
          onChange={(e) => updateFilter("agent", e.target.value)}
          className={selectClass}
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search lot number…"
          defaultValue={filters.search || ""}
          onChange={(e) => {
            const val = e.target.value;
            // Debounce-like: update on blur or after typing stops
            clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__stockSearchTimeout);
            (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__stockSearchTimeout = setTimeout(() => {
              updateFilter("search", val);
            }, 400);
          }}
          className={`${selectClass} min-w-[180px]`}
        />
      </div>

      {/* Stock Table */}
      {stock.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-border p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-lg font-semibold text-heading mb-2">No Stock Found</h2>
          <p className="text-secondary text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-alt border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Lot</th>
                  <th className="text-center px-3 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Bed</th>
                  <th className="text-center px-3 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Bath</th>
                  <th className="text-center px-3 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Car</th>
                  <th className="text-right px-3 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">m² Int</th>
                  <th className="text-right px-3 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">m² Ext</th>
                  <th className="text-right px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Agent</th>
                  <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Commission</th>
                  <th className="text-right px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setEditingStock(s)}
                    className="border-b border-border last:border-0 hover:bg-bg-alt/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProjectLogo logoUrl={s.project_logo_url} name={s.project_name} size={20} />
                        <span className="text-body text-sm truncate max-w-[140px]">{s.project_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-heading">{s.lot_number}</td>
                    <td className="px-3 py-3 text-center text-body">{s.bedrooms}</td>
                    <td className="px-3 py-3 text-center text-body">{s.bathrooms}</td>
                    <td className="px-3 py-3 text-center text-body">{s.car_spaces}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-body">{formatArea(s.internal_area)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-body">{formatArea(s.external_area)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-heading">{formatPrice(s.price)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status as StockStatus} /></td>
                    <td className="px-4 py-3 text-sm text-body truncate max-w-[120px]">{s.agent_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-body">
                      {s.commission_rate
                        ? s.commission_type === "flat"
                          ? formatPrice(s.commission_rate)
                          : `${s.commission_rate}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-secondary">{timeAgo(s.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {editingStock && (
        <Modal
          open={!!editingStock}
          onClose={() => setEditingStock(null)}
          title={`Edit Lot ${editingStock.lot_number}`}
        >
          <StockForm
            stock={editingStock}
            projectId={editingStock.project_id}
            agents={agents}
            onSuccess={() => {
              setEditingStock(null);
              router.refresh();
            }}
            onCancel={() => setEditingStock(null)}
          />
        </Modal>
      )}
    </div>
  );
}
