"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ContactForm } from "@/components/ContactForm";
import { linkContactToStockAction } from "@/lib/actions";
import type { StockItem, Agent, ContactWithLinkedStock } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  stock: StockItem;
  projectId: string;
  agents: Agent[];
  contacts: ContactWithLinkedStock[];
}

export function ReserveLotModal({ open, onClose, stock, projectId, agents, contacts }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "new" | "existing">("choose");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");

  const filteredContacts = search.length > 0
    ? contacts.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
      )
    : contacts;

  function handleLinkExisting() {
    if (!selectedContactId) {
      setError("Please select a contact");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contact_id", selectedContactId);
      formData.set("stock_id", stock.id);
      formData.set("project_id", projectId);
      const result = await linkContactToStockAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        handleClose();
      }
    });
  }

  function handleClose() {
    setMode("choose");
    setSearch("");
    setSelectedContactId("");
    setError(null);
    onClose();
  }

  const title = mode === "choose"
    ? `Reserve Lot ${stock.lot_number}`
    : mode === "new"
    ? `New Customer for Lot ${stock.lot_number}`
    : `Link Customer to Lot ${stock.lot_number}`;

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {error && (
        <div className="px-3 py-2 mb-4 rounded-[var(--radius-input)] bg-error/10 text-error text-sm">{error}</div>
      )}

      {mode === "choose" && (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Link a customer to Lot {stock.lot_number}. The lot status will automatically change to EOI.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("new")}
              className="p-6 rounded-[var(--radius-card)] border-2 border-border hover:border-emerald-primary/50 transition-colors cursor-pointer text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-primary/10 flex items-center justify-center text-emerald-primary group-hover:bg-emerald-primary/20 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <p className="font-semibold text-heading text-sm">Link Existing Customer</p>
              <p className="text-xs text-secondary mt-1">Search and link an existing contact</p>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <ContactForm
            agents={agents}
            defaultStockId={stock.id}
            defaultProjectId={projectId}
            onSuccess={() => {
              router.refresh();
              handleClose();
            }}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name or email…"
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] border border-border bg-white text-body text-sm hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          />

          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-[var(--radius-input)]">
            {filteredContacts.length === 0 ? (
              <p className="text-sm text-secondary text-center py-6">No customers found</p>
            ) : (
              filteredContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedContactId(c.id)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                    selectedContactId === c.id
                      ? "bg-emerald-primary/10 border-l-2 border-l-emerald-primary"
                      : "hover:bg-bg-alt"
                  }`}
                >
                  <div>
                    <span className="font-medium text-heading">{c.first_name} {c.last_name}</span>
                    {c.email && <span className="text-secondary ml-2 text-xs">{c.email}</span>}
                  </div>
                  {selectedContactId === c.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A9E6F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleLinkExisting} disabled={!selectedContactId || isPending}>
              {isPending ? "Linking…" : "Link Customer"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
