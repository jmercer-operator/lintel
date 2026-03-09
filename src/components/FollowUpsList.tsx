"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { FOLLOW_UP_ACTION_LABELS, PRIORITY_COLORS } from "@/lib/types";
import type { FollowUp, FollowUpPriority } from "@/lib/types";
import { completeFollowUpAction } from "@/lib/actions";

interface Props {
  followUps: FollowUp[];
  title?: string;
  showContactName?: boolean;
}

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function isDueToday(dueDate: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dueDate === today;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function FollowUpsList({ followUps, title = "Today's Follow-ups", showContactName = true }: Props) {
  const router = useRouter();
  const [completing, setCompleting] = useState<string | null>(null);

  const todayOrOverdue = followUps.filter(
    (f) => !f.completed && (isDueToday(f.due_date) || isOverdue(f.due_date))
  );
  const upcoming = followUps.filter(
    (f) => !f.completed && !isDueToday(f.due_date) && !isOverdue(f.due_date)
  );

  async function handleComplete(followUp: FollowUp) {
    setCompleting(followUp.id);
    const formData = new FormData();
    formData.set("id", followUp.id);
    formData.set("contact_id", followUp.contact_id);
    await completeFollowUpAction(formData);
    setCompleting(null);
    router.refresh();
  }

  if (todayOrOverdue.length === 0 && upcoming.length === 0) {
    return null;
  }

  return (
    <Card padding="sm">
      <div className="px-4 py-4 sm:px-6 border-b border-border">
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        {todayOrOverdue.length > 0 && (
          <p className="text-sm text-secondary mt-0.5">
            {todayOrOverdue.length} due today or overdue
          </p>
        )}
      </div>
      <div className="divide-y divide-border">
        {todayOrOverdue.map((f) => (
          <FollowUpRow
            key={f.id}
            followUp={f}
            showContactName={showContactName}
            isOverdue={isOverdue(f.due_date)}
            completing={completing === f.id}
            onComplete={() => handleComplete(f)}
          />
        ))}
        {upcoming.length > 0 && todayOrOverdue.length > 0 && (
          <div className="px-4 sm:px-6 py-2 bg-bg-alt">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Upcoming</p>
          </div>
        )}
        {upcoming.slice(0, 5).map((f) => (
          <FollowUpRow
            key={f.id}
            followUp={f}
            showContactName={showContactName}
            isOverdue={false}
            completing={completing === f.id}
            onComplete={() => handleComplete(f)}
          />
        ))}
      </div>
    </Card>
  );
}

function FollowUpRow({
  followUp,
  showContactName,
  isOverdue: overdue,
  completing,
  onComplete,
}: {
  followUp: FollowUp;
  showContactName: boolean;
  isOverdue: boolean;
  completing: boolean;
  onComplete: () => void;
}) {
  const priorityColors = PRIORITY_COLORS[followUp.priority as FollowUpPriority];

  return (
    <div className={`px-4 sm:px-6 py-3 flex items-start gap-3 hover:bg-bg-alt transition-colors ${overdue ? "bg-[#E05252]/5" : ""}`}>
      {/* Complete checkbox */}
      <button
        onClick={onComplete}
        disabled={completing}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
          completing
            ? "border-[#1A9E6F] bg-[#1A9E6F]"
            : overdue
            ? "border-[#E05252] hover:border-[#E05252] hover:bg-[#E05252]/10"
            : "border-border hover:border-[#1A9E6F] hover:bg-[#1A9E6F]/10"
        }`}
      >
        {completing && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityColors.bg} ${priorityColors.text}`}>
            {FOLLOW_UP_ACTION_LABELS[followUp.action_type] || followUp.action_type}
          </span>
          {followUp.priority === "high" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#E05252]/10 text-[#E05252]">
              High Priority
            </span>
          )}
        </div>
        <p className="text-sm text-body mt-1">{followUp.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
          {showContactName && followUp.contact_name && (
            <a href={`/contacts/${followUp.contact_id}`} className="text-[#1A9E6F] hover:underline font-medium">
              {followUp.contact_name}
            </a>
          )}
          {followUp.agent_name && <span>· {followUp.agent_name}</span>}
          {followUp.project_name && <span>· {followUp.project_name}</span>}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className={`text-xs font-medium ${overdue ? "text-[#E05252]" : "text-secondary"}`}>
          {overdue ? "Overdue" : isDueToday(followUp.due_date) ? "Today" : formatDate(followUp.due_date)}
        </span>
      </div>
    </div>
  );
}
