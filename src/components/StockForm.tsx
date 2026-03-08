"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createStockAction, updateStockAction } from "@/lib/actions";
import { ALL_STATUSES, type StockItem, type Agent } from "@/lib/types";

interface StockFormProps {
  projectId: string;
  stock?: StockItem | null;
  agents?: Agent[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockForm({ projectId, stock, agents, onSuccess, onCancel }: StockFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!stock;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!formData.get("lot_number")) {
      setError("Lot number is required");
      return;
    }

    startTransition(async () => {
      const action = isEditing ? updateStockAction : createStockAction;
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={stock.id} />}
      <input type="hidden" name="project_id" value={projectId} />

      {error && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Lot Number"
          name="lot_number"
          required
          defaultValue={stock?.lot_number || ""}
          placeholder="e.g. 101"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Status</label>
          <select
            name="status"
            defaultValue={stock?.status || "Available"}
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Bedrooms"
          name="bedrooms"
          type="number"
          min={0}
          defaultValue={stock?.bedrooms ?? 0}
        />
        <Input
          label="Bathrooms"
          name="bathrooms"
          type="number"
          min={0}
          defaultValue={stock?.bathrooms ?? 0}
        />
        <Input
          label="Car Spaces"
          name="car_spaces"
          type="number"
          min={0}
          defaultValue={stock?.car_spaces ?? 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="m² Internal"
          name="internal_area"
          type="number"
          min={0}
          step="0.01"
          defaultValue={stock?.internal_area ?? ""}
          placeholder="e.g. 78"
        />
        <Input
          label="m² External"
          name="external_area"
          type="number"
          min={0}
          step="0.01"
          defaultValue={stock?.external_area ?? ""}
          placeholder="e.g. 12"
        />
      </div>

      <Input
        label="Price"
        name="price"
        type="number"
        min={0}
        step="1"
        defaultValue={stock?.price ?? ""}
        placeholder="e.g. 485000"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Level"
          name="level"
          type="number"
          defaultValue={stock?.level ?? ""}
          placeholder="e.g. 1"
        />
        <Input
          label="Aspect"
          name="aspect"
          defaultValue={stock?.aspect ?? ""}
          placeholder="e.g. N, SE"
        />
      </div>

      {agents && agents.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Agent</label>
          <select
            name="agent_name"
            defaultValue={stock?.agent_name || ""}
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer"
          >
            <option value="">No agent</option>
            {agents.map((a) => {
              const name = `${a.first_name} ${a.last_name.charAt(0)}.`;
              return <option key={a.id} value={name}>{a.first_name} {a.last_name}</option>;
            })}
          </select>
        </div>
      ) : (
        <Input
          label="Agent"
          name="agent_name"
          defaultValue={stock?.agent_name ?? ""}
          placeholder="e.g. Sarah M."
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-heading">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={stock?.notes ?? ""}
          placeholder="Optional notes..."
          className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm placeholder:text-muted hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Update Lot" : "Add Lot"}
        </Button>
      </div>
    </form>
  );
}
