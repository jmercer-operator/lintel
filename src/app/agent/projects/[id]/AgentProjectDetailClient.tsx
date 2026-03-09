"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectLogo } from "@/components/ProjectLogo";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import type { ProjectWithStats, StockItem, StockStatus, ProjectConstructionStatus } from "@/lib/types";
import { formatPrice, formatArea } from "@/lib/types";
import type { ProjectDocument, DocumentCategory } from "@/lib/data/documents";
import type { ProjectMilestone } from "@/lib/data/milestones";

/* ─── Progress Media Viewer (read-only for agents) ─── */
function ProgressMediaSection({ pictures: rawPictures, videos: rawVideos }: { pictures: Array<string | { url: string; uploaded_at?: string }>; videos: Array<string | { url: string; uploaded_at?: string }> }) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Normalise: handle both plain string URLs and JSON objects
  const pictures = rawPictures.map((item) => typeof item === "string" ? item : item.url);
  const videos = rawVideos.map((item) => typeof item === "string" ? item : item.url);

  if (pictures.length === 0 && videos.length === 0) return null;

  return (
    <>
      <Card padding="md">
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Construction Progress</h3>

        {pictures.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-heading mb-3">📸 Progress Pictures</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pictures.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxImg(url)}
                  className="aspect-[4/3] rounded-[var(--radius-input)] overflow-hidden bg-bg-alt cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={url} alt={`Progress ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-heading mb-3">🎬 Progress Videos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videos.map((url, i) => (
                <div key={i} className="rounded-[var(--radius-input)] overflow-hidden bg-bg-alt">
                  <video src={url} controls preload="metadata" className="w-full aspect-video" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 cursor-pointer"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={lightboxImg}
            alt="Progress"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMilestoneProgress(milestones: ProjectMilestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}

type Tab = "stock" | "documents" | "milestones";

interface Props {
  project: ProjectWithStats;
  stock: StockItem[];
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  categories: DocumentCategory[];
}

export function AgentProjectDetailClient({ project, stock, milestones, documents, categories }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("stock");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const progress = getMilestoneProgress(milestones);

  const filteredStock = statusFilter === "All" ? stock : stock.filter((s) => s.status === statusFilter);

  // Group docs by category
  const docsByCategory: Record<string, ProjectDocument[]> = {};
  for (const doc of documents) {
    if (!docsByCategory[doc.category_id]) docsByCategory[doc.category_id] = [];
    docsByCategory[doc.category_id].push(doc);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "stock", label: "Stock" },
    { key: "documents", label: "Documents" },
    { key: "milestones", label: "Milestones" },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/agent/projects" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Projects
      </Link>

      {/* Hero image */}
      {project.hero_render_url ? (
        <div className="h-48 md:h-64 rounded-[var(--radius-card)] overflow-hidden bg-bg-alt relative">
          <img
            src={project.hero_render_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <ProjectLogo logoUrl={project.logo_url} name={project.name} size={32} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white">{project.name}</h1>
                <ProjectStatusBadge status={project.project_status as ProjectConstructionStatus | null} />
              </div>
              <p className="text-white/80 text-sm">{project.address}</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3">
            <ProjectLogo logoUrl={project.logo_url} name={project.name} size={32} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-heading">{project.name}</h1>
                <ProjectStatusBadge status={project.project_status as ProjectConstructionStatus | null} />
              </div>
              <p className="text-secondary text-sm mt-1">{project.address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: project.stats.total, color: "text-heading" },
          { label: "Available", value: project.stats.available, color: "text-[#1A9E6F]" },
          { label: "EOI", value: project.stats.eoi, color: "text-[#D4A855]" },
          { label: "Under Contract", value: project.stats.underContract, color: "text-[#7B3FA0]" },
          { label: "Settled", value: project.stats.settled, color: "text-[#2D8C5A]" },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Overview — only show fields with values (conditional rendering for agent portal) */}
      {(project.development_type || project.description || (project.num_dwellings != null && project.num_dwellings > 0) || (project.num_commercial != null && project.num_commercial > 0) || (project.num_hotel_keys != null && project.num_hotel_keys > 0)) && (
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

      {/* Progress Media (hide if empty) */}
      <ProgressMediaSection
        pictures={project.progress_pictures || []}
        videos={project.progress_videos || []}
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "text-emerald-primary border-b-2 border-emerald-primary"
                  : "text-secondary hover:text-heading"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {["All", "Available", "EOI", "Under Contract", "Exchanged", "Settled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-emerald-primary text-white"
                    : "bg-bg-alt text-secondary hover:text-heading border border-border"
                }`}
              >
                {s}
              </button>
            ))}
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
                    <th className="text-left py-3 px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((lot) => (
                    <tr key={lot.id} className="border-b border-border last:border-0 hover:bg-bg-alt/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-heading">{lot.lot_number}</td>
                      <td className="py-3 px-3 text-center text-secondary">{lot.bedrooms}</td>
                      <td className="py-3 px-3 text-center text-secondary">{lot.bathrooms}</td>
                      <td className="py-3 px-3 text-center text-secondary">{lot.car_spaces}</td>
                      <td className="py-3 px-3 text-right text-secondary font-mono">{formatArea(lot.internal_area)}</td>
                      <td className="py-3 px-3 text-right text-secondary font-mono">{formatArea(lot.external_area)}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-heading">{formatPrice(lot.price)}</td>
                      <td className="py-3 px-3"><StatusBadge status={lot.status as StockStatus} /></td>
                      <td className="py-3 px-3 text-secondary text-xs">{lot.agent_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-4">
          {documents.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <p className="text-heading font-semibold">No documents available</p>
                <p className="text-sm text-muted mt-1">No documents have been shared for this project</p>
              </div>
            </Card>
          ) : (
            categories
              .filter((cat) => docsByCategory[cat.id]?.length > 0)
              .map((cat) => (
                <Card key={cat.id} padding="md">
                  <h3 className="text-sm font-semibold text-heading mb-3">{cat.name}</h3>
                  <div className="space-y-2">
                    {docsByCategory[cat.id].map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <svg className="flex-shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-heading truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted">{formatFileSize(doc.file_size)}</p>
                          </div>
                        </div>
                        <a
                          href={`/api/agent/download?path=${encodeURIComponent(doc.file_path)}&bucket=project-documents`}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-primary border border-emerald-primary/20 rounded-[var(--radius-button)] hover:bg-emerald-primary/5 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
          )}
        </div>
      )}

      {activeTab === "milestones" && (
        <Card padding="md">
          {milestones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-heading font-semibold">No milestones yet</p>
              <p className="text-sm text-muted mt-1">Milestones will appear here when added</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-heading">Construction Progress</span>
                  <span className="text-sm font-bold text-emerald-primary font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Milestone list */}
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-start gap-4 relative">
                      <div className="relative z-10 flex-shrink-0">
                        {m.status === "completed" ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-primary flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        ) : m.status === "in_progress" ? (
                          <div className="w-6 h-6 rounded-full border-2 border-emerald-primary bg-white flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-primary animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-border bg-white" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className={`text-sm font-semibold ${m.status === "upcoming" ? "text-muted" : "text-heading"}`}>
                          {m.name}
                        </p>
                        {m.target_date && (
                          <p className="text-xs text-muted mt-0.5">
                            {m.status === "completed" ? "Completed" : "Target"}: {new Date(m.target_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {m.description && (
                          <p className="text-xs text-secondary mt-1">{m.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
