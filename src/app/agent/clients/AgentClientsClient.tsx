"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { ContactForm } from "@/components/ContactForm";
import type { StockStatus, Agent } from "@/lib/types";

interface AgentClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  classification: string;
  created_at: string;
  linked_lots: Array<{ lot_number: string; project_name: string; status: string }>;
}

interface Props {
  clients: AgentClient[];
  agents: Agent[];
  agentId: string;
}

export function AgentClientsClient({ clients, agents, agentId }: Props) {
  const [search, setSearch] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const router = useRouter();

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      !term ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Clients</h1>
          <p className="text-secondary text-sm mt-1">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-primary text-white rounded-[var(--radius-button)] text-sm font-semibold hover:bg-emerald-dark transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white placeholder:text-muted focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Client Cards */}
      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <svg className="mx-auto text-muted mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-heading font-semibold">No clients found</p>
            <p className="text-sm text-muted mt-1">
              {search ? "Try a different search term" : "Your clients will appear here"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} padding="md" className="hover:border-emerald-primary/30 cursor-pointer" onClick={() => router.push(`/agent/clients/${client.id}`)}>
              <div className="flex items-start gap-3">
                <Avatar name={`${client.first_name} ${client.last_name}`} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-heading truncate">
                    {client.first_name} {client.last_name}
                  </h3>
                  <span className={`inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    client.classification === "customer"
                      ? "bg-[#1A9E6F]/10 text-[#1A9E6F]"
                      : "bg-[#D4A855]/10 text-[#D4A855]"
                  }`}>
                    {client.classification}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {client.email && (
                  <p className="text-xs text-secondary truncate flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-xs text-secondary flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {client.phone}
                  </p>
                )}
              </div>

              {/* Linked Lots */}
              {client.linked_lots.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Linked Lots</p>
                  <div className="space-y-1">
                    {client.linked_lots.map((lot, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-secondary">
                          <span className="font-mono font-semibold text-heading">{lot.lot_number}</span>
                          {" — "}{lot.project_name}
                        </span>
                        <StatusBadge status={lot.status as StockStatus} className="!text-[9px] !px-1.5 !py-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal open={showAddClient} onClose={() => setShowAddClient(false)} title="Add Client">
        <ContactForm
          agents={agents}
          onSuccess={() => {
            setShowAddClient(false);
            router.refresh();
          }}
          onCancel={() => setShowAddClient(false)}
          defaultAgentId={agentId}
        />
      </Modal>
    </div>
  );
}
