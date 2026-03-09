"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import type { Contact, StockItem, Project, Agent, ProjectConstructionStatus } from "@/lib/types";
// Inline types to avoid importing server-only modules
interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: "completed" | "in_progress" | "upcoming";
  sort_order: number;
  target_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientDocument {
  id: string;
  contact_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}
import {
  welcomeMessages,
  getRandomMessage,
  getMilestoneMessage,
  statusFunMessages,
} from "@/lib/portal-messages";
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PortalClientProps {
  contact: Contact;
  stock: StockItem | null;
  project: Project | null;
  agent: Agent | null;
  milestones: ProjectMilestone[];
  clientDocuments: ClientDocument[];
}

export default function PortalClient({
  contact,
  stock,
  project,
  agent,
  milestones,
  clientDocuments,
}: PortalClientProps) {
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [milestoneMsg, setMilestoneMsg] = useState("");
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const displayName = contact.preferred_name || contact.first_name;

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;
  const currentMilestone = milestones.find((m) => m.status === "in_progress");

  // Filter client documents to only show Exchanged Contract and Trust Receipt
  const filteredClientDocs = clientDocuments.filter(
    (doc) =>
      doc.document_type === "Exchanged Contract" ||
      doc.document_type === "Trust Receipt"
  );

  // Deposit is "paid" only when a Trust Receipt document has been uploaded
  const hasTrustReceipt = clientDocuments.some(
    (doc) => doc.document_type === "Trust Receipt"
  );

  // Progress pictures & videos from project — normalise both old string and new JSON formats
  const progressPictures = (project?.progress_pictures ?? []).map((item) =>
    typeof item === "string" ? item : item.url
  );
  const progressVideos = (project?.progress_videos ?? []).map((item) =>
    typeof item === "string" ? item : item.url
  );

  useEffect(() => {
    setWelcomeMsg(getRandomMessage(welcomeMessages));
    if (currentMilestone) {
      setMilestoneMsg(getMilestoneMessage(currentMilestone.name));
    }
    const timer1 = setTimeout(() => setProgressAnimated(true), 300);
    const timer2 = setTimeout(() => setCardsVisible(true), 200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentMilestone]);

  const statusMessage = stock
    ? statusFunMessages[stock.status] || stock.status
    : "";

  const agentInitials = agent
    ? `${agent.first_name[0]}${agent.last_name[0]}`
    : "?";

  // Total m² = internal + external combined (client portal only)
  const totalArea =
    stock && (stock.internal_area || stock.external_area)
      ? Math.round(Number(stock.internal_area || 0) + Number(stock.external_area || 0))
      : null;

  // Hero image: use project hero_render_url if available, otherwise emerald gradient
  const hasHeroImage = !!project?.hero_render_url;

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar — minimal */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 h-14">
          <a href="/portal"><Logo size="sm" /></a>
          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <a href="/portal/profile" className="cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-emerald-primary flex items-center justify-center text-white text-xs font-semibold">
                {contact.first_name[0]}
                {contact.last_name[0]}
              </div>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section — project hero image or emerald fallback */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "clamp(250px, 40vw, 400px)",
          ...(hasHeroImage
            ? {}
            : {
                background:
                  "linear-gradient(135deg, #1E2B26 0%, #147A56 40%, #1A9E6F 70%, #1E2B26 100%)",
              }),
        }}
      >
        {/* Background image */}
        {hasHeroImage && (
          <img
            src={project!.hero_render_url!}
            alt={project!.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Subtle pattern overlay (only for fallback gradient) */}
        {!hasHeroImage && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,168,85,0.2) 0%, transparent 40%)",
            }}
          />
        )}
        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)",
          }}
        />
        {/* Content */}
        <div className="relative h-full max-w-4xl mx-auto px-5 flex flex-col justify-end pb-8 sm:pb-10">
          {project && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <ProjectStatusBadge status={project.project_status as ProjectConstructionStatus | null} />
              </div>
              <h1
                className="text-white font-bold tracking-tight"
                style={{ fontSize: "clamp(28px, 5vw, 36px)" }}
              >
                {project.name}
              </h1>
              <p className="text-white/80 text-sm sm:text-base mt-1">
                {project.address}
                {project.suburb && `, ${project.suburb}`}
                {project.state && ` ${project.state}`}
                {project.postcode && ` ${project.postcode}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Welcome Section */}
        <div
          className={`transition-all duration-700 ${
            cardsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-bold text-heading"
            style={{ fontSize: "clamp(22px, 4vw, 28px)" }}
          >
            Congratulations, {displayName} 👋
          </h2>
          <p className="text-secondary text-base sm:text-lg mt-1">
            {welcomeMsg && project
              ? `${welcomeMsg.replace(/\.$/, "")} at ${project.name}.`
              : welcomeMsg}
          </p>
        </div>

        {/* Milestone Progress — no percentage display */}
        {milestones.length > 0 && (
          <div
            className={`portal-card transition-all duration-700 delay-100 ${
              cardsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-heading">
                Construction Progress
              </h3>
            </div>

            {/* Milestone dots */}
            <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
              {milestones.map((m, i) => (
                <div
                  key={m.id}
                  className="flex flex-col items-center min-w-0 flex-1"
                >
                  {/* Connector line + dot */}
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          m.status === "completed" || m.status === "in_progress"
                            ? "bg-emerald-primary"
                            : "bg-border"
                        }`}
                      />
                    )}
                    <div className="relative flex-shrink-0">
                      {m.status === "completed" ? (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-primary flex items-center justify-center">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : m.status === "in_progress" ? (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-primary/20 flex items-center justify-center">
                          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-primary animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-border bg-white" />
                      )}
                    </div>
                    {i < milestones.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          m.status === "completed"
                            ? "bg-emerald-primary"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`mt-2 text-[10px] sm:text-xs text-center leading-tight hidden sm:block ${
                      m.status === "in_progress"
                        ? "font-semibold text-emerald-primary"
                        : m.status === "completed"
                        ? "text-secondary"
                        : "text-muted"
                    }`}
                  >
                    {m.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Current milestone info */}
            {currentMilestone && (
              <div className="mt-4 p-4 bg-emerald-primary/5 rounded-2xl">
                <p className="font-semibold text-heading text-sm sm:text-base">
                  📍 Currently: {currentMilestone.name}
                </p>
                <p className="text-secondary text-sm mt-1">{milestoneMsg}</p>
                <p className="text-muted text-xs mt-2">
                  {completedCount} of {totalCount} milestones complete
                </p>
              </div>
            )}
          </div>
        )}

        {/* Your Home — redesigned with price, deposit, premium layout */}
        {stock && (
          <div
            className={`portal-card transition-all duration-700 delay-200 ${
              cardsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <h3 className="text-lg sm:text-xl font-bold text-heading mb-6">
              Your Home
            </h3>

            {/* Top: Lot badge + status + price */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-primary/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-emerald-primary font-medium uppercase tracking-wider">
                    Lot
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-primary font-mono">
                    {stock.lot_number}
                  </span>
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-heading">
                    {statusMessage}
                  </p>
                  {project && (
                    <p className="text-sm text-secondary mt-0.5">{project.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Price & Deposit row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-emerald-primary/5 rounded-2xl border border-emerald-primary/10">
                <p className="text-xs text-secondary font-medium uppercase tracking-wider mb-1">Purchase Price</p>
                <p className="text-xl sm:text-2xl font-bold text-heading">
                  {stock.price ? `$${Math.round(stock.price).toLocaleString("en-AU")}` : "—"}
                </p>
              </div>
              <div className={`p-4 rounded-2xl border ${hasTrustReceipt ? 'bg-emerald-primary/5 border-emerald-primary/10' : 'bg-bg border-border'}`}>
                <p className="text-xs text-secondary font-medium uppercase tracking-wider mb-1">Deposit</p>
                <p className="text-xl sm:text-2xl font-bold text-heading">
                  {stock.deposit_amount ? `$${Math.round(Number(stock.deposit_amount)).toLocaleString("en-AU")}` : "—"}
                </p>
                {hasTrustReceipt ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-primary mt-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Paid
                  </span>
                ) : (
                  <span></span>
                )}
              </div>
            </div>

            {/* Property specs — clean horizontal row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-bg rounded-xl text-center">
                <p className="text-lg sm:text-xl font-bold text-heading">{stock.bedrooms}</p>
                <p className="text-[11px] text-muted font-medium">Bed{stock.bedrooms !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-3 bg-bg rounded-xl text-center">
                <p className="text-lg sm:text-xl font-bold text-heading">{stock.bathrooms}</p>
                <p className="text-[11px] text-muted font-medium">Bath{stock.bathrooms !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-3 bg-bg rounded-xl text-center">
                <p className="text-lg sm:text-xl font-bold text-heading">{stock.car_spaces}</p>
                <p className="text-[11px] text-muted font-medium">Car{stock.car_spaces !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-3 bg-bg rounded-xl text-center">
                <p className="text-lg sm:text-xl font-bold text-heading">{totalArea ? `${totalArea}` : "—"}</p>
                <p className="text-[11px] text-muted font-medium">m² Total</p>
              </div>
            </div>
          </div>
        )}

        {/* Construction Progress — Pictures & Videos (hide if empty) */}
        {(progressPictures.length > 0 || progressVideos.length > 0) && (
          <div
            className={`portal-card transition-all duration-700 delay-250 ${
              cardsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <h3 className="text-lg sm:text-xl font-bold text-heading mb-5">
              Construction Progress
            </h3>

            {/* Progress Pictures */}
            {progressPictures.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-secondary mb-3">📸 Progress Pictures</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {progressPictures.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImg(url)}
                      className="aspect-[4/3] rounded-xl overflow-hidden bg-bg-alt cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`Progress ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Videos */}
            {progressVideos.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-secondary mb-3">🎬 Progress Videos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {progressVideos.map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-bg-alt">
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        className="w-full aspect-video"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Your Agent */}
        {agent && (
          <div
            className={`portal-card transition-all duration-700 delay-300 ${
              cardsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <h3 className="text-lg sm:text-xl font-bold text-heading mb-5">
              Your Agent
            </h3>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-primary flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                {agentInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-heading">
                  {agent.preferred_name || agent.first_name} {agent.last_name}
                </p>
                {agent.company && (
                  <p className="text-sm text-secondary">{agent.company}</p>
                )}
                <p className="text-sm text-muted mt-1">
                  {agent.preferred_name || agent.first_name} is here to help
                  with anything you need.
                </p>

                <div className="flex flex-wrap gap-3 mt-4">
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-primary text-white rounded-xl text-sm font-semibold hover:bg-emerald-dark transition-colors min-h-[44px]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      Call
                    </a>
                  )}
                  {agent.email && (
                    <a
                      href={`mailto:${agent.email}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-bg border border-border text-heading rounded-xl text-sm font-semibold hover:bg-bg-alt transition-colors min-h-[44px]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents — only Exchanged Contract and Trust Receipt */}
        <div
          className={`portal-card transition-all duration-700 delay-[400ms] ${
            cardsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h3 className="text-lg sm:text-xl font-bold text-heading mb-5">
            Your Documents
          </h3>
          {filteredClientDocs.length > 0 ? (
            <div className="space-y-3">
              {filteredClientDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  name={doc.file_name}
                  size={doc.file_size}
                  date={doc.created_at}
                  type={doc.document_type}
                  filePath={doc.file_path}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-4xl">📄</span>
              <p className="text-sm text-secondary mt-3">
                No documents available yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for progress pictures */}
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

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} M Property. Powered by{" "}
            <span className="font-semibold">
              <span className="text-emerald-primary font-extrabold">L</span>
              <span className="text-body font-medium">INTEL</span>
            </span>
          </p>
          <Logo size="sm" />
        </div>
      </footer>

      <style jsx>{`
        .portal-card {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        @media (min-width: 640px) {
          .portal-card {
            padding: 32px;
          }
        }
      `}</style>
    </div>
  );
}

function DocumentCard({
  name,
  size,
  date,
  type,
  filePath,
}: {
  name: string;
  size: number;
  date: string;
  type: string;
  filePath: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/portal/download?bucket=client-documents&path=${encodeURIComponent(filePath)}`
      );
      if (!res.ok) throw new Error("Download failed");
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }

  const formattedDate = new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const ext = name.split(".").pop()?.toLowerCase();
  const icon =
    ext === "pdf"
      ? "📕"
      : ext === "doc" || ext === "docx"
      ? "📘"
      : ext === "xls" || ext === "xlsx"
      ? "📗"
      : ext === "jpg" || ext === "png" || ext === "jpeg"
      ? "🖼️"
      : "📄";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg transition-colors group">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-heading truncate">{name}</p>
        <p className="text-xs text-muted">
          {formatFileSize(size)} · {formattedDate}
          <span className="ml-1 text-emerald-primary">· {type}</span>
        </p>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 p-2 rounded-xl hover:bg-emerald-primary/10 text-emerald-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
      >
        {downloading ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
