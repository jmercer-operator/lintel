"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ContactForm } from "@/components/ContactForm";
import { Avatar } from "@/components/Avatar";
import type { Agent } from "@/lib/types";

interface AgentContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  classification: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lotId: string;
  lotNumber: string;
  projectId: string;
  agents: Agent[];
  agentContacts: AgentContact[];
  agentId: string;
}

export function AgentLinkCustomerModal({
  open,
  onClose,
  lotId,
  lotNumber,
  projectId,
  agents,
  agentContacts,
  agentId,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "new" | "existing">("choose");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  const filteredContacts =
    search.length > 0
      ? agentContacts.filter(
          (c) =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
            (c.phone && c.phone.includes(search))
        )
      : agentContacts;

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLinkExisting() {
    if (selectedContactIds.size === 0) {
      setError("Please select at least one contact");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const contactIds = Array.from(selectedContactIds);
        const res = await fetch("/api/agent/link-customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stock_id: lotId,
            project_id: projectId,
            contact_ids: contactIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to link customers");
        } else {
          router.refresh();
          handleClose();
        }
      } catch {
        setError("Failed to link customers");
      }
    });
  }

  function handleClose() {
    setMode("choose");
    setSearch("");
    setSelectedContactIds(new Set());
    setError(null);
    onClose();
  }

  function handleNewContactSuccess() {
    router.refresh();
    handleClose();
  }

  const title =
    mode === "choose"
      ? `Link Customer to Lot ${lotNumber}`
      : mode === "new"
      ? `New Customer for Lot ${lotNumber}`
      : `Link Existing Customer to Lot ${lotNumber}`;

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {error && (
        <div className="px-3 py-2 mb-4 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      {mode === "choose" && (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Link a customer to Lot {lotNumber}. The lot status will automatically change to EOI.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("new")}
              className="p-6 rounded-[var(--radius-card)] border-2 border-border hover:border-emerald-primary/50 transition-colors cursor-pointer text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-primary/10 flex items-center justify-center text-emerald-primary group-hover:bg-emerald-primary/20 transition-colors">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <p className="font-semibold text-heading text-sm">Add New Customer</p>
              <p className="text-xs text-secondary mt-1">Create a new contact and link to this lot</p>
            </button>
            <button
              onClick={() => setMode("existing")}
              className="p-6 rounded-[var(--radius-card)] border-2 border-border hover:border-emerald-primary/50 transition-colors cursor-pointer text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D4A855]/10 flex items-center justify-center text-[#D4A855] group-hover:bg-[#D4A855]/20 transition-colors">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <p className="font-semibold text-heading text-sm">Link Existing Customer</p>
              <p className="text-xs text-secondary mt-1">Select one or more existing contacts</p>
            </button>
          </div>
        </div>
      )}

      {mode === "new" && (
        <div>
          <button
            onClick={() => setMode("choose")}
            className="text-sm text-secondary hover:text-heading mb-4 flex items-center gap-1 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <ContactForm
            agents={agents}
            defaultStockId={lotId}
            defaultProjectId={projectId}
            defaultAgentId={agentId}
            onSuccess={handleNewContactSuccess}
            onCancel={handleClose}
          />
        </div>
      )}

      {mode === "existing" && (
        <div className="space-y-4">
          <button
            onClick={() => setMode("choose")}
            className="text-sm text-secondary hover:text-heading flex items-center gap-1 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          <p className="text-sm text-secondary">
            Select contacts to link. Multiple selections allowed for co-buyers.
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          />

          <div className="max-h-64 overflow-y-auto border border-border rounded-[var(--radius-input)]">
            {filteredContacts.length === 0 ? (
              <p className="text-sm text-secondary text-center py-6">No contacts found</p>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = selectedContactIds.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors cursor-pointer border-b border-border last:border-0 ${
                      isSelected ? "bg-emerald-primary/5" : "hover:bg-bg-alt"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleContact(c.id)}
                      className="w-4 h-4 rounded border-border text-emerald-primary focus:ring-emerald-primary accent-[#1A9E6F] cursor-pointer"
                    />
                    <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-heading">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.email && (
                        <span className="text-secondary ml-2 text-xs">{c.email}</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        c.classification === "customer"
                          ? "bg-[#1A9E6F]/10 text-[#1A9E6F]"
                          : "bg-[#D4A855]/10 text-[#D4A855]"
                      }`}
                    >
                      {c.classification}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {selectedContactIds.size > 0 && (
            <p className="text-xs text-secondary">
              {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""} selected
              {selectedContactIds.size > 1 && " — first will be buyer, others co-buyers"}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkExisting}
              disabled={selectedContactIds.size === 0 || isPending}
            >
              {isPending
                ? "Linking…"
                : `Link ${selectedContactIds.size || ""} Customer${selectedContactIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
