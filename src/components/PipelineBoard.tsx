"use client";

import { PIPELINE_STAGES, PIPELINE_STAGE_COLORS, timeAgo } from "@/lib/types";
import type { PipelineStage, PipelineContact } from "@/lib/types";

interface Props {
  contacts: PipelineContact[];
  stats: Record<PipelineStage, number>;
}

function daysInStage(updatedAt: string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export function PipelineBoard({ contacts, stats }: Props) {
  const contactsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = contacts.filter((c) => c.pipeline_stage === stage.key);
    return acc;
  }, {} as Record<PipelineStage, PipelineContact[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-heading">Pipeline</h2>
        <p className="text-sm text-secondary">
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} in pipeline
        </p>
      </div>

      {/* Horizontal scrollable pipeline */}
      <div className="overflow-x-auto pb-4 -mx-2 px-2">
        <div className="flex gap-4" style={{ minWidth: `${PIPELINE_STAGES.length * 220}px` }}>
          {PIPELINE_STAGES.map((stage) => {
            const stageContacts = contactsByStage[stage.key];
            const count = stats[stage.key] || 0;
            const colors = PIPELINE_STAGE_COLORS[stage.key];
            const isHighlight = stage.key === "reserved" || stage.key === "exchanged" || stage.key === "settled";

            return (
              <div
                key={stage.key}
                className="flex-1 min-w-[200px] max-w-[260px]"
              >
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[10px] ${isHighlight ? "bg-[#D4A855]/10" : "bg-[#1A9E6F]/10"}`}>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.hex }}
                  />
                  <span className="text-xs font-semibold text-heading uppercase tracking-wider truncate">
                    {stage.shortLabel}
                  </span>
                  <span
                    className="ml-auto text-xs font-bold font-mono px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.hex + "20", color: colors.hex }}
                  >
                    {count}
                  </span>
                </div>

                {/* Cards */}
                <div className="bg-bg-alt/50 rounded-b-[10px] border border-border border-t-0 p-2 space-y-2 min-h-[120px]">
                  {stageContacts.length === 0 ? (
                    <div className="flex items-center justify-center h-[80px]">
                      <p className="text-xs text-muted">No contacts</p>
                    </div>
                  ) : (
                    stageContacts.map((contact) => (
                      <a
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        className="block bg-white rounded-[8px] border border-border p-3 hover:border-[#1A9E6F]/40 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-heading truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.agent_name && (
                          <p className="text-xs text-secondary truncate mt-0.5">
                            {contact.agent_name}
                          </p>
                        )}
                        {(contact.project_name || contact.lot_number) && (
                          <p className="text-xs text-muted truncate mt-1">
                            {contact.project_name}{contact.lot_number ? ` · Lot ${contact.lot_number}` : ""}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted">
                            {daysInStage(contact.updated_at)}d in stage
                          </span>
                          {contact.next_action && (
                            <span className="text-[10px] font-medium text-[#D4A855] truncate ml-2">
                              {contact.next_action}
                            </span>
                          )}
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
