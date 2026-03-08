"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createContactAction, updateContactAction } from "@/lib/actions";
import type { Contact, Agent } from "@/lib/types";

interface ContactFormProps {
  contact?: Contact | null;
  agents: Agent[];
  onSuccess: () => void;
  onCancel: () => void;
}

const TABS = ["Personal", "Address", "ID & Employment", "Legal", "Preferences"] as const;

const SOURCES = ["website", "agent", "referral", "social_media", "walk_in", "event", "other"];
const ID_TYPES = ["passport", "drivers_license", "national_id", "other"];
const CONTACT_METHODS = ["email", "phone", "sms", "whatsapp"];

export function ContactForm({ contact, agents, onSuccess, onCancel }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const isEditing = !!contact;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (!formData.get("first_name") || !formData.get("last_name")) {
      setError("First name and last name are required");
      return;
    }

    startTransition(async () => {
      const action = isEditing ? updateContactAction : createContactAction;
      const result = await action(formData);
      if (result.error) setError(result.error);
      else onSuccess();
    });
  }

  const selectClass = "w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={contact.id} />}

      {error && (
        <div className="px-3 py-2 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === i ? "bg-emerald-primary/10 text-emerald-primary" : "text-secondary hover:text-heading hover:bg-bg-alt"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Personal */}
      <div className={activeTab === 0 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" name="first_name" required defaultValue={contact?.first_name || ""} />
          <Input label="Last Name" name="last_name" required defaultValue={contact?.last_name || ""} />
        </div>
        <Input label="Preferred Name" name="preferred_name" defaultValue={contact?.preferred_name || ""} />
        <Input label="Email" name="email" type="email" defaultValue={contact?.email || ""} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" name="phone" defaultValue={contact?.phone || ""} />
          <Input label="Secondary Phone" name="secondary_phone" defaultValue={contact?.secondary_phone || ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date of Birth" name="date_of_birth" type="date" defaultValue={contact?.date_of_birth || ""} />
          <Input label="Nationality" name="nationality" defaultValue={contact?.nationality || ""} />
        </div>
        <Input label="Country of Residence" name="country_of_residence" defaultValue={contact?.country_of_residence || ""} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Classification</label>
          <select name="classification" defaultValue={contact?.classification || "prospect"} className={selectClass}>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      {/* Address */}
      <div className={activeTab === 1 ? "space-y-4" : "hidden"}>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Residential</p>
        <Input label="Address Line 1" name="address_line_1" defaultValue={contact?.address_line_1 || ""} />
        <Input label="Address Line 2" name="address_line_2" defaultValue={contact?.address_line_2 || ""} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Suburb" name="suburb" defaultValue={contact?.suburb || ""} />
          <Input label="State" name="state" defaultValue={contact?.state || ""} />
          <Input label="Postcode" name="postcode" defaultValue={contact?.postcode || ""} />
        </div>
        <Input label="Country" name="country" defaultValue={contact?.country || "AU"} />

        <p className="text-xs font-semibold text-secondary uppercase tracking-wider pt-2">Postal Address</p>
        <Input label="Postal Line 1" name="postal_address_line_1" defaultValue={contact?.postal_address_line_1 || ""} />
        <Input label="Postal Line 2" name="postal_address_line_2" defaultValue={contact?.postal_address_line_2 || ""} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Suburb" name="postal_suburb" defaultValue={contact?.postal_suburb || ""} />
          <Input label="State" name="postal_state" defaultValue={contact?.postal_state || ""} />
          <Input label="Postcode" name="postal_postcode" defaultValue={contact?.postal_postcode || ""} />
        </div>
        <Input label="Country" name="postal_country" defaultValue={contact?.postal_country || ""} />
      </div>

      {/* ID & Employment */}
      <div className={activeTab === 2 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-heading">ID Type</label>
            <select name="id_type" defaultValue={contact?.id_type || ""} className={selectClass}>
              <option value="">Select…</option>
              {ID_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <Input label="ID Number" name="id_number" defaultValue={contact?.id_number || ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="ID Expiry" name="id_expiry" type="date" defaultValue={contact?.id_expiry || ""} />
          <Input label="ID Country" name="id_country" defaultValue={contact?.id_country || ""} />
        </div>
        <Input label="Employer" name="employer" defaultValue={contact?.employer || ""} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Occupation" name="occupation" defaultValue={contact?.occupation || ""} />
          <Input label="Company" name="company" defaultValue={contact?.company || ""} />
        </div>
      </div>

      {/* Legal */}
      <div className={activeTab === 3 ? "space-y-4" : "hidden"}>
        <Input label="Solicitor Name" name="solicitor_name" defaultValue={contact?.solicitor_name || ""} />
        <Input label="Solicitor Firm" name="solicitor_firm" defaultValue={contact?.solicitor_firm || ""} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Solicitor Email" name="solicitor_email" type="email" defaultValue={contact?.solicitor_email || ""} />
          <Input label="Solicitor Phone" name="solicitor_phone" defaultValue={contact?.solicitor_phone || ""} />
        </div>
      </div>

      {/* Preferences */}
      <div className={activeTab === 4 ? "space-y-4" : "hidden"}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Preferred Contact Method</label>
          <select name="preferred_contact_method" defaultValue={contact?.preferred_contact_method || ""} className={selectClass}>
            <option value="">Select…</option>
            {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="marketing_consent"
            defaultChecked={contact?.marketing_consent ?? false}
            className="w-4 h-4 rounded border-border text-emerald-primary focus:ring-emerald-primary cursor-pointer accent-[#1A9E6F]"
          />
          <span className="text-sm text-heading">Marketing consent</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Source</label>
          <select name="source" defaultValue={contact?.source || ""} className={selectClass}>
            <option value="">Select…</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <Input label="Source Detail" name="source_detail" defaultValue={contact?.source_detail || ""} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Referring Agent</label>
          <select name="referring_agent_id" defaultValue={contact?.referring_agent_id || ""} className={selectClass}>
            <option value="">None</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
            ))}
          </select>
        </div>
        <Input
          label="Tags (comma separated)"
          name="tags"
          defaultValue={(contact?.tags || []).join(", ")}
          placeholder="e.g. investor, cross-street"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={contact?.notes || ""}
            placeholder="Optional notes…"
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm placeholder:text-muted hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Update Contact" : "Add Contact"}
        </Button>
      </div>
    </form>
  );
}
