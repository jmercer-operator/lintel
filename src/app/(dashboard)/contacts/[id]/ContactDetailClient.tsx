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
import { formatPrice, type ContactWithLinkedStock, type Agent, type StockStatus, type BuyerType } from "@/lib/types";
import { ClientDocuments } from "@/components/ClientDocuments";
import type { ClientDocument } from "@/components/ClientDocuments";

interface Props {
  contact: ContactWithLinkedStock;
  agents: Agent[];
  clientDocuments: ClientDocument[];
}

export function ContactDetailClient({ contact, agents, clientDocuments }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const referringAgent = agents.find((a) => a.id === contact.referring_agent_id);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Back + Header */}
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Customers
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-heading">{contact.first_name} {contact.last_name}</h1>
            <ClassificationBadge classification={contact.computed_classification} />
            <BuyerTypeBadge buyerType={contact.buyer_type as BuyerType | null} />
            <FirbBadge required={contact.firb_required} />
          </div>
          {contact.preferred_name && (
            <p className="text-secondary text-sm">Goes by &ldquo;{contact.preferred_name}&rdquo;</p>
          )}
        </div>
        <Button onClick={() => setShowEditModal(true)}>Edit Customer</Button>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)} className="!text-red-600 !border-red-200 hover:!bg-red-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Delete
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
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
                <p>{[contact.suburb, contact.state, contact.postcode].filter(Boolean).join(", ")}</p>
              </div>
              {contact.postal_address_line_1 && (
                <>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mt-4 mb-2">Postal</p>
                  <div className="text-sm text-body space-y-1">
                    <p>{contact.postal_address_line_1}</p>
                    {contact.postal_address_line_2 && <p>{contact.postal_address_line_2}</p>}
                    <p>{[contact.postal_suburb, contact.postal_state, contact.postal_postcode].filter(Boolean).join(", ")}</p>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* ID & Employment — removed Company */}
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

          {/* Linked Lots */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Linked Lots</h3>
            {contact.linked_stock.length === 0 ? (
              <p className="text-sm text-secondary">No linked lots</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Lot</th>
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Project</th>
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Status</th>
                      <th className="text-right pb-2 font-semibold text-secondary text-xs uppercase">Price</th>
                      <th className="text-left pb-2 font-semibold text-secondary text-xs uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contact.linked_stock.map((ls) => (
                      <tr key={ls.stock_id} className="border-b border-border last:border-0">
                        <td className="py-2 font-mono text-xs">{ls.lot_number}</td>
                        <td className="py-2">
                          <Link href={`/projects/${ls.project_id}`} className="text-emerald-primary hover:underline">
                            {ls.project_name}
                          </Link>
                        </td>
                        <td className="py-2"><StatusBadge status={ls.status as StockStatus} /></td>
                        <td className="py-2 text-right font-mono text-xs">{formatPrice(ls.price)}</td>
                        <td className="py-2 capitalize text-secondary">{ls.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Client Documents */}
          <ClientDocuments contactId={contact.id} documents={clientDocuments} firbRequired={contact.firb_required} />

          {/* Activity Timeline Placeholder */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Activity</h3>
            <div className="text-center py-6">
              <p className="text-sm text-secondary">Activity timeline coming soon</p>
            </div>
          </Card>
        </div>

        {/* Right column - Meta */}
        <div className="space-y-6">
          {/* Source & Attribution */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Source</h3>
            <div className="space-y-3 text-sm">
              <Detail label="Source" value={contact.source?.replace(/_/g, " ")} />
              <Detail label="Detail" value={contact.source_detail} />
              <Detail label="Referring Agent" value={referringAgent ? `${referringAgent.first_name} ${referringAgent.last_name}` : null} />
              <Detail label="Contact Method" value={contact.preferred_contact_method} />
              <div>
                <p className="text-xs text-secondary mb-1">Marketing Consent</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  contact.marketing_consent ? "bg-[#1A9E6F]/10 text-[#1A9E6F]" : "bg-error/10 text-error"
                }`}>
                  {contact.marketing_consent ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </Card>

          {/* Tags */}
          <Card>
            <h3 className="font-semibold text-heading mb-4">Tags</h3>
            {(contact.tags && contact.tags.length > 0) ? (
              <div className="flex gap-2 flex-wrap">
                {contact.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-bg-alt rounded-full text-xs text-secondary font-medium">
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

      {/* Delete Confirmation */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Customer">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <div>
              <p className="font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-700 mt-1">Deleting <strong>{contact.first_name} {contact.last_name}</strong> will remove them and all their linked stock associations permanently.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <button
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
                  if (res.ok) router.push("/contacts");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Customer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer">
        <ContactForm
          contact={contact}
          agents={agents}
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

function Detail({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-secondary mb-0.5">{label}</p>
      <p className={`text-body ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}
