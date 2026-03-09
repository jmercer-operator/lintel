"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createContactAction, updateContactAction } from "@/lib/actions";
import type { Contact, Agent } from "@/lib/types";

interface ContactFormProps {
  contact?: Contact | null;
  agents: Agent[];
  onSuccess: () => void;
  onCancel: () => void;
  defaultStockId?: string;
  defaultProjectId?: string;
}

const TABS = ["Personal", "Address", "ID & Employment", "Legal", "Preferences"] as const;

const ID_TYPES = ["passport", "drivers_license", "national_id", "other"];
const CONTACT_METHODS = ["email", "phone", "sms", "whatsapp"];

export function ContactForm({ contact, agents, onSuccess, onCancel, defaultStockId, defaultProjectId }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Source agent autocomplete state
  const [sourceType, setSourceType] = useState<string>(() => {
    if (contact?.source === "direct_marketing") return "direct_marketing";
    if (contact?.referring_agent_id) return "agent";
    return contact?.source || "";
  });
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(contact?.referring_agent_id || "");
  const [selectedAgentName, setSelectedAgentName] = useState<string>(() => {
    if (contact?.referring_agent_id) {
      const a = agents.find(ag => ag.id === contact.referring_agent_id);
      return a ? `${a.first_name} ${a.last_name}` : "";
    }
    return "";
  });
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // FIRB state
  const [firbRequired, setFirbRequired] = useState(contact?.firb_required ?? false);

  const filteredAgents = agentSearch.length > 0
    ? agents.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(agentSearch.toLowerCase()) ||
        (a.agency && a.agency.toLowerCase().includes(agentSearch.toLowerCase()))
      )
    : agents;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isEditing = !!contact;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (!formData.get("first_name") || !formData.get("last_name")) {
      setError("First name and last name are required");
      return;
    }

    if (!formData.get("buyer_type")) {
      setError("Buyer type is required");
      setActiveTab(0);
      return;
    }

    // Set source & agent fields based on source type
    if (sourceType === "direct_marketing") {
      formData.set("source", "direct_marketing");
      formData.set("referring_agent_id", "");
    } else if (sourceType === "agent" && selectedAgentId) {
      formData.set("source", "agent");
      formData.set("referring_agent_id", selectedAgentId);
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
      {defaultStockId && <input type="hidden" name="default_stock_id" value={defaultStockId} />}
      {defaultProjectId && <input type="hidden" name="default_project_id" value={defaultProjectId} />}

      {/* Hidden fields for source/agent */}
      <input type="hidden" name="source" value={sourceType === "direct_marketing" ? "direct_marketing" : sourceType === "agent" ? "agent" : sourceType} />
      <input type="hidden" name="referring_agent_id" value={sourceType === "agent" ? selectedAgentId : ""} />
      <input type="hidden" name="firb_required" value={firbRequired ? "true" : "false"} />

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

        {/* Buyer Type — required */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Buyer Type <span className="text-error">*</span></label>
          <select name="buyer_type" defaultValue={contact?.buyer_type || ""} required className={selectClass}>
            <option value="">Select…</option>
            <option value="owner_occupier">Owner Occupier</option>
            <option value="investor">Investor</option>
          </select>
        </div>

        <Input label="Email" name="email" type="email" defaultValue={contact?.email || ""} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" name="phone" defaultValue={contact?.phone || ""} />
          <Input label="Secondary Phone" name="secondary_phone" defaultValue={contact?.secondary_phone || ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date of Birth" name="date_of_birth" type="date" defaultValue={contact?.date_of_birth || ""} />
          <Input label="Nationality" name="nationality" defaultValue={contact?.nationality || ""} />
        </div>

        {/* FIRB Required instead of Country of Residence */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">FIRB Approval Required</label>
          <select
            value={firbRequired ? "true" : "false"}
            onChange={(e) => setFirbRequired(e.target.value === "true")}
            className={selectClass}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>

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

      {/* ID & Employment — removed Company */}
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
        <Input label="Occupation" name="occupation" defaultValue={contact?.occupation || ""} />
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

        {/* Source: Agent Autocomplete or Direct Marketing */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading">Contact Source</label>
          <select
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value);
              if (e.target.value !== "agent") {
                setSelectedAgentId("");
                setSelectedAgentName("");
              }
            }}
            className={selectClass}
          >
            <option value="">Select…</option>
            <option value="agent">Agent Referral</option>
            <option value="direct_marketing">Direct Marketing</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="social_media">Social Media</option>
            <option value="walk_in">Walk In</option>
            <option value="event">Event</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Agent autocomplete when source is agent */}
        {sourceType === "agent" && (
          <div className="flex flex-col gap-1.5 relative" ref={agentDropdownRef}>
            <label className="text-sm font-medium text-heading">Referring Agent</label>
            <input
              type="text"
              value={selectedAgentName || agentSearch}
              onChange={(e) => {
                setAgentSearch(e.target.value);
                setSelectedAgentName("");
                setSelectedAgentId("");
                setShowAgentDropdown(true);
              }}
              onFocus={() => setShowAgentDropdown(true)}
              placeholder="Type to search agents…"
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
            />
            {showAgentDropdown && filteredAgents.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-[var(--radius-input)] shadow-lg max-h-48 overflow-y-auto">
                {filteredAgents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAgentId(a.id);
                      setSelectedAgentName(`${a.first_name} ${a.last_name}`);
                      setAgentSearch("");
                      setShowAgentDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-bg-alt transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-heading">{a.first_name} {a.last_name}</span>
                    {a.agency && <span className="text-secondary ml-2">({a.agency})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Input label="Source Detail" name="source_detail" defaultValue={contact?.source_detail || ""} />
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
