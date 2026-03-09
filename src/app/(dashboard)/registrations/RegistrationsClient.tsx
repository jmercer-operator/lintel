"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import type { AgentRegistration } from "@/lib/data/registrations";
import {
  approveRegistration,
  rejectRegistration,
} from "@/lib/data/registrations";

type Tab = "pending" | "approved" | "rejected" | "all";

export default function RegistrationsClient({
  registrations,
}: {
  registrations: AgentRegistration[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filtered =
    tab === "all"
      ? registrations
      : registrations.filter((r) => r.status === tab);

  const pendingCount = registrations.filter(
    (r) => r.status === "pending"
  ).length;

  async function handleApprove(id: string) {
    setProcessing(id);
    setFeedback(null);
    try {
      const result = await approveRegistration(id);
      if (result.success) {
        setFeedback({
          id,
          type: "success",
          message: "Agent approved and account created.",
        });
        router.refresh();
      } else {
        setFeedback({
          id,
          type: "error",
          message: result.error || "Approval failed.",
        });
      }
    } catch {
      setFeedback({ id, type: "error", message: "An error occurred." });
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    setProcessing(id);
    setFeedback(null);
    try {
      const result = await rejectRegistration(id);
      if (result.success) {
        setFeedback({ id, type: "success", message: "Registration rejected." });
        router.refresh();
      } else {
        setFeedback({
          id,
          type: "error",
          message: result.error || "Rejection failed.",
        });
      }
    } catch {
      setFeedback({ id, type: "error", message: "An error occurred." });
    } finally {
      setProcessing(null);
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending", count: pendingCount },
    {
      key: "approved",
      label: "Approved",
      count: registrations.filter((r) => r.status === "approved").length,
    },
    {
      key: "rejected",
      label: "Rejected",
      count: registrations.filter((r) => r.status === "rejected").length,
    },
    { key: "all", label: "All", count: registrations.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">
          Agent Registrations
        </h1>
        <p className="text-secondary text-sm mt-1">
          Review and manage agent registration requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-alt rounded-[var(--radius-button)] p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`
              px-4 py-2 text-sm font-medium rounded-[var(--radius-button)]
              transition-colors cursor-pointer
              ${
                tab === t.key
                  ? "bg-white text-heading shadow-sm"
                  : "text-secondary hover:text-heading"
              }
            `}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  t.key === "pending" && t.count > 0
                    ? "bg-emerald-primary text-white"
                    : "bg-border text-secondary"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">📋</span>
          <p className="text-secondary text-sm mt-3">
            No {tab === "all" ? "" : tab} registrations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => (
            <div
              key={reg.id}
              className="bg-white border border-border rounded-[var(--radius-card)] p-5 shadow-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-heading">
                      {reg.first_name} {reg.last_name}
                    </h3>
                    <StatusBadge status={reg.status} />
                  </div>
                  <p className="text-sm text-secondary">{reg.email}</p>
                  {reg.phone && (
                    <p className="text-sm text-muted">{reg.phone}</p>
                  )}
                  {reg.agency && (
                    <p className="text-sm text-muted mt-1">
                      Agency: {reg.agency}
                    </p>
                  )}
                  {reg.message && (
                    <p className="text-sm text-secondary mt-2 italic">
                      &ldquo;{reg.message}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-muted mt-2">
                    Submitted{" "}
                    {new Date(reg.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {reg.reviewed_at && (
                      <span>
                        {" "}
                        · Reviewed{" "}
                        {new Date(reg.reviewed_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </p>

                  {/* Feedback */}
                  {feedback?.id === reg.id && (
                    <div
                      className={`mt-2 text-sm px-3 py-2 rounded-[var(--radius-input)] ${
                        feedback.type === "success"
                          ? "bg-emerald-primary/10 text-emerald-primary"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}
                </div>

                {reg.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(reg.id)}
                      disabled={processing === reg.id}
                    >
                      {processing === reg.id ? "..." : "Approve"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(reg.id)}
                      disabled={processing === reg.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gold/15 text-gold",
    approved: "bg-emerald-primary/10 text-emerald-primary",
    rejected: "bg-error/10 text-error",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        styles[status] || "bg-border text-muted"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
