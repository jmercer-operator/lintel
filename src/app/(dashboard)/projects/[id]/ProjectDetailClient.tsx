"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { StockForm } from "@/components/StockForm";
import { DocumentsTab } from "@/components/DocumentsTab";
import type { DocumentCategory, ProjectDocument, ClientDocForProject } from "@/components/DocumentsTab";
import { MilestonesTab } from "@/components/MilestonesTab";
import type { ProjectMilestone } from "@/components/MilestonesTab";
import { ProjectLogo } from "@/components/ProjectLogo";
import { ReserveLotModal } from "@/components/ReserveLotModal";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { NewProjectForm } from "@/components/NewProjectForm";
import { ALL_STATUSES, formatPrice, formatArea, timeAgo } from "@/lib/types";
import type { ProjectWithStats, StockItem, StockStatus, Agent, ContactWithLinkedStock, ProjectConstructionStatus } from "@/lib/types";

type TabKey = "stock" | "documents" | "milestones";

interface ProjectDetailClientProps {
  project: ProjectWithStats;
  stock: StockItem[];
  statusFilter: string;
  agents?: Agent[];
  contacts?: ContactWithLinkedStock[];
  categories: DocumentCategory[];
  documents: ProjectDocument[];
  clientDocuments?: ClientDocForProject[];
  milestones: ProjectMilestone[];
  activeTab: TabKey;
  stockContactMap?: Record<string, string>; // stock_id → contact name
}

const metricConfig = [
  { key: "total" as const, label: "Total Stock", color: "#1E2B26" },
  { key: "available" as const, label: "Available", color: "#1A9E6F" },
  { key: "underContract" as const, label: "Under Contract", color: "#7B3FA0" },
  { key: "exchanged" as const, label: "Exchanged", color: "#E07858" },
  { key: "settled" as const, label: "Settled", color: "#2D8C5A" },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: "stock", label: "Stock" },
  { key: "documents", label: "Documents" },
  { key: "milestones", label: "Milestones" },
];

export function ProjectDetailClient({
  project,
  stock,
  statusFilter,
  agents,
  contacts,
  categories,
  documents,
  clientDocuments,
  milestones,
  activeTab,
  stockContactMap = {},
}: ProjectDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [reservingStock, setReservingStock] = useState<StockItem | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "All") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("tab", "stock");
    router.push(`/projects/${project.id}?${params}`);
  }

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams();
    if (tab !== "stock") params.set("tab", tab);
    const statusParam = searchParams.get("status");
    if (tab === "stock" && statusParam) params.set("status", statusParam);
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
            <div className="flex items-center gap-3">
              <ProjectLogo logoUrl={project.logo_url} name={project.name} size={32} />
              <h1 className="text-2xl font-bold text-heading">{project.name}</h1>
              <ProjectStatusBadge status={project.project_status as ProjectConstructionStatus | null} />
            </div>
            <p className="text-secondary text-sm mt-1">
              {project.address}
              {project.suburb && `, ${project.suburb}`}
              {project.state && ` ${project.state}`}
              {project.postcode && ` ${project.postcode}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditProject(true)}>
              Edit Project
            </Button>
            {activeTab === "stock" && (
              <Button onClick={() => setShowAddStock(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Lot
              </Button>
            )}
          </div>
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

      {/* Overview — Project Fields */}
      {(project.development_type || project.description || project.num_dwellings || project.num_commercial || project.num_hotel_keys) && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {project.development_type && (
              <div>
                <p className="text-xs text-secondary mb-0.5">Development Type</p>
                <p className="text-sm font-medium text-heading">{project.development_type}</p>
              </div>
            )}
            {(project.num_dwellings != null && project.num_dwellings > 0) && (
              <div>
                <p className="text-xs text-secondary mb-0.5">Dwellings</p>
                <p className="text-sm font-bold font-mono text-heading">{project.num_dwellings}</p>
              </div>
            )}
            {(project.num_commercial != null && project.num_commercial > 0) && (
              <div>
                <p className="text-xs text-secondary mb-0.5">Commercial</p>
                <p className="text-sm font-bold font-mono text-heading">{project.num_commercial}</p>
              </div>
            )}
            {(project.num_hotel_keys != null && project.num_hotel_keys > 0) && (
              <div>
                <p className="text-xs text-secondary mb-0.5">Hotel Keys</p>
                <p className="text-sm font-bold font-mono text-heading">{project.num_hotel_keys}</p>
              </div>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-body mt-3 whitespace-pre-wrap">{project.description}</p>
          )}
        </Card>
      )}

      {/* Tab Bar */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`
                px-5 py-3 text-sm font-semibold transition-colors relative cursor-pointer
                ${activeTab === tab.key
                  ? "text-emerald-primary"
                  : "text-secondary hover:text-heading"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "stock" && (
        <StockTab
          project={project}
          stock={stock}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onEditStock={setEditingStock}
          onReserveStock={setReservingStock}
          stockContactMap={stockContactMap}
        />
      )}

      {activeTab === "documents" && (
        <DocumentsTab
          projectId={project.id}
          categories={categories}
          documents={documents}
          clientDocuments={clientDocuments}
        />
      )}

      {activeTab === "milestones" && (
        <MilestonesTab
          projectId={project.id}
          milestones={milestones}
        />
      )}

      {/* Add Stock Modal */}
      <Modal open={showAddStock} onClose={() => setShowAddStock(false)} title="Add New Lot">
        <StockForm
          projectId={project.id}
          agents={agents}
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
            agents={agents}
            onSuccess={() => {
              setEditingStock(null);
              router.refresh();
            }}
            onCancel={() => setEditingStock(null)}
          />
        )}
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Edit Project">
        <NewProjectForm
          project={project}
          onSuccess={() => {
            setShowEditProject(false);
            router.refresh();
          }}
          onCancel={() => setShowEditProject(false)}
        />
      </Modal>

      {/* Reserve Lot Modal */}
      {reservingStock && (
        <ReserveLotModal
          open={!!reservingStock}
          onClose={() => setReservingStock(null)}
          stock={reservingStock}
          projectId={project.id}
          agents={agents || []}
          contacts={contacts || []}
        />
      )}
    </div>
  );
}

/* ─── Stock Tab (extracted) ─── */

function StockTab({
  project,
  stock,
  statusFilter,
  onStatusChange,
  onEditStock,
  onReserveStock,
  stockContactMap,
}: {
  project: ProjectWithStats;
  stock: StockItem[];
  statusFilter: string;
  onStatusChange: (v: string) => void;
  onEditStock: (s: StockItem) => void;
  onReserveStock: (s: StockItem) => void;
  stockContactMap: Record<string, string>;
}) {
  return (
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
            onChange={(e) => onStatusChange(e.target.value)}
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
        <table className="w-full min-w-[1000px]">
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
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Customer</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Agent</th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Commission</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-bg-alt transition-colors"
              >
                <td
                  className="px-4 sm:px-6 py-3.5 text-sm font-mono font-semibold text-heading cursor-pointer"
                  onClick={() => onEditStock(row)}
                >
                  {row.lot_number}
                </td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bedrooms}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bathrooms}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.car_spaces}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{formatArea(row.internal_area)}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{formatArea(row.external_area)}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm font-mono font-medium text-heading">{formatPrice(row.price)}</td>
                <td className="px-4 sm:px-6 py-3.5">
                  <StatusBadge status={row.status as StockStatus} />
                </td>
                <td className="px-4 sm:px-6 py-3.5 text-sm text-body">
                  {stockContactMap[row.id] ? (
                    <span className="text-emerald-primary font-medium">{stockContactMap[row.id]}</span>
                  ) : "—"}
                </td>
                <td className="px-4 sm:px-6 py-3.5 text-sm text-body">{row.agent_name || "—"}</td>
                <td className="px-4 sm:px-6 py-3.5 text-sm text-right font-mono text-secondary">
                  {row.commission_rate != null
                    ? row.commission_type === "flat"
                      ? formatPrice(row.commission_rate)
                      : `${row.commission_rate}%`
                    : "—"}
                </td>
                <td className="px-4 sm:px-6 py-3.5">
                  {row.status === "Available" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReserveStock(row);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-button)] bg-emerald-primary/10 text-emerald-primary hover:bg-emerald-primary/20 transition-colors cursor-pointer"
                    >
                      Reserve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={12} className="px-6 py-12 text-center text-secondary text-sm">
                  No lots found{statusFilter !== "All" ? ` with status "${statusFilter}"` : ""}. Click &quot;Add Lot&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
