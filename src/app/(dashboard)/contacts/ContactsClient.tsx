"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { ContactForm } from "@/components/ContactForm";
import { createContactAction } from "@/lib/actions";
import { BuyerTypeBadge } from "@/components/BuyerTypeBadge";
import { timeAgo, type ContactWithLinkedStock, type Agent, type ProjectWithStats, type BuyerType } from "@/lib/types";

interface Props {
  contacts: ContactWithLinkedStock[];
  agents: Agent[];
  projects: ProjectWithStats[];
  currentTab: string;
  searchQuery: string;
}

export function ContactsClient({ contacts, agents, projects, currentTab, searchQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMailGroup, setShowMailGroup] = useState(false);
  const [search, setSearch] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  const tabs = [
    { label: "All", value: "all" },
    { label: "Prospects", value: "prospect" },
    { label: "Customers", value: "customer" },
  ];

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("search", value);
      else params.delete("search");
      startTransition(() => {
        router.push(`/contacts?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") params.delete("tab");
    else params.set("tab", tab);
    router.push(`/contacts?${params.toString()}`);
  };

  const handleExportCSV = () => {
    const emailContacts = contacts.filter((c) => c.email && c.marketing_consent);
    const csv = ["Name,Email", ...emailContacts.map((c) => `"${c.first_name} ${c.last_name}","${c.email}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${currentTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Customers</h1>
          <p className="text-secondary text-sm mt-1">{contacts.length} customer{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowMailGroup(!showMailGroup)}>
            <MailIcon />
            Mail Group
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Mail Group Builder */}
      {showMailGroup && (
        <div className="bg-white rounded-[var(--radius-card)] border border-border p-5 mb-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-heading">Mail Group Builder</h3>
            <button onClick={() => setShowMailGroup(false)} className="text-secondary hover:text-heading cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p className="text-sm text-secondary mb-3">
            {contacts.filter((c) => c.email && c.marketing_consent).length} contacts with email &amp; marketing consent in current view
          </p>
          <Button variant="accent" onClick={handleExportCSV}>
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-alt rounded-[var(--radius-button)] p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors cursor-pointer ${
              currentTab === tab.value
                ? "bg-white text-heading shadow-sm"
                : "text-secondary hover:text-heading"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 max-w-sm">
        <Input
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[var(--radius-card)] border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-alt/50">
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider hidden xl:table-cell">Buyer</th>
                <th className="text-left px-4 py-3 font-semibold text-secondary text-xs uppercase tracking-wider hidden md:table-cell">Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                    No customers found
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-border last:border-0 hover:bg-bg-alt/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-heading">
                      {contact.first_name} {contact.last_name}
                    </td>
                    <td className="px-4 py-3 text-secondary font-mono text-xs">{contact.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <ClassificationBadge classification={contact.computed_classification} />
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs">
                      {contact.referring_agent_id
                        ? (() => { const a = agents.find(ag => ag.id === contact.referring_agent_id); return a ? `${a.first_name} ${a.last_name}` : "—"; })()
                        : contact.source === "direct_marketing" ? <span className="text-muted italic">Direct</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs">
                      {contact.linked_stock.length > 0
                        ? [...new Set(contact.linked_stock.map(s => s.project_name))].join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <BuyerTypeBadge buyerType={contact.buyer_type as BuyerType | null} />
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs hidden md:table-cell">{timeAgo(contact.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact">
        <ContactForm
          agents={agents}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
