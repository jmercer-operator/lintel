"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createProjectAction } from "@/lib/actions";

interface NewProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewProjectForm({ onSuccess, onCancel }: NewProjectFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!formData.get("name") || !formData.get("address")) {
      setError("Name and address are required");
      return;
    }

    startTransition(async () => {
      const result = await createProjectAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      />

      <Input
        label="Address"
        name="address"
        required
        placeholder="e.g. 6 Cross Street"
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Suburb"
          name="suburb"
          placeholder="e.g. Footscray"
        />
        <Input
          label="State"
          name="state"
          placeholder="e.g. VIC"
        />
        <Input
          label="Postcode"
          name="postcode"
          placeholder="e.g. 3011"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
