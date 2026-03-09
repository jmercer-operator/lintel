"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { BuyerTypeBadge, FirbBadge } from "@/components/BuyerTypeBadge";
import { ContactForm } from "@/components/ContactForm";
import { Avatar } from "@/components/Avatar";
import { ClientDocuments } from "@/components/ClientDocuments";
import type { ClientDocument } from "@/components/ClientDocuments";
import type { ContactWithLinkedStock, Agent, StockStatus, BuyerType } from "@/lib/types";

interface Props {
  contact: ContactWithLinkedStock;
  agents: Agent[];
  clientDocuments: ClientDocument[];
  agentId: string;
}

export function AgentClientDetailClient({ contact, agents, clientDocuments, agentId }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/agent/clients"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        My Clients
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={`${contact.first_name} ${contact.last_name}`} size="lg" />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-heading">
                {contact.first_name} {contact.last_name}
              </h1>
              <ClassificationBadge classification={contact.computed_classification} />
              <BuyerTypeBadge buyerType={contact.buyer_type as BuyerType | null} />
              <FirbBadge required={contact.firb_required} />
            </div>
            {contact.preferred_name && (
              <p className="text-secondary text-sm">
                Goes by &ldquo;{contact.preferred_name}&rdquo;
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>Edit Contact</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Email" value={contact.email} />
              <Detail label="Phone" value={contact.phone} mono />
              <Detail label="Secondary Phone" value={contact.secondary_phone} mono />
              <Detail label="Date of Birth" value={contact.date_of_birth} />
              <Detail label="Nationality" value={contact.nationality} />
              <Detail label="FIRB Approval Required" value={contact.firb_required ? "Yes" : "No"} />
            </div>
          </Card>

          {/* Address */}
          {(contact.address_line_1 || contact.suburb) && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Address</h3>
              <div className="text-sm text-body space-y-1">
                {contact.address_line_1 && <p>{contact.address_line_1}</p>}
                {contact.address_line_2 && <p>{contact.address_line_2}</p>}
                <p>
                  {[contact.suburb, contact.state, contact.postcode].filter(Boolean).join(", ")}
                </p>
              </div>
              {contact.postal_address_line_1 && (
                <>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mt-4 mb-2">
                    Postal
                  </p>
                  <div className="text-sm text-body space-y-1">
                    <p>{contact.postal_address_line_1}</p>
                    {contact.postal_address_line_2 && <p>{contact.postal_address_line_2}</p>}
                    <p>
                      {[contact.postal_suburb, contact.postal_state, contact.postal_postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* ID & Employment */}
          {(contact.id_type || contact.employer || contact.occupation) && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">ID &amp; Employment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="ID Type" value={contact.id_type?.replace(/_/g, " ")} />
                <Detail label="ID Number" value={contact.id_number} mono />
                <Detail label="ID Expiry" value={contact.id_expiry} />
                <Detail label="ID Country" value={contact.id_country} />
                <Detail label="Employer" value={contact.employer} />
                <Detail label="Occupation" value={contact.occupation} />
              </div>
            </Card>
          )}

          {/* Solicitor */}
          {(contact.solicitor_name || contact.solicitor_firm) && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Solicitor</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Name" value={contact.solicitor_name} />
                <Detail label="Firm" value={contact.solicitor_firm} />
                <Detail label="Email" value={contact.solicitor_email} />
                <Detail label="Phone" value={contact.solicitor_phone} mono />
              </div>
            </Card>
          )}

          {/* Purchased Properties */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Purchased Properties</h3>
            {contact.linked_stock.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto text-muted mb-3"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <p className="text-sm text-secondary">No properties linked yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contact.linked_stock.map((ls) => (
                  <Link
                    key={ls.stock_id}
                    href={`/agent/projects/${ls.project_id}`}
                    className="block rounded-[var(--radius-card)] border border-border hover:border-emerald-primary/30 p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-heading text-lg">
                          Lot {ls.lot_number}
                        </span>
                      </div>
                      <StatusBadge status={ls.status as StockStatus} />
                    </div>
                    <p className="text-sm text-secondary mb-2">{ls.project_name}</p>
                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span className="capitalize text-emerald-primary font-medium">{ls.role}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Client Documents */}
          <ClientDocuments
            contactId={contact.id}
            documents={clientDocuments}
            firbRequired={contact.firb_required}
          />
        </div>

        {/* Right column - Meta */}
        <div className="space-y-6">
          {/* Contact Info Quick Card */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Quick Contact</h3>
            <div className="space-y-3">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-input)] border border-border hover:border-emerald-primary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-primary/10 flex items-center justify-center text-emerald-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Phone</p>
                    <p className="text-sm font-mono text-heading">{contact.phone}</p>
                  </div>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-input)] border border-border hover:border-emerald-primary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#D4A855]/10 flex items-center justify-center text-[#D4A855]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Email</p>
                    <p className="text-sm text-heading truncate">{contact.email}</p>
                  </div>
                </a>
              )}
            </div>
          </Card>

          {/* Tags */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Tags</h3>
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-bg-alt rounded-full text-xs text-secondary font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">No tags</p>
            )}
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card>
              <h3 className="font-semibold text-heading mb-4">Notes</h3>
              <p className="text-sm text-body whitespace-pre-wrap">{contact.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact">
        <ContactForm
          contact={contact}
          agents={agents}
          defaultAgentId={agentId}
          onSuccess={() => {
            setShowEditModal(false);
            router.refresh();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-secondary mb-0.5">{label}</p>
      <p className={`text-body ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}
