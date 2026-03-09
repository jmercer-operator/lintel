"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { StockItem, StockStats, StockStatus } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/types";

interface Props {
  agentName: string;
  stats: StockStats & { commission_ytd: number };
  clientCount: number;
  recentLots: (StockItem & { project_name: string })[];
}

export function AgentDashboardClient({ agentName, stats, clientCount, recentLots }: Props) {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-heading">
          Welcome back, {agentName}
        </h1>
        <p className="text-secondary mt-1">Here&apos;s your activity overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">My Active Lots</p>
          <p className="text-3xl font-bold text-heading font-mono">{stats.total}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">EOIs This Month</p>
          <p className="text-3xl font-bold text-[#D4A855] font-mono">{stats.eoi}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Under Contract</p>
          <p className="text-3xl font-bold text-[#7B3FA0] font-mono">{stats.underContract}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Commission (YTD)</p>
          <p className="text-3xl font-bold text-emerald-primary font-mono">
            {formatPrice(stats.commission_ytd)}
          </p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/agent/clients"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-primary text-white rounded-[var(--radius-button)] text-sm font-semibold hover:bg-emerald-dark transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Add Client
        </Link>
        <Link
          href="/agent/lots"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-heading border border-border rounded-[var(--radius-button)] text-sm font-semibold hover:bg-bg-alt transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Update Lot Status
        </Link>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lot Activity */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-heading">Recent Lot Activity</h2>
            <Link href="/agent/lots" className="text-xs font-semibold text-emerald-primary hover:underline">
              View All
            </Link>
          </div>
          {recentLots.length === 0 ? (
            <p className="text-sm text-muted py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentLots.map((lot) => (
                <div key={lot.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      Lot <span className="font-mono">{lot.lot_number}</span>
                    </p>
                    <p className="text-xs text-muted">{lot.project_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={lot.status as StockStatus} />
                    <span className="text-xs text-muted">{timeAgo(lot.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Summary */}
        <Card padding="md">
          <h2 className="text-base font-semibold text-heading mb-4">Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-secondary">Total Clients</span>
              <span className="text-sm font-semibold text-heading font-mono">{clientCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-secondary">Available Lots</span>
              <span className="text-sm font-semibold text-heading font-mono">{stats.available}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-secondary">EOIs</span>
              <span className="text-sm font-semibold text-[#D4A855] font-mono">{stats.eoi}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-secondary">Under Contract</span>
              <span className="text-sm font-semibold text-[#7B3FA0] font-mono">{stats.underContract}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-secondary">Exchanged</span>
              <span className="text-sm font-semibold text-[#E07858] font-mono">{stats.exchanged}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-secondary">Settled</span>
              <span className="text-sm font-semibold text-[#2D8C5A] font-mono">{stats.settled}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
