"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ALL_STATUSES, formatPrice, formatArea, timeAgo } from "@/lib/types";
import type { ProjectWithStats, StockItem, StockStats, StockStatus } from "@/lib/types";

const recentActivity = [
  { id: 1, text: "Lot 102 received an Expression of Interest", agent: "James T.", time: "5 hours ago", icon: "📝" },
  { id: 2, text: "Lot 306 settlement completed", agent: "Priya K.", time: "1 day ago", icon: "✅" },
  { id: 3, text: "New contact added: David Chen", agent: "Sarah M.", time: "2 days ago", icon: "👤" },
  { id: 4, text: "Lot 204 moved to Under Contract", agent: "Priya K.", time: "2 days ago", icon: "📋" },
];

const metricConfig = [
  { key: "total" as const, label: "Total Stock", color: "#1E2B26" },
  { key: "available" as const, label: "Available", color: "#1A9E6F" },
  { key: "underContract" as const, label: "Under Contract", color: "#7B3FA0" },
  { key: "exchanged" as const, label: "Exchanged", color: "#E07858" },
  { key: "settled" as const, label: "Settled", color: "#2D8C5A" },
];

interface DashboardClientProps {
  projects: ProjectWithStats[];
  stats: StockStats;
  stock: StockItem[];
  selectedProjectId: string;
  statusFilter: string;
}

export function DashboardClient({
  projects,
  stats,
  stock,
  selectedProjectId,
  statusFilter,
}: DashboardClientProps) {
  const router = useRouter();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const current = { project: selectedProjectId, status: statusFilter, ...updates };
    if (current.project) params.set("project", current.project);
    if (current.status && current.status !== "All") params.set("status", current.status);
    router.push(`/${params.toString() ? `?${params}` : ""}`);
  }

  const selectedProjectName = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)?.name || "Unknown"
    : "All Projects";

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header with project selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Dashboard</h1>
          <p className="text-secondary text-sm mt-1">
            Overview of your project portfolio
          </p>
        </div>
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => updateParams({ project: e.target.value, status: "All" })}
            className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-10 text-sm font-medium rounded-[var(--radius-input)] border border-border bg-white text-body cursor-pointer hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricConfig.map((metric) => (
          <Card key={metric.key} padding="md">
            <p className="text-sm text-secondary font-medium mb-2">{metric.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: metric.color }}>
              {stats[metric.key]}
            </p>
          </Card>
        ))}
      </div>

      {/* Stock Overview Table */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-heading">Stock Overview</h2>
            <p className="text-sm text-secondary mt-0.5">
              {statusFilter === "All" ? "All lots" : statusFilter} for {selectedProjectName}
            </p>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => updateParams({ status: e.target.value })}
              className="appearance-none px-4 py-2 pr-9 text-sm font-medium rounded-[var(--radius-input)] border border-border bg-white text-body cursor-pointer hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
            >
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Lot</th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">Bed</th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">Bath</th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">Car</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">m² Int</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">m² Ext</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Price</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Agent</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-bg-alt transition-colors cursor-pointer"
                >
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono font-semibold text-heading">{row.lot_number}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bedrooms}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bathrooms}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.car_spaces}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{formatArea(row.internal_area)}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{formatArea(row.external_area)}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono font-medium text-heading">{formatPrice(row.price)}</td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <StatusBadge status={row.status as StockStatus} />
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm text-body">{row.agent_name || "—"}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm text-secondary">{timeAgo(row.updated_at)}</td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-secondary text-sm">
                    No stock data found. Add lots to your projects to see them here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border">
          <h2 className="text-lg font-semibold text-heading">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="px-4 sm:px-6 py-4 flex items-start gap-3 hover:bg-bg-alt transition-colors">
              <span className="text-lg flex-shrink-0 mt-0.5">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-body">{activity.text}</p>
                <p className="text-xs text-secondary mt-0.5">
                  {activity.agent} · {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
