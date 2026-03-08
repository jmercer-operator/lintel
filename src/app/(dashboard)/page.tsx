"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";

const projects = [
  "6 Cross Street, Footscray",
  "38-44 Hockley Ave, Clarendon",
  "67-69 Bell St, Coburg",
  "12 Duke St, Sunshine",
];

type StockStatus = "Available" | "EOI" | "Reserved" | "Under Contract" | "Exchanged" | "Settled";

const metrics = [
  { label: "Total Stock", value: "48", color: "#1E2B26", change: null },
  { label: "Available", value: "12", color: "#1A9E6F", change: null },
  { label: "Under Contract", value: "28", color: "#7B3FA0", change: null },
  { label: "Settled", value: "8", color: "#2D8C5A", change: "↑ 3 this month" },
];

const stockData: {
  lot: string;
  bed: number;
  bath: number;
  car: number;
  m2Int: number;
  m2Ext: number;
  price: string;
  status: StockStatus;
  agent: string;
  updated: string;
}[] = [
  { lot: "101", bed: 2, bath: 2, car: 1, m2Int: 78, m2Ext: 12, price: "$485,000", status: "Available", agent: "Sarah M.", updated: "2 hours ago" },
  { lot: "102", bed: 1, bath: 1, car: 1, m2Int: 52, m2Ext: 8, price: "$375,000", status: "EOI", agent: "James T.", updated: "5 hours ago" },
  { lot: "203", bed: 3, bath: 2, car: 2, m2Int: 110, m2Ext: 18, price: "$625,000", status: "Reserved", agent: "Sarah M.", updated: "1 day ago" },
  { lot: "204", bed: 2, bath: 2, car: 1, m2Int: 82, m2Ext: 10, price: "$510,000", status: "Under Contract", agent: "Priya K.", updated: "2 days ago" },
  { lot: "305", bed: 2, bath: 1, car: 1, m2Int: 68, m2Ext: 9, price: "$445,000", status: "Exchanged", agent: "James T.", updated: "3 days ago" },
  { lot: "306", bed: 3, bath: 2, car: 2, m2Int: 115, m2Ext: 22, price: "$680,000", status: "Settled", agent: "Priya K.", updated: "1 week ago" },
];

const recentActivity = [
  { id: 1, text: "Lot 102 received an Expression of Interest", agent: "James T.", time: "5 hours ago", icon: "📝" },
  { id: 2, text: "Lot 306 settlement completed", agent: "Priya K.", time: "1 day ago", icon: "✅" },
  { id: 3, text: "New contact added: David Chen", agent: "Sarah M.", time: "2 days ago", icon: "👤" },
  { id: 4, text: "Lot 204 moved to Under Contract", agent: "Priya K.", time: "2 days ago", icon: "📋" },
];

export default function DashboardPage() {
  const [selectedProject, setSelectedProject] = useState(projects[0]);

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
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-10 text-sm font-medium rounded-[var(--radius-input)] border border-border bg-white text-body cursor-pointer hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          >
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} padding="md">
            <p className="text-sm text-secondary font-medium mb-2">{metric.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: metric.color }}>
              {metric.value}
            </p>
            {metric.change && (
              <p className="text-xs text-[#2D8C5A] font-medium mt-1.5">{metric.change}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Stock Overview Table */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border">
          <h2 className="text-lg font-semibold text-heading">Stock Overview</h2>
          <p className="text-sm text-secondary mt-0.5">All lots for {selectedProject}</p>
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
              {stockData.map((row) => (
                <tr
                  key={row.lot}
                  className="border-b border-border last:border-0 hover:bg-bg-alt transition-colors cursor-pointer"
                >
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono font-semibold text-heading">{row.lot}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bed}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.bath}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-center text-body">{row.car}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{row.m2Int}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-right text-body">{row.m2Ext}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm font-mono font-medium text-heading">{row.price}</td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm text-body">{row.agent}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-sm text-secondary">{row.updated}</td>
                </tr>
              ))}
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
