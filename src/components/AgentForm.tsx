"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createAgentAction, updateAgentAction } from "@/lib/actions";
import type { Agent, ProjectWithStats } from "@/lib/types";

interface AgentFormProps {
  agent?: Agent | null;
  projects: ProjectWithStats[];
  assignedProjectIds?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AgentForm({ agent, projects, assignedProjectIds = [], onSuccess, onCancel }: AgentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!agent;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (!formData.get("first_name") || !formData.get("last_name")) {
      setError("First name and last name are required");
      return;
    }

    startTransition(async () => {
      const action = isEditing ? updateAgentAction : createAgentAction;
      const result = await action(formData);
      if (result.error) setError(result.error);
      else onSuccess();
    });
  }

  const selectClass = "w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={agent.id} />}

      {error && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" name="first_name" required defaultValue={agent?.first_name || ""} />
        <Input label="Last Name" name="last_name" required defaultValue={agent?.last_name || ""} />
      </div>
      <Input label="Preferred Name" name="preferred_name" defaultValue={agent?.preferred_name || ""} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" name="email" type="email" defaultValue={agent?.email || ""} />
        <Input label="Phone" name="phone" defaultValue={agent?.phone || ""} />
      </div>
      <Input label="Secondary Phone" name="secondary_phone" defaultValue={agent?.secondary_phone || ""} />
      <Input label="Agency" name="agency" defaultValue={agent?.agency || ""} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Commission Type</label>
          <select name="commission_type" defaultValue={agent?.commission_type || "percentage"} className={selectClass}>
            <option value="percentage">Percentage</option>
            <option value="flat">Flat Fee</option>
          </select>
        </div>
        <Input
          label="Commission Rate"
          name="commission_rate"
          type="number"
          step="0.01"
          defaultValue={agent?.commission_rate ?? ""}
          placeholder="e.g. 2.5"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Status</label>
        <select name="status" defaultValue={agent?.status || "active"} className={selectClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Address Fields */}
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider pt-2">Address</p>
      <Input label="Address Line 1" name="address_line_1" defaultValue={agent?.address_line_1 || ""} />
      <Input label="Address Line 2" name="address_line_2" defaultValue={agent?.address_line_2 || ""} />
      <div className="grid grid-cols-3 gap-4">
        <Input label="Suburb" name="suburb" defaultValue={agent?.suburb || ""} />
        <Input label="State" name="state" defaultValue={agent?.state || ""} />
        <Input label="Postcode" name="postcode" defaultValue={agent?.postcode || ""} />
      </div>
      <Input label="Country" name="country" defaultValue={agent?.country || "AU"} />

      {/* Project Assignments */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Assigned Projects</label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="project_ids"
                value={p.id}
                defaultChecked={assignedProjectIds.includes(p.id)}
                className="w-4 h-4 rounded border-border text-emerald-primary focus:ring-emerald-primary cursor-pointer accent-[#1A9E6F]"
              />
              <span className="text-sm text-body">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={agent?.notes || ""}
          placeholder="Optional notes…"
          className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm placeholder:text-muted hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Update Agent" : "Add Agent"}
        </Button>
      </div>
    </form>
  );
}
