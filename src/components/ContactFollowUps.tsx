"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FOLLOW_UP_ACTION_LABELS, PRIORITY_COLORS } from "@/lib/types";
import type { FollowUp, FollowUpAction, FollowUpPriority, Agent } from "@/lib/types";
import { createFollowUpAction, completeFollowUpAction } from "@/lib/actions";

interface Props {
  followUps: FollowUp[];
  contactId: string;
  agents: Agent[];
}

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const ACTION_TYPES: { value: FollowUpAction; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "send_document", label: "Send Document" },
  { value: "follow_up", label: "Follow Up" },
  { value: "other", label: "Other" },
];

export function ContactFollowUps({ followUps, contactId, agents }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = followUps.filter((f) => !f.completed);
  const completed = followUps.filter((f) => f.completed);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("contact_id", contactId);

    const result = await createFollowUpAction(formData);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    router.refresh();
  }

  async function handleComplete(id: string) {
    setCompleting(id);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("contact_id", contactId);
    await completeFollowUpAction(formData);
    setCompleting(null);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Follow-ups</h3>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + Add Follow-up
        </Button>
      </div>

      {followUps.length === 0 ? (
        <p className="text-sm text-secondary text-center py-6">No follow-ups scheduled</p>
      ) : (
        <div className="space-y-2">
          {/* Pending */}
          {pending.map((f) => {
            const overdue = isOverdue(f.due_date);
            const priorityColors = PRIORITY_COLORS[f.priority as FollowUpPriority];
            return (
              <div
                key={f.id}
                className={`flex items-start gap-3 p-3 rounded-[8px] border ${
                  overdue ? "bg-[#E05252]/5 border-[#E05252]/20" : "bg-bg-alt border-border"
                }`}
              >
                <button
                  onClick={() => handleComplete(f.id)}
                  disabled={completing === f.id}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    completing === f.id
                      ? "border-[#1A9E6F] bg-[#1A9E6F]"
                      : overdue
                      ? "border-[#E05252] hover:bg-[#E05252]/10"
                      : "border-border hover:border-[#1A9E6F] hover:bg-[#1A9E6F]/10"
                  }`}
                >
                  {completing === f.id && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityColors.bg} ${priorityColors.text}`}>
                      {FOLLOW_UP_ACTION_LABELS[f.action_type] || f.action_type}
                    </span>
                    {f.priority === "high" && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#E05252]/10 text-[#E05252]">
                        High
                      </span>
                    )}
                    <span className={`text-xs ${overdue ? "text-[#E05252] font-semibold" : "text-secondary"}`}>
                      {overdue ? "Overdue" : formatDate(f.due_date)}
                    </span>
                  </div>
                  <p className="text-sm text-body mt-1">{f.description}</p>
                  {f.agent_name && (
                    <p className="text-xs text-muted mt-0.5">{f.agent_name}</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider pt-2">Completed</p>
              {completed.map((f) => (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-[8px] bg-bg-alt border border-border opacity-60">
                  <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-[#1A9E6F] bg-[#1A9E6F] flex-shrink-0 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-body line-through">{f.description}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {FOLLOW_UP_ACTION_LABELS[f.action_type]} · {formatDate(f.due_date)}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Add Follow-up Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Follow-up">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#E05252]/10 text-[#E05252] text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Action Type</label>
            <select
              name="action_type"
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Description</label>
            <textarea
              name="description"
              required
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none resize-none"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Due Date</label>
              <input
                type="date"
                name="due_date"
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Priority</label>
              <select
                name="priority"
                className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="normal" selected>Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Assigned Agent</label>
            <select
              name="agent_id"
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
            >
              <option value="">— None —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.first_name} {a.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Follow-up"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
