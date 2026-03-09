"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import type { Agent, ProjectWithStats } from "@/lib/types";

interface Props {
  agent: Agent;
  projects: ProjectWithStats[];
}

export function AgentProfileClient({ agent, projects }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agent/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: agent.id,
            email: formData.get("email") || null,
            phone: formData.get("phone") || null,
            secondary_phone: formData.get("secondary_phone") || null,
            address_line_1: formData.get("address_line_1") || null,
            address_line_2: formData.get("address_line_2") || null,
            suburb: formData.get("suburb") || null,
            state: formData.get("state") || null,
            postcode: formData.get("postcode") || null,
          }),
        });

        if (res.ok) {
          setEditing(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to update profile");
        }
      } catch {
        setError("Failed to update profile");
      }
    });
  }

  const commissionDisplay = agent.commission_rate !== null
    ? agent.commission_type === "flat"
      ? `$${Number(agent.commission_rate).toLocaleString("en-AU")}`
      : `${agent.commission_rate}%`
    : "—";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-heading">My Profile</h1>
        {saved && (
          <span className="text-sm font-semibold text-emerald-primary flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>
      )}

      {/* Profile header */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <Avatar name={`${agent.first_name} ${agent.last_name}`} size="lg" />
          <div>
            <h2 className="text-lg font-bold text-heading">
              {agent.first_name} {agent.last_name}
            </h2>
            {agent.agency && <p className="text-sm text-secondary">{agent.agency}</p>}
            <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              agent.status === "active" ? "bg-[#1A9E6F]/10 text-[#1A9E6F]" : "bg-[#E05252]/10 text-[#E05252]"
            }`}>
              {agent.status}
            </span>
          </div>
        </div>
      </Card>

      {/* Read-only info */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-heading mb-4">Agent Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Name</p>
            <p className="text-sm text-heading">{agent.first_name} {agent.last_name}</p>
          </div>
          {agent.preferred_name && (
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Preferred Name</p>
              <p className="text-sm text-heading">{agent.preferred_name}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Agency</p>
            <p className="text-sm text-heading">{agent.agency || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Commission</p>
            <p className="text-sm text-heading">{commissionDisplay}</p>
          </div>
        </div>
      </Card>

      {/* Assigned Projects */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-heading mb-3">Assigned Projects</h3>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects assigned</p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-heading font-medium">{p.name}</span>
                <span className="text-xs text-muted">{p.stats.total} lot{p.stats.total !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Editable contact info */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-heading">Contact Information</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-emerald-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" name="email" type="email" defaultValue={agent.email || ""} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" name="phone" defaultValue={agent.phone || ""} />
              <Input label="Secondary Phone" name="secondary_phone" defaultValue={agent.secondary_phone || ""} />
            </div>
            <Input label="Address Line 1" name="address_line_1" defaultValue={agent.address_line_1 || ""} />
            <Input label="Address Line 2" name="address_line_2" defaultValue={agent.address_line_2 || ""} />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Suburb" name="suburb" defaultValue={agent.suburb || ""} />
              <Input label="State" name="state" defaultValue={agent.state || ""} />
              <Input label="Postcode" name="postcode" defaultValue={agent.postcode || ""} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm text-heading">{agent.email || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Phone</p>
              <p className="text-sm text-heading">{agent.phone || "—"}</p>
            </div>
            {agent.secondary_phone && (
              <div>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Secondary Phone</p>
                <p className="text-sm text-heading">{agent.secondary_phone}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Address</p>
              <p className="text-sm text-heading">
                {[agent.address_line_1, agent.address_line_2, agent.suburb, agent.state, agent.postcode].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
