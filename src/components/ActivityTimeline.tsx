"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ACTIVITY_TYPE_ICONS, timeAgo } from "@/lib/types";
import type { Activity, ActivityType, Agent } from "@/lib/types";
import { createActivityAction } from "@/lib/actions";

interface Props {
  activities: Activity[];
  contactId: string;
  agents: Agent[];
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "call", label: "📞 Call" },
  { value: "email", label: "✉️ Email" },
  { value: "meeting", label: "🤝 Meeting" },
  { value: "inspection", label: "🏠 Inspection" },
  { value: "note", label: "📝 Note" },
  { value: "document", label: "📄 Document" },
];

export function ActivityTimeline({ activities, contactId, agents }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("contact_id", contactId);

    const result = await createActivityAction(formData);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Activity</h3>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + Add Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-secondary text-center py-6">No activity recorded yet</p>
      ) : (
        <div className="space-y-0">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline line + icon */}
              <div className="flex flex-col items-center">
                <span className="text-lg flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-bg-alt">
                  {ACTIVITY_TYPE_ICONS[activity.type]}
                </span>
                {index < activities.length - 1 && (
                  <div className="w-px h-full bg-border min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-body mt-0.5">{activity.description}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  {activity.agent_name && <span>{activity.agent_name} · </span>}
                  {timeAgo(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Activity Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Activity">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#E05252]/10 text-[#E05252] text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Type</label>
            <select
              name="type"
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Title</label>
            <input
              name="title"
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
              placeholder="e.g. Follow-up call about pricing"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none resize-none"
              placeholder="Optional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Agent</label>
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
              {saving ? "Saving..." : "Add Activity"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
