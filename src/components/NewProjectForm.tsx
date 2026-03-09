"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createProjectAction, updateProjectAction } from "@/lib/actions";
import type { Project } from "@/lib/types";

interface NewProjectFormProps {
  project?: Project | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewProjectForm({ project, onSuccess, onCancel }: NewProjectFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!project;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!formData.get("name") || !formData.get("address")) {
      setError("Name and address are required");
      return;
    }

    startTransition(async () => {
      const action = isEditing ? updateProjectAction : createProjectAction;
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  const selectClass =
    "w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={project.id} />}

      {error && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      <Input
        label="Project Name"
        name="name"
        required
        placeholder="e.g. 6 Cross Street"
        defaultValue={project?.name || ""}
      />

      <Input
        label="Address"
        name="address"
        required
        placeholder="e.g. 6 Cross Street"
        defaultValue={project?.address || ""}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input label="Suburb" name="suburb" placeholder="e.g. Footscray" defaultValue={project?.suburb || ""} />
        <Input label="State" name="state" placeholder="e.g. VIC" defaultValue={project?.state || ""} />
        <Input label="Postcode" name="postcode" placeholder="e.g. 3011" defaultValue={project?.postcode || ""} />
      </div>

      {/* Project Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Project Status</label>
        <select name="project_status" defaultValue={project?.project_status || ""} className={selectClass}>
          <option value="">Select status…</option>
          <option value="pre_construction">Pre-Construction</option>
          <option value="under_construction">Under Construction</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {/* Development Details */}
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider pt-2">Development Details</p>

      <Input
        label="Development Type"
        name="development_type"
        placeholder="e.g. Residential, Mixed Use, Commercial"
        defaultValue={project?.development_type || ""}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Dwellings"
          name="num_dwellings"
          type="number"
          placeholder="0"
          defaultValue={project?.num_dwellings ?? ""}
        />
        <Input
          label="Commercial"
          name="num_commercial"
          type="number"
          placeholder="0"
          defaultValue={project?.num_commercial ?? ""}
        />
        <Input
          label="Hotel Keys"
          name="num_hotel_keys"
          type="number"
          placeholder="0"
          defaultValue={project?.num_hotel_keys ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={project?.description || ""}
          placeholder="Project description…"
          className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm placeholder:text-muted hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
