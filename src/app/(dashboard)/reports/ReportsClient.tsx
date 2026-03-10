"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatPrice,
  STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_COLORS,
} from "@/lib/types";
import type {
  PortfolioStats,
  ProjectSalesBreakdown,
  AgentPerformanceRow,
  CommissionSummary,
  SettlementRow,
  HeatmapProject,
  StockStatus,
} from "@/lib/types";

interface ReportsClientProps {
  portfolioStats: PortfolioStats;
  projectBreakdown: ProjectSalesBreakdown[];
  agentPerformance: AgentPerformanceRow[];
  commissionSummary: CommissionSummary;
  settlementPipeline: SettlementRow[];
  heatmapData: HeatmapProject[];
}

/* ─── Portfolio Stat Card ─── */
function StatCard({
  label,
  value,
  subtitle,
  color = "emerald",
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: "emerald" | "gold" | "neutral";
}) {
  const colorClasses = {
    emerald: "border-l-[#1A9E6F]",
    gold: "border-l-[#D4A855]",
    neutral: "border-l-[#B8C4BC]",
  };

  return (
    <Card className={`border-l-[3px] ${colorClasses[color]}`} padding="md">
      <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl lg:text-3xl font-bold text-[#151E18] font-mono leading-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[#6B7A70] mt-1">{subtitle}</p>
      )}
    </Card>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-[#151E18]">{title}</h2>
      {subtitle && <p className="text-sm text-[#6B7A70] mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ─── Heatmap Status Colors — distinct per status ─── */
const HEATMAP_COLORS: Record<StockStatus, { bg: string; border: string }> = {
  Available: { bg: "bg-[#E5E7EB]", border: "border-[#D1D5DB]" },
  EOI: { bg: "bg-[#D4A855]", border: "border-[#C49A4A]" },
  "Under Contract": { bg: "bg-[#1A9E6F]", border: "border-[#168A60]" },
  Exchanged: { bg: "bg-[#0F766E]", border: "border-[#0D6660]" },
  Settled: { bg: "bg-[#1F2937]", border: "border-[#111827]" },
};

/* ─── Sort helpers ─── */
type AgentSortKey = "agent_name" | "total_sales" | "revenue" | "avg_sale_price" | "commission_due";
type ProjectSortKey = "project_name" | "total" | "revenue" | "sell_through";

export function ReportsClient({
  portfolioStats,
  projectBreakdown,
  agentPerformance,
  commissionSummary,
  settlementPipeline,
  heatmapData,
}: ReportsClientProps) {
  const [agentSort, setAgentSort] = useState<{ key: AgentSortKey; asc: boolean }>({
    key: "revenue",
    asc: false,
  });
  const [projectSort, setProjectSort] = useState<{ key: ProjectSortKey; asc: boolean }>({
    key: "revenue",
    asc: false,
  });

  // Settlement pipeline: group by project, all expanded by default
  const settlementByProject = (() => {
    const groups: Record<string, { projectName: string; rows: typeof settlementPipeline }> = {};
    for (const s of settlementPipeline) {
      if (!groups[s.project_name]) {
        groups[s.project_name] = { projectName: s.project_name, rows: [] };
      }
      groups[s.project_name].rows.push(s);
    }
    return Object.values(groups);
  })();
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  function toggleProjectCollapse(projectName: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectName)) next.delete(projectName);
      else next.add(projectName);
      return next;
    });
  }

  // Sort agents
  const sortedAgents = [...agentPerformance].sort((a, b) => {
    const aVal = a[agentSort.key];
    const bVal = b[agentSort.key];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return agentSort.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return agentSort.asc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Sort projects
  const sortedProjects = [...projectBreakdown].sort((a, b) => {
    const aVal = a[projectSort.key];
    const bVal = b[projectSort.key];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return projectSort.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return projectSort.asc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function toggleAgentSort(key: AgentSortKey) {
    setAgentSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: false }
    );
  }

  function toggleProjectSort(key: ProjectSortKey) {
    setProjectSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: false }
    );
  }

  function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={`inline ml-1 transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
      >
        <path
          d="M6 2L9 5H3L6 2Z"
          fill={active && asc ? "#1A9E6F" : "#B8C4BC"}
        />
        <path
          d="M6 10L3 7H9L6 10Z"
          fill={active && !asc ? "#1A9E6F" : "#B8C4BC"}
        />
      </svg>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide navigation, sidebar, topbar, bottom tabs */
          nav, aside, [data-sidebar], [data-topbar], [data-bottomtabs],
          .sidebar, .topbar, .bottom-tabs, header:not(.print-header),
          [class*="Sidebar"], [class*="TopBar"], [class*="BottomTabs"] {
            display: none !important;
          }
          /* Hide the print button itself */
          .print-button { display: none !important; }
          /* Show LINTEL branding header */
          .print-header { display: block !important; }
          /* Clean formatting */
          body { background: white !important; color: black !important; font-size: 11pt; }
          main, [class*="main"] { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          /* Ensure tables don't break */
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          /* Cards clean */
          [class*="Card"], [class*="card"] {
            box-shadow: none !important;
            border: 1px solid #E2E8E4 !important;
            break-inside: avoid;
          }
          section { break-inside: avoid; }
          /* Proper margins */
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print-only LINTEL branding header */}
      <div className="print-header hidden">
        <div style={{ borderBottom: "2px solid #1A9E6F", paddingBottom: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "0.08em", color: "#1A9E6F" }}>L</span>
          <span style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "0.08em", color: "#2D3B32" }}>INTEL</span>
          <span style={{ fontSize: "12px", color: "#6B7A70", marginLeft: "16px" }}>Reports</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#151E18]">Reports</h1>
          <p className="text-sm text-[#6B7A70] mt-1">Developer intelligence dashboard</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-[var(--radius-button,8px)] border border-[#E2E8E4] bg-white text-[#2D3B32] hover:bg-[#F0F5F2] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Report
        </button>
      </div>

      {/* ─── 2a. Portfolio Overview ─── */}
      <section>
        <SectionHeader title="Portfolio Overview" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Total Portfolio Value"
            value={formatPrice(portfolioStats.totalValue)}
            subtitle={`${portfolioStats.totalLots} lots`}
            color="neutral"
          />
          <StatCard
            label="Total Sold Value"
            value={formatPrice(portfolioStats.soldValue)}
            subtitle={`${portfolioStats.soldLots} sold`}
            color="emerald"
          />
          <StatCard
            label="Available Value"
            value={formatPrice(portfolioStats.availableValue)}
            color="gold"
          />
          <StatCard
            label="Sell-through Rate"
            value={`${portfolioStats.sellThroughRate.toFixed(1)}%`}
            color={portfolioStats.sellThroughRate > 50 ? "emerald" : "gold"}
          />
          <StatCard
            label="Average Price"
            value={formatPrice(portfolioStats.averagePrice)}
            color="neutral"
          />
          <StatCard
            label="Sales Velocity"
            value={`${portfolioStats.salesVelocity.toFixed(1)}/mo`}
            subtitle="Settled per month"
            color="emerald"
          />
        </div>
      </section>

      {/* ─── 2b. Project Sales Overview ─── */}
      <section>
        <SectionHeader
          title="Project Sales Overview"
          subtitle="Per-project breakdown"
        />
        <Card padding="sm" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8E4]">
                <Th onClick={() => toggleProjectSort("project_name")} className="text-left">
                  Project
                  <SortIcon active={projectSort.key === "project_name"} asc={projectSort.asc} />
                </Th>
                <Th onClick={() => toggleProjectSort("total")} className="text-center">
                  Total
                  <SortIcon active={projectSort.key === "total"} asc={projectSort.asc} />
                </Th>
                <Th className="text-center">Avail</Th>
                <Th className="text-center">EOI</Th>
                <Th className="text-center">UC</Th>
                <Th className="text-center">Exch</Th>
                <Th className="text-center">Settled</Th>
                <Th onClick={() => toggleProjectSort("revenue")} className="text-right">
                  Revenue
                  <SortIcon active={projectSort.key === "revenue"} asc={projectSort.asc} />
                </Th>
                <Th className="text-right">
                  Sold Value
                </Th>
                <Th onClick={() => toggleProjectSort("sell_through")} className="text-right">
                  Sell-through
                  <SortIcon active={projectSort.key === "sell_through"} asc={projectSort.asc} />
                </Th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => (
                <tr
                  key={p.project_id}
                  className="border-b border-[#F0F5F2] hover:bg-[#FAFCFB] transition-colors"
                >
                  <td className="py-3 px-3">
                    <Link
                      href={`/projects/${p.project_id}`}
                      className="font-semibold text-[#151E18] hover:text-[#1A9E6F] transition-colors"
                    >
                      {p.project_name}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#2D3B32]">{p.total}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#2D3B32]">{p.available}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#D4A855]">{p.eoi}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#7B3FA0]">{p.under_contract}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#E07858]">{p.exchanged}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#2D8C5A]">{p.settled}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#151E18]">
                    {formatPrice(p.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#1A9E6F]">
                    {formatPrice(p.sold_value)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={
                        p.sell_through > 50 ? "text-[#1A9E6F]" : "text-[#D4A855]"
                      }
                    >
                      {p.sell_through.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#B8C4BC]">
                    No project data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ─── 2c. Agent Performance ─── */}
      <section>
        <SectionHeader
          title="Agent Performance"
          subtitle="Sales by agent — sorted by revenue"
        />
        <Card padding="sm" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8E4]">
                <Th onClick={() => toggleAgentSort("agent_name")} className="text-left">
                  Agent
                  <SortIcon active={agentSort.key === "agent_name"} asc={agentSort.asc} />
                </Th>
                <Th className="text-left">Agency</Th>
                <Th onClick={() => toggleAgentSort("total_sales")} className="text-center">
                  Sales
                  <SortIcon active={agentSort.key === "total_sales"} asc={agentSort.asc} />
                </Th>
                <Th onClick={() => toggleAgentSort("revenue")} className="text-right">
                  Revenue
                  <SortIcon active={agentSort.key === "revenue"} asc={agentSort.asc} />
                </Th>
                <Th onClick={() => toggleAgentSort("avg_sale_price")} className="text-right">
                  Avg Sale
                  <SortIcon active={agentSort.key === "avg_sale_price"} asc={agentSort.asc} />
                </Th>
                <Th onClick={() => toggleAgentSort("commission_due")} className="text-right">
                  Commission Due
                  <SortIcon active={agentSort.key === "commission_due"} asc={agentSort.asc} />
                </Th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((a) => (
                <tr
                  key={a.agent_id}
                  className="border-b border-[#F0F5F2] hover:bg-[#FAFCFB] transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-[#151E18]">
                    {a.agent_name}
                  </td>
                  <td className="py-3 px-3 text-[#6B7A70]">{a.agency || "—"}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#2D3B32]">
                    {a.total_sales}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#151E18]">
                    {formatPrice(a.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#2D3B32]">
                    {formatPrice(a.avg_sale_price)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#1A9E6F]">
                    {formatPrice(a.commission_due)}
                  </td>
                </tr>
              ))}
              {sortedAgents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#B8C4BC]">
                    No agent performance data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ─── 2d. Commission Summary ─── */}
      <section>
        <SectionHeader title="Commission Summary" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <StatCard
            label="Total Commissions Due"
            value={formatPrice(commissionSummary.totalCommissionsDue)}
            color="emerald"
          />
          <StatCard
            label="Commissions on Settled"
            value={formatPrice(commissionSummary.commissionsOnSettled)}
            color="emerald"
          />
          <StatCard
            label="Commissions Pending"
            value={formatPrice(commissionSummary.commissionsPending)}
            color="gold"
          />
        </div>
      </section>

      {/* ─── 2e. Settlement Pipeline ─── */}
      <section>
        <SectionHeader
          title="Settlement Pipeline"
          subtitle="Upcoming settlements for exchanged lots — grouped by project"
        />
        {settlementPipeline.length > 0 ? (
          <Card padding="sm" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8E4]">
                  <Th className="text-left">Lot Number</Th>
                  <Th className="text-right">Contract Price</Th>
                  <Th className="text-left">Settlement Date</Th>
                  <Th className="text-left">Customer Name</Th>
                  <Th className="text-right">Days Until</Th>
                </tr>
              </thead>
              <tbody>
                {settlementByProject.map((group) => {
                  const isCollapsed = collapsedProjects.has(group.projectName);
                  return (
                    <Fragment key={group.projectName}>
                      <tr
                        className="bg-[#F0F5F2] cursor-pointer hover:bg-[#E2E8E4] transition-colors"
                        onClick={() => toggleProjectCollapse(group.projectName)}
                      >
                        <td colSpan={5} className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6B7A70] select-none">
                              {isCollapsed ? "▶" : "▼"}
                            </span>
                            <span className="font-semibold text-[#151E18]">{group.projectName}</span>
                            <span className="text-xs text-[#6B7A70] font-mono">
                              {group.rows.length} settlement{group.rows.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && group.rows.map((s) => {
                        const urgencyClass =
                          s.days_until !== null && s.days_until < 0
                            ? "text-[#E05252] font-bold"
                            : s.days_until !== null && s.days_until <= 7
                            ? "text-[#E05252]"
                            : s.days_until !== null && s.days_until <= 30
                            ? "text-[#D4A855]"
                            : "text-[#2D3B32]";
                        return (
                          <tr
                            key={s.stock_id}
                            className="border-b border-[#F0F5F2] hover:bg-[#FAFCFB] transition-colors"
                          >
                            <td className="py-3 px-3 pl-8 font-mono text-[#2D3B32]">{s.lot_number}</td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-[#151E18]">
                              {s.price != null ? formatPrice(s.price) : "—"}
                            </td>
                            <td className="py-3 px-3 font-mono text-[#2D3B32]">
                              {s.settlement_date
                                ? new Date(s.settlement_date).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#151E18]">
                              {s.customer_name || "—"}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-semibold ${urgencyClass}`}>
                              {s.days_until !== null
                                ? s.days_until < 0
                                  ? `${Math.abs(s.days_until)}d overdue`
                                  : `${s.days_until}d`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-[#B8C4BC] py-8">
              No upcoming settlements
            </p>
          </Card>
        )}
      </section>

      {/* ─── 2f. Sales Heatmap ─── */}
      <section>
        <SectionHeader
          title="Sales Heatmap"
          subtitle="Visual status overview by project — each block is a lot"
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {(Object.keys(STATUS_COLORS) as StockStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-2 text-xs">
              <div
                className={`w-4 h-4 rounded ${HEATMAP_COLORS[status].bg} border ${HEATMAP_COLORS[status].border}`}
              />
              <span className="text-[#6B7A70]">{status}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {heatmapData.map((project) => (
            <Card key={project.project_id} padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#151E18]">
                  {project.project_name}
                </h3>
                <span className="text-xs text-[#6B7A70] font-mono">
                  {project.lots.length} lots
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.lots.map((lot) => (
                  <div
                    key={lot.id}
                    className={`
                      w-10 h-10 md:w-12 md:h-12 rounded-[6px] border
                      ${HEATMAP_COLORS[lot.status].bg}
                      ${HEATMAP_COLORS[lot.status].border}
                      flex items-center justify-center
                      cursor-default transition-transform hover:scale-110
                    `}
                    title={`Lot ${lot.lot_number} — ${lot.status} — ${lot.bedrooms}BR — ${formatPrice(lot.price)}`}
                  >
                    <span className={`text-[10px] md:text-xs font-mono font-semibold ${
                      lot.status === "Available" ? "text-[#2D3B32]/70" : "text-white/90"
                    }`}>
                      {lot.lot_number}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {heatmapData.length === 0 && (
            <Card>
              <p className="text-center text-[#B8C4BC] py-8">
                No stock data for heatmap
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Table Header Cell ─── */
function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={`py-2.5 px-3 text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider whitespace-nowrap ${
        onClick ? "cursor-pointer select-none hover:text-[#1A9E6F]" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
