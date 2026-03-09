"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ProjectLogo } from "@/components/ProjectLogo";
import { createAgentAction, updateAgentAction } from "@/lib/actions";
import type { Agent, AgentProject, ProjectWithStats } from "@/lib/types";

interface AgentFormProps {
  agent?: Agent | null;
  projects: ProjectWithStats[];
  assignedProjectIds?: string[];
  agentProjectCommissions?: AgentProject[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AgentForm({
  agent,
  projects,
  assignedProjectIds = [],
  agentProjectCommissions = [],
  onSuccess,
  onCancel,
}: AgentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set(assignedProjectIds));
  const [commissionData, setCommissionData] = useState<Record<string, { type: string; rate: string }>>(() => {
    const data: Record<string, { type: string; rate: string }> = {};
    for (const ap of agentProjectCommissions) {
      data[ap.project_id] = {
        type: ap.commission_type || "percentage",
        rate: ap.commission_rate != null ? String(ap.commission_rate) : "",
      };
    }
    return data;
  });

  const isEditing = !!agent;

  function toggleProject(projectId: string) {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        if (!commissionData[projectId]) {
          setCommissionData((d) => ({
            ...d,
            [projectId]: { type: "percentage", rate: "" },
          }));
        }
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (!formData.get("first_name") || !formData.get("last_name")) {
      setError("First name and last name are required");
      return;
    }

    // Remove any existing project_ids from form (they're handled via state)
    formData.delete("project_ids");

    // Add selected projects and their commission data
    selectedProjects.forEach((pid) => {
      formData.append("project_ids", pid);
      const cd = commissionData[pid];
      if (cd) {
        formData.set(`project_commission_type_${pid}`, cd.type);
        formData.set(`project_commission_rate_${pid}`, cd.rate);
      }
    });

    startTransition(async () => {
      const action = isEditing ? updateAgentAction : createAgentAction;
      const result = await action(formData);
      if (result.error) setError(result.error);
      else onSuccess();
    });
  }

  const selectClass =
    "w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer";

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

      {/* Projects & Commission */}
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider pt-2">Projects &amp; Commission</p>
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {projects.map((p) => {
          const isChecked = selectedProjects.has(p.id);
          const cd = commissionData[p.id] || { type: "percentage", rate: "" };
          return (
            <div key={p.id} className={`rounded-[var(--radius-input)] border ${isChecked ? "border-emerald-primary/40 bg-[#1A9E6F]/5" : "border-border"} p-3 transition-colors`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleProject(p.id)}
                  className="w-4 h-4 rounded border-border text-emerald-primary focus:ring-emerald-primary cursor-pointer accent-[#1A9E6F]"
                />
                <div className="flex items-center gap-2">
                  <ProjectLogo logoUrl={p.logo_url} name={p.name} size={20} />
                  <span className="text-sm font-medium text-heading">{p.name}</span>
                </div>
              </label>
              {isChecked && (
                <div className="grid grid-cols-2 gap-3 mt-3 ml-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-secondary">Commission Type</label>
                    <select
                      value={cd.type}
                      onChange={(e) =>
                        setCommissionData((d) => ({
                          ...d,
                          [p.id]: { ...d[p.id], type: e.target.value },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-xs hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="flat">Flat Fee</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-secondary">
                      {cd.type === "flat" ? "Amount ($)" : "Rate (%)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cd.rate}
                      onChange={(e) =>
                        setCommissionData((d) => ({
                          ...d,
                          [p.id]: { ...d[p.id], rate: e.target.value },
                        }))
                      }
                      placeholder={cd.type === "flat" ? "e.g. 5000" : "e.g. 2.5"}
                      className="px-2.5 py-1.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-xs font-mono hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Update Agent" : "Add Agent"}
        </Button>
      </div>
    </form>
  );
}
