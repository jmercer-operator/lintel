"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { ContactForm } from "@/components/ContactForm";
import { formatPrice, type ContactWithLinkedStock, type Agent, type StockStatus } from "@/lib/types";

interface Props {
  contact: ContactWithLinkedStock;
  agents: Agent[];
}

export function ContactDetailClient({ contact, agents }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const referringAgent = agents.find((a) => a.id === contact.referring_agent_id);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Back + Header */}
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Contacts
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-heading">{contact.first_name} {contact.last_name}</h1>
            <ClassificationBadge classification={contact.computed_classification} />
          </div>
          {contact.preferred_name && (
            <p className="text-secondary text-sm">Goes by &ldquo;{contact.preferred_name}&rdquo;</p>
          )}
        </div>
        <Button onClick={() => setShowEditModal(true)}>Edit Contact</Button>
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
              <Detail label="Country" value={contact.country_of_residence} />
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
                <Detail label="Company" value={contact.company} />
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

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact">
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
