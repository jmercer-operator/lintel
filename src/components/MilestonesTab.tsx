"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { updateMilestoneAction } from "@/lib/actions";
import { getCurrentUserRole, canEditMilestone } from "@/lib/auth/roles";

export type MilestoneStatus = "completed" | "in_progress" | "upcoming";

export interface ProjectMilestone {
  id: string;
  project_id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  sort_order: number;
  target_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

function getMilestoneProgress(milestones: ProjectMilestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}

interface Props {
  projectId: string;
  milestones: ProjectMilestone[];
}

export function MilestonesTab({ projectId, milestones }: Props) {
  const router = useRouter();
  const role = getCurrentUserRole();
  const progress = getMilestoneProgress(milestones);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    form.set("id", editing.id);
    form.set("project_id", projectId);

    const result = await updateMilestoneAction(form);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(null);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-heading">Construction Progress</h3>
        </div>
        <div className="w-full h-3 bg-bg-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-secondary mt-2">
          {milestones.filter((m) => m.status === "completed").length} of {milestones.length} milestones completed
        </p>
      </Card>

      {/* Milestone Timeline */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border">
          <h3 className="font-semibold text-heading">Milestones</h3>
        </div>

        {milestones.length === 0 ? (
          <div className="px-6 py-12 text-center text-secondary text-sm">
            No milestones configured for this project
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-border" />

              <div className="space-y-0">
                {milestones.map((milestone, idx) => (
                  <div
                    key={milestone.id}
                    className={`
                      relative flex items-start gap-4 py-4
                      ${canEditMilestone(role) ? "cursor-pointer hover:bg-bg-alt -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-[var(--radius-input)] transition-colors" : ""}
                    `}
                    onClick={() => canEditMilestone(role) && setEditing(milestone)}
                  >
                    {/* Status indicator */}
                    <div className="relative z-10 flex-shrink-0">
                      {milestone.status === "completed" && (
                        <div className="w-[30px] h-[30px] rounded-full bg-emerald-primary flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      {milestone.status === "in_progress" && (
                        <div className="w-[30px] h-[30px] rounded-full border-2 border-emerald-primary bg-white flex items-center justify-center">
                          <span className="w-3 h-3 rounded-full bg-emerald-primary animate-pulse" />
                        </div>
                      )}
                      {milestone.status === "upcoming" && (
                        <div className="w-[30px] h-[30px] rounded-full border-2 border-border bg-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-3">
                        <p className={`text-sm font-semibold ${
                          milestone.status === "completed" ? "text-heading" :
                          milestone.status === "in_progress" ? "text-emerald-primary" :
                          "text-muted"
                        }`}>
                          {milestone.name}
                        </p>
                        <MilestoneStatusBadge status={milestone.status} />
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-secondary mt-1">{milestone.description}</p>
                      )}
                      <div className="flex gap-4 mt-1.5">
                        {milestone.target_date && (
                          <p className="text-xs text-muted font-mono">
                            Target: {new Date(milestone.target_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {milestone.completed_date && (
                          <p className="text-xs text-emerald-primary font-mono">
                            Completed: {new Date(milestone.completed_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Milestone Modal */}
      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); setError(null); }}
        title={editing ? `Edit: ${editing.name}` : "Edit Milestone"}
      >
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Status</label>
              <select
                name="status"
                defaultValue={editing.status}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              >
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Target Date</label>
              <input
                type="date"
                name="target_date"
                defaultValue={editing.target_date || ""}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Completed Date</label>
              <input
                type="date"
                name="completed_date"
                defaultValue={editing.completed_date || ""}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); setError(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config = {
    completed: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]", label: "Completed" },
    in_progress: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]", label: "In Progress" },
    upcoming: { bg: "bg-bg-alt", text: "text-muted", label: "Upcoming" },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
