"use client";

import { useMemo, useState } from "react";
import type { AuditEvent } from "@/lib/data/audit";

type EntityFilter = "all" | "stock" | "agent_projects";

const ACTION_LABELS: Record<string, string> = {
  "stock.created": "Lot created",
  "stock.updated": "Lot updated",
  "stock.deleted": "Lot deleted",
  "agent_project.assigned": "Agent assigned to project",
  "agent_project.updated": "Agent commission updated",
  "agent_project.unassigned": "Agent removed from project",
};

const ACTION_STYLES: Record<string, string> = {
  "stock.created": "bg-emerald-primary/10 text-emerald-primary",
  "stock.updated": "bg-gold/15 text-[#8a6a24]",
  "stock.deleted": "bg-error/10 text-error",
  "agent_project.assigned": "bg-emerald-primary/10 text-emerald-primary",
  "agent_project.updated": "bg-gold/15 text-[#8a6a24]",
  "agent_project.unassigned": "bg-error/10 text-error",
};

function formatValue(field: string, value: string | null): string {
  if (value === null || value === "") return "—";
  if (field === "price") {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      return `$${n.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
    }
  }
  if (field === "commission_rate") return `${value}`;
  return value;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogClient({
  available,
  events,
}: {
  available: boolean;
  events: AuditEvent[];
}) {
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (entityFilter !== "all" && e.entityTable !== entityFilter) return false;
      if (!q) return true;
      const haystack = [
        e.entityLabel,
        e.projectName || "",
        e.actorLabel,
        ACTION_LABELS[e.action] || e.action,
        ...e.changes.flatMap((c) => [c.label, c.from || "", c.to || ""]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, entityFilter, search]);

  const tabs: { key: EntityFilter; label: string; count: number }[] = [
    { key: "all", label: "All events", count: events.length },
    {
      key: "stock",
      label: "Lots",
      count: events.filter((e) => e.entityTable === "stock").length,
    },
    {
      key: "agent_projects",
      label: "Agent assignments",
      count: events.filter((e) => e.entityTable === "agent_projects").length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Audit Log</h1>
        <p className="text-secondary text-sm mt-1">
          Immutable record of lot, pricing, and commission changes across your
          organisation.
        </p>
      </div>

      {!available ? (
        <div className="bg-white border border-border rounded-[var(--radius-card)] p-10 text-center shadow-card">
          <p className="text-base font-semibold text-heading">
            Audit ledger not enabled
          </p>
          <p className="text-sm text-secondary mt-2 max-w-md mx-auto">
            The audit ledger database migration has not been applied to this
            environment yet. Once applied, every change to lot status, pricing,
            agent assignment, and commissions will be recorded here
            automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 bg-bg-alt rounded-[var(--radius-button)] p-1 w-fit">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setEntityFilter(t.key)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-[var(--radius-button)]
                    transition-colors cursor-pointer
                    ${
                      entityFilter === t.key
                        ? "bg-white text-heading shadow-sm"
                        : "text-secondary hover:text-heading"
                    }
                  `}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-border text-secondary">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lot, project, agent, actor…"
              className="
                w-full sm:w-72 sm:ml-auto px-3 py-2 text-sm
                bg-white border border-border rounded-[var(--radius-input)]
                text-body placeholder:text-muted
                focus:outline-none focus:border-emerald-primary
              "
            />
          </div>

          {/* Events */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-border rounded-[var(--radius-card)] p-10 text-center shadow-card">
              <p className="text-base font-semibold text-heading">
                No audit events
              </p>
              <p className="text-sm text-secondary mt-2">
                {events.length === 0
                  ? "No recorded changes yet. Events appear here as lots, pricing, and commissions change."
                  : "No events match the current filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((event) => (
                <div
                  key={event.id}
                  className="bg-white border border-border rounded-[var(--radius-card)] p-5 shadow-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          ACTION_STYLES[event.action] ||
                          "bg-bg-alt text-secondary"
                        }`}
                      >
                        {ACTION_LABELS[event.action] || event.action}
                      </span>
                      <span className="text-sm font-semibold text-heading font-mono">
                        {event.entityLabel}
                      </span>
                      {event.projectName && (
                        <span className="text-sm text-secondary">
                          · {event.projectName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {formatTimestamp(event.createdAt)}
                    </span>
                  </div>

                  {event.changes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {event.changes.map((change) => (
                        <div
                          key={change.field}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-secondary w-36 shrink-0">
                            {change.label}
                          </span>
                          {change.from !== null ? (
                            <>
                              <span className="text-muted line-through">
                                {formatValue(change.field, change.from)}
                              </span>
                              <span className="text-muted">→</span>
                            </>
                          ) : null}
                          <span className="text-heading font-medium">
                            {formatValue(change.field, change.to)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted mt-3">
                    By {event.actorLabel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
