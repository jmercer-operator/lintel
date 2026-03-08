"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { StockForm } from "@/components/StockForm";
import { ALL_STATUSES, formatPrice, formatArea, timeAgo } from "@/lib/types";
import type { ProjectWithStats, StockItem, StockStatus } from "@/lib/types";

interface ProjectDetailClientProps {
  project: ProjectWithStats;
  stock: StockItem[];
  statusFilter: string;
}

const metricConfig = [
  { key: "total" as const, label: "Total Stock", color: "#1E2B26" },
  { key: "available" as const, label: "Available", color: "#1A9E6F" },
  { key: "underContract" as const, label: "Under Contract", color: "#7B3FA0" },
  { key: "exchanged" as const, label: "Exchanged", color: "#E07858" },
  { key: "settled" as const, label: "Settled", color: "#2D8C5A" },
];

export function ProjectDetailClient({ project, stock, statusFilter }: ProjectDetailClientProps) {
  const router = useRouter();
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);

  function handleStatusChange(value: string) {
    const params = new URLSearchParams();
    if (value !== "All") params.set("status", value);
    router.push(`/projects/${project.id}${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-emerald-primary transition-colors mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-heading">{project.name}</h1>
            <p className="text-secondary text-sm mt-1">
              {project.address}
              {project.suburb && `, ${project.suburb}`}
              {project.state && ` ${project.state}`}
              {project.postcode && ` ${project.postcode}`}
            </p>
          </div>
          <Button onClick={() => setShowAddStock(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Lot
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricConfig.map((metric) => (
          <Card key={metric.key} padding="md">
            <p className="text-sm text-secondary font-medium mb-2">{metric.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: metric.color }}>
              {project.stats[metric.key]}
            </p>
          </Card>
        ))}
      </div>

      {/* Stock Table */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-heading">Stock</h2>
            <p className="text-sm text-secondary mt-0.5">
              {statusFilter === "All" ? "All lots" : statusFilter} · {stock.length} {stock.length === 1 ? "lot" : "lots"}
            </p>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
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
                  onClick={() => setEditingStock(row)}
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
                    No lots found{statusFilter !== "All" ? ` with status "${statusFilter}"` : ""}. Click &quot;Add Lot&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Stock Modal */}
      <Modal open={showAddStock} onClose={() => setShowAddStock(false)} title="Add New Lot">
        <StockForm
          projectId={project.id}
          onSuccess={() => {
            setShowAddStock(false);
            router.refresh();
          }}
          onCancel={() => setShowAddStock(false)}
        />
      </Modal>

      {/* Edit Stock Modal */}
      <Modal
        open={!!editingStock}
        onClose={() => setEditingStock(null)}
        title={editingStock ? `Edit Lot ${editingStock.lot_number}` : "Edit Lot"}
      >
        {editingStock && (
          <StockForm
            projectId={project.id}
            stock={editingStock}
            onSuccess={() => {
              setEditingStock(null);
              router.refresh();
            }}
            onCancel={() => setEditingStock(null)}
          />
        )}
      </Modal>
    </div>
  );
}
