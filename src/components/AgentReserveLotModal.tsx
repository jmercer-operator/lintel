"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ContactForm } from "@/components/ContactForm";
import { Avatar } from "@/components/Avatar";
import type { Agent, StockItem } from "@/lib/types";
import { formatPrice } from "@/lib/types";

interface AgentContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  agents: Agent[];
  agentContacts: AgentContact[];
  agentId: string;
}

type Step = "project" | "lot" | "customer";

export function AgentReserveLotModal({ open, onClose, projects, agents, agentContacts, agentId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("project");
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [availableLots, setAvailableLots] = useState<StockItem[]>([]);
  const [selectedLot, setSelectedLot] = useState<StockItem | null>(null);
  const [loadingLots, setLoadingLots] = useState(false);
  const [customerMode, setCustomerMode] = useState<"choose" | "new" | "existing">("choose");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("project");
      setSelectedProject(null);
      setSelectedLot(null);
      setCustomerMode("choose");
      setSearch("");
      setError(null);
    }
  }, [open]);

  // Load available lots when project selected
  useEffect(() => {
    if (!selectedProject) return;
    setLoadingLots(true);
    fetch(`/api/stock?project_id=${selectedProject.id}&agent_id=${agentId}&status=Available,EOI`)
      .then(r => r.json())
      .then(data => {
        setAvailableLots(Array.isArray(data) ? data : []);
        setLoadingLots(false);
      })
      .catch(() => setLoadingLots(false));
  }, [selectedProject, agentId]);

  async function handleLinkExisting(contactId: string) {
    if (!selectedLot) return;
    setSaving(true);
    setError(null);
    try {
      // Update lot status to Under Contract
      await fetch("/api/agent/update-lot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: selectedLot.id, status: "Under Contract", agentId }),
      });
      // Link customer to lot
      await fetch("/api/agent/link-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: selectedLot.id, contactId, projectId: selectedProject!.id }),
      });
      router.refresh();
      onClose();
    } catch {
      setError("Failed to reserve lot");
    }
    setSaving(false);
  }

  async function handleNewCustomerSubmit(formData: FormData) {
    if (!selectedLot || !selectedProject) return;
    setSaving(true);
    setError(null);
    try {
      // Create contact
      const res = await fetch("/api/agent/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.get("first_name"),
          last_name: formData.get("last_name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          agentId,
        }),
      });
      const contact = await res.json();
      if (contact.id) {
        // Update lot status
        await fetch("/api/agent/update-lot-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockId: selectedLot.id, status: "Under Contract", agentId }),
        });
        // Link customer
        await fetch("/api/agent/link-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockId: selectedLot.id, contactId: contact.id, projectId: selectedProject.id }),
        });
        router.refresh();
        onClose();
      } else {
        setError(contact.error || "Failed to create customer");
      }
    } catch {
      setError("Failed to reserve lot");
    }
    setSaving(false);
  }

  const filteredContacts = search.length > 0
    ? agentContacts.filter(c => `${c.first_name} ${c.last_name} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(search.toLowerCase()))
    : agentContacts;

  return (
    <Modal open={open} onClose={onClose} title={
      step === "project" ? "Reserve a Lot — Select Project" :
      step === "lot" ? `Reserve a Lot — ${selectedProject?.name}` :
      `Reserve Lot ${selectedLot?.lot_number} — Link Customer`
    }>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Step 1: Select Project */}
      {step === "project" && (
        <div className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-secondary py-4 text-center">No projects assigned</p>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProject(p); setStep("lot"); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-emerald-primary hover:bg-emerald-primary/5 transition-colors cursor-pointer"
              >
                <p className="font-semibold text-heading text-sm">{p.name}</p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Step 2: Select Lot */}
      {step === "lot" && (
        <div className="space-y-2">
          <button onClick={() => setStep("project")} className="text-xs text-emerald-primary hover:underline mb-2 cursor-pointer">← Back to projects</button>
          {loadingLots ? (
            <p className="text-sm text-secondary py-4 text-center">Loading lots...</p>
          ) : availableLots.length === 0 ? (
            <p className="text-sm text-secondary py-4 text-center">No available lots in this project</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableLots.map(lot => (
                <button
                  key={lot.id}
                  onClick={() => { setSelectedLot(lot); setStep("customer"); setCustomerMode("choose"); }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-emerald-primary hover:bg-emerald-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-heading text-sm font-mono">Lot {lot.lot_number}</p>
                      <p className="text-xs text-secondary">
                        {[lot.bedrooms && `${lot.bedrooms} bed`, lot.bathrooms && `${lot.bathrooms} bath`, lot.car_spaces && `${lot.car_spaces} car`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className="font-mono font-semibold text-heading text-sm">{formatPrice(lot.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Link Customer */}
      {step === "customer" && customerMode === "choose" && (
        <div className="space-y-3">
          <button onClick={() => setStep("lot")} className="text-xs text-emerald-primary hover:underline mb-2 cursor-pointer">← Back to lots</button>
          <p className="text-sm text-secondary">Who is reserving <strong>Lot {selectedLot?.lot_number}</strong>?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCustomerMode("new")}
              className="px-4 py-6 rounded-xl border border-border hover:border-emerald-primary hover:bg-emerald-primary/5 transition-colors text-center cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-emerald-primary">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <p className="text-sm font-semibold text-heading">New Customer</p>
            </button>
            <button
              onClick={() => setCustomerMode("existing")}
              className="px-4 py-6 rounded-xl border border-border hover:border-emerald-primary hover:bg-emerald-primary/5 transition-colors text-center cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-emerald-primary">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-sm font-semibold text-heading">Existing Customer</p>
            </button>
          </div>
        </div>
      )}

      {/* New Customer Form */}
      {step === "customer" && customerMode === "new" && (
        <div>
          <button onClick={() => setCustomerMode("choose")} className="text-xs text-emerald-primary hover:underline mb-3 cursor-pointer">← Back</button>
          <form onSubmit={(e) => { e.preventDefault(); handleNewCustomerSubmit(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-heading mb-1">First Name *</label>
                <input type="text" name="first_name" required className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-heading mb-1">Last Name *</label>
                <input type="text" name="last_name" required className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-heading mb-1">Email</label>
              <input type="email" name="email" className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-heading mb-1">Phone</label>
              <input type="tel" name="phone" className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCustomerMode("choose")}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Reserving..." : "Reserve Lot"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Customer Search */}
      {step === "customer" && customerMode === "existing" && (
        <div>
          <button onClick={() => setCustomerMode("choose")} className="text-xs text-emerald-primary hover:underline mb-3 cursor-pointer">← Back</button>
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none mb-3"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredContacts.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">No customers found</p>
            ) : (
              filteredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleLinkExisting(c.id)}
                  disabled={saving}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-alt transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-heading">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-secondary">{c.email || c.phone || "—"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
