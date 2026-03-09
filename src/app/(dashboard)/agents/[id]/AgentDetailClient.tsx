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

interface Props {
  agent: AgentWithStats;
  projects: ProjectWithStats[];
  stock: StockRow[];
  agentProjectCommissions: AgentProject[];
  availableCount: number;
}

export function AgentDetailClient({ agent, projects, stock, agentProjectCommissions, availableCount }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const assignedProjects = projects.filter((p) => agent.assigned_projects.includes(p.id));

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
        <Button onClick={() => setShowEditModal(true)}>Edit Agent</Button>
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
          <p className="text-2xl font-bold text-heading font-mono">{agent.assigned_projects.length}</p>
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

          {/* Assigned Projects — styled cards */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Projects</h3>
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-secondary">No projects assigned</p>
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
