"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectLogo } from "@/components/ProjectLogo";
import { AgentForm } from "@/components/AgentForm";
import { assignStockToAgentAction } from "@/lib/actions";
import {
  formatPrice,
  type AgentWithStats,
  type AgentProject,
  type ProjectWithStats,
  type StockStatus,
  PROJECT_CONSTRUCTION_STATUS_LABELS,
  PROJECT_CONSTRUCTION_STATUS_COLORS,
  type ProjectConstructionStatus,
} from "@/lib/types";

interface StockRow {
  id: string;
  lot_number: string;
  status: string;
  price: number | null;
  bedrooms: number;
  bathrooms: number;
  project_id: string;
  projects: { name: string } | null;
}

interface AvailableStockRow {
  id: string;
  lot_number: string;
  bedrooms: number;
  bathrooms: number;
  car_spaces: number;
  price: number | null;
  project_id: string;
  project_name: string;
}

interface Props {
  agent: AgentWithStats;
  projects: ProjectWithStats[];
  stock: StockRow[];
  agentProjectCommissions: AgentProject[];
  availableCount: number;
  availableStockForAssignment: AvailableStockRow[];
  projectIdsWithAssignedStock: string[];
}

export function AgentDetailClient({
  agent,
  projects,
  stock,
  agentProjectCommissions,
  availableCount,
  availableStockForAssignment,
  projectIdsWithAssignedStock,
}: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Change 2: Only show projects where agent has assigned stock
  const assignedProjects = projects.filter((p) => projectIdsWithAssignedStock.includes(p.id));

  // Build commission map per project
  const commissionMap = new Map<string, { type: string | null; rate: number | null }>();
  for (const ap of agentProjectCommissions) {
    commissionMap.set(ap.project_id, { type: ap.commission_type, rate: ap.commission_rate });
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Back */}
      <Link href="/agents" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Agents
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {agent.logo_url ? (
            <img
              src={agent.logo_url}
              alt={`${agent.first_name} ${agent.last_name}`}
              className="w-16 h-16 rounded-[10px] object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-[10px] bg-emerald-primary/10 flex items-center justify-center text-emerald-primary font-bold text-xl">
              {agent.first_name[0]}{agent.last_name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-heading">{agent.first_name} {agent.last_name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                agent.status === "active" ? "bg-[#1A9E6F]/10 text-[#1A9E6F]" : "bg-bg-alt text-secondary"
              }`}>{agent.status}</span>
            </div>
            {agent.agency && <p className="text-secondary text-sm">{agent.agency}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAssignModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Assign Stock
          </Button>
          <Button onClick={() => setShowEditModal(true)}>Edit Agent</Button>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)} className="!text-red-600 !border-red-200 hover:!bg-red-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Delete
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card padding="sm">
          <p className="text-xs text-secondary uppercase tracking-wider mb-1">Total Lots</p>
          <p className="text-2xl font-bold text-heading font-mono">{agent.total_lots}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-secondary uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-2xl font-bold text-heading font-mono">{formatPrice(agent.total_value)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-secondary uppercase tracking-wider mb-1">Projects</p>
          <p className="text-2xl font-bold text-heading font-mono">{assignedProjects.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#1A9E6F] uppercase tracking-wider mb-1">Available for Sale</p>
          <p className="text-2xl font-bold text-[#1A9E6F] font-mono">{availableCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lots by Status */}
          {Object.keys(agent.lots_by_status).length > 0 && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Lots by Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(agent.lots_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusBadge status={status as StockStatus} />
                    <span className="font-mono text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Assigned Stock */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Assigned Stock</h3>
            {stock.length === 0 ? (
              <p className="text-sm text-secondary">No stock assigned</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Lot</th>
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Project</th>
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Status</th>
                      <th className="text-right pb-2 font-semibold text-secondary text-xs uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="py-2 font-mono text-xs">{s.lot_number}</td>
                        <td className="py-2">
                          <Link href={`/projects/${s.project_id}`} className="text-emerald-primary hover:underline">
                            {s.projects?.name || "—"}
                          </Link>
                        </td>
                        <td className="py-2"><StatusBadge status={s.status as StockStatus} /></td>
                        <td className="py-2 text-right font-mono text-xs">{formatPrice(s.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <Detail label="Email" value={agent.email} />
              <Detail label="Phone" value={agent.phone} mono />
              {agent.secondary_phone && <Detail label="Alt Phone" value={agent.secondary_phone} mono />}
            </div>
          </Card>

          {/* Address */}
          {(agent.address_line_1 || agent.suburb) && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Address</h3>
              <div className="text-sm text-body space-y-1">
                {agent.address_line_1 && <p>{agent.address_line_1}</p>}
                {agent.address_line_2 && <p>{agent.address_line_2}</p>}
                <p>{[agent.suburb, agent.state, agent.postcode].filter(Boolean).join(", ")}</p>
                {agent.country && agent.country !== "AU" && <p>{agent.country}</p>}
              </div>
            </Card>
          )}

          {/* Projects — only show where agent has assigned stock */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Projects</h3>
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-secondary">No projects with assigned stock</p>
            ) : (
              <div className="space-y-3">
                {assignedProjects.map((p) => {
                  const comm = commissionMap.get(p.id);
                  const ps = p.project_status as ProjectConstructionStatus | null;
                  const statusColors = ps ? PROJECT_CONSTRUCTION_STATUS_COLORS[ps] : null;
                  const statusLabel = ps ? PROJECT_CONSTRUCTION_STATUS_LABELS[ps] : null;

                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block rounded-[10px] border border-border hover:border-emerald-primary/30 p-3 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={p.name}
                            className="w-10 h-10 rounded-[8px] object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-[8px] bg-emerald-primary/5 flex items-center justify-center text-emerald-primary font-semibold text-xs flex-shrink-0">
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium text-heading text-sm truncate">{p.name}</p>
                            {statusLabel && statusColors && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${statusColors.bg} ${statusColors.text}`}>
                                {statusLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary truncate">
                            {p.address}{p.suburb ? `, ${p.suburb}` : ""}
                          </p>
                          {comm && comm.rate != null && (
                            <p className="text-xs font-mono text-[#D4A855] mt-1">
                              Commission: {comm.type === "flat" ? formatPrice(comm.rate) : `${comm.rate}%`}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Notes */}
          {agent.notes && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Notes</h3>
              <p className="text-sm text-body whitespace-pre-wrap">{agent.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Agent">
        <AgentForm
          agent={agent}
          projects={projects}
          assignedProjectIds={agent.assigned_projects}
          agentProjectCommissions={agentProjectCommissions}
          onSuccess={() => {
            setShowEditModal(false);
            router.refresh();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Agent">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <div>
              <p className="font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-700 mt-1">Deleting <strong>{agent.first_name} {agent.last_name}</strong> will remove them permanently. Any stock assigned to this agent will be unassigned.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <button
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
                  if (res.ok) router.push("/agents");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Agent"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Stock Modal */}
      <AssignStockModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        agentId={agent.id}
        agentProjectCommissions={agentProjectCommissions}
        projects={projects}
        availableStock={availableStockForAssignment}
      />
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-secondary mb-0.5">{label}</p>
      <p className={`text-body ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}

/* ─── Assign Stock Modal ─── */

function AssignStockModal({
  open,
  onClose,
  agentId,
  agentProjectCommissions,
  projects,
  availableStock,
}: {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentProjectCommissions: AgentProject[];
  projects: ProjectWithStats[];
  availableStock: AvailableStockRow[];
}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show projects the agent has access to via agent_projects
  const agentProjectIds = agentProjectCommissions.map((ap) => ap.project_id);
  const assignableProjects = projects.filter((p) => agentProjectIds.includes(p.id));

  // Filter available stock by selected project
  const filteredStock = selectedProjectId
    ? availableStock.filter((s) => s.project_id === selectedProjectId)
    : [];

  function toggleStock(stockId: string) {
    setSelectedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) next.delete(stockId);
      else next.add(stockId);
      return next;
    });
  }

  async function handleAssign() {
    if (selectedStockIds.size === 0) return;
    setAssigning(true);
    setError(null);

    const formData = new FormData();
    formData.set("agent_id", agentId);
    for (const id of selectedStockIds) {
      formData.append("stock_ids", id);
    }

    const result = await assignStockToAgentAction(formData);
    if (result.error) {
      setError(result.error);
      setAssigning(false);
    } else {
      setSelectedProjectId("");
      setSelectedStockIds(new Set());
      onClose();
      router.refresh();
    }
  }

  function handleClose() {
    setSelectedProjectId("");
    setSelectedStockIds(new Set());
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Assign Stock">
      <div className="space-y-4">
        {error && (
          <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-sm">
            {error}
          </div>
        )}

        {/* Project Dropdown */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Select Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedStockIds(new Set());
            }}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
          >
            <option value="">Choose a project…</option>
            {assignableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Available Stock List */}
        {selectedProjectId && (
          <div>
            <p className="text-sm font-medium text-heading mb-2">
              Available Stock ({filteredStock.length} {filteredStock.length === 1 ? "lot" : "lots"})
            </p>
            {filteredStock.length === 0 ? (
              <p className="text-sm text-secondary py-4 text-center">
                No available unassigned stock for this project
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-border rounded-[var(--radius-input)]">
                {filteredStock.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-bg-alt cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStockIds.has(s.id)}
                      onChange={() => toggleStock(s.id)}
                      className="w-4 h-4 rounded border-border text-emerald-primary focus:ring-emerald-primary accent-[#1A9E6F]"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-heading">
                          Lot {s.lot_number}
                        </span>
                        <span className="text-xs text-secondary ml-3">
                          {s.bedrooms}B/{s.bathrooms}Ba/{s.car_spaces}C
                        </span>
                      </div>
                      <span className="font-mono text-xs text-secondary">
                        {formatPrice(s.price)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedStockIds.size === 0}
          >
            {assigning ? "Assigning…" : `Assign ${selectedStockIds.size > 0 ? `(${selectedStockIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
