"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import type { ContactWithLinkedStock, EmailTemplate, EmailTemplateCategory } from "@/lib/types";
import { EMAIL_TEMPLATE_CATEGORY_LABELS } from "@/lib/types";

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  category_name?: string;
}

interface DocumentShareRecord {
  id: string;
  document_type: string;
  document_id: string;
  shared_with_id: string;
  shared_with_type: string;
  delivery_method: string;
  viewed_at: string | null;
  created_at: string;
}

interface ClientDocumentRecord {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
}

interface Props {
  contact: ContactWithLinkedStock;
  templates: EmailTemplate[];
  projectDocuments: ProjectDocument[];
  clientDocuments: ClientDocumentRecord[];
  documentShares: DocumentShareRecord[];
  agentName?: string;
}

function substituteVariables(
  text: string,
  contact: ContactWithLinkedStock,
  agentName?: string
): string {
  const linkedLot = contact.linked_stock?.[0];
  return text
    .replace(/\{\{first_name\}\}/g, contact.first_name || "")
    .replace(/\{\{last_name\}\}/g, contact.last_name || "")
    .replace(/\{\{project_name\}\}/g, linkedLot?.project_name || "[Project]")
    .replace(/\{\{lot_number\}\}/g, linkedLot?.lot_number || "[Lot]")
    .replace(/\{\{agent_name\}\}/g, agentName || "[Agent]")
    .replace(/\{\{settlement_date\}\}/g, "[Settlement Date]");
}

export function CommunicationPanel({
  contact,
  templates,
  projectDocuments,
  clientDocuments,
  documentShares,
  agentName,
}: Props) {
  const router = useRouter();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Last call activity
  const lastCallDate = null; // Would come from activities, placeholder

  const handleCall = useCallback(async () => {
    if (!contact.phone) return;
    // Log the call as activity
    const fd = new FormData();
    fd.set("contact_id", contact.id);
    fd.set("comm_type", "call");
    try {
      await fetch("/api/log-communication", { method: "POST", body: fd });
    } catch {
      // silently fail
    }
    window.location.href = `tel:${contact.phone}`;
  }, [contact.id, contact.phone]);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      const tmpl = templates.find((t) => t.id === templateId);
      if (tmpl) {
        setEmailSubject(substituteVariables(tmpl.subject, contact, agentName));
        setEmailBody(substituteVariables(tmpl.body, contact, agentName));
      }
    },
    [templates, contact, agentName]
  );

  const handleSendEmail = useCallback(() => {
    const mailto = `mailto:${contact.email || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    // Log activity
    const fd = new FormData();
    fd.set("contact_id", contact.id);
    fd.set("comm_type", "email");
    fd.set("subject", emailSubject);
    fd.set("body", emailBody);
    fetch("/api/log-communication", { method: "POST", body: fd }).catch(() => {});
    window.location.href = mailto;
    setShowEmailModal(false);
  }, [contact.id, contact.email, emailSubject, emailBody]);

  const handleCopyEmail = useCallback(async () => {
    const text = `Subject: ${emailSubject}\n\n${emailBody}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [emailSubject, emailBody]);

  const handleShareDocument = useCallback(
    async (docId: string, docType: "project_document" | "client_document") => {
      setSharing(true);
      setShareSuccess(null);
      const fd = new FormData();
      fd.set("document_type", docType);
      fd.set("document_id", docId);
      fd.append("shared_with_ids", contact.id);
      fd.set("shared_with_type", "contact");
      fd.set("delivery_method", "portal");
      try {
        const res = await fetch("/api/share-document", { method: "POST", body: fd });
        if (res.ok) {
          setShareSuccess(docId);
          router.refresh();
        }
      } catch {
        // handle error
      } finally {
        setSharing(false);
      }
    },
    [contact.id, router]
  );

  const isDocShared = useCallback(
    (docId: string) => documentShares.some((s) => s.document_id === docId),
    [documentShares]
  );

  return (
    <>
      <Card>
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Communication
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quick Call */}
          <button
            onClick={handleCall}
            disabled={!contact.phone}
            className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:border-[#1A9E6F]/30 hover:bg-[#1A9E6F]/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A9E6F]/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A9E6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">Call</p>
              <p className="text-xs text-secondary">{contact.phone || "No phone"}</p>
            </div>
          </button>

          {/* Email */}
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:border-[#1A9E6F]/30 hover:bg-[#1A9E6F]/5 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#D4A855]/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A855" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">Email</p>
              <p className="text-xs text-secondary">{contact.email || "No email"}</p>
            </div>
          </button>

          {/* Send Document */}
          <button
            onClick={() => setShowDocModal(true)}
            className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:border-[#1A9E6F]/30 hover:bg-[#1A9E6F]/5 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#7B3FA0]/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B3FA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">Document</p>
              <p className="text-xs text-secondary">Share files</p>
            </div>
          </button>
        </div>

        {lastCallDate && (
          <p className="text-xs text-secondary mt-3">Last call: {lastCallDate}</p>
        )}
      </Card>

      {/* Email Composer Modal */}
      <Modal open={showEmailModal} onClose={() => setShowEmailModal(false)} title="Compose Email">
        <div className="space-y-4">
          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">To</label>
            <div className="px-3 py-2 bg-bg-alt rounded-[6px] text-sm text-body">
              {contact.email || "No email address"}
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({EMAIL_TEMPLATE_CATEGORY_LABELS[t.category as EmailTemplateCategory] || t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Body</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F] resize-none"
              placeholder="Write your email..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={handleCopyEmail}
            >
              {copied ? "✓ Copied" : "Copy to Clipboard"}
            </Button>
            <Button onClick={handleSendEmail} disabled={!contact.email}>
              Open in Mail App
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send Document Modal */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Share Document">
        <div className="space-y-6">
          {/* Project Documents */}
          {projectDocuments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3">Project Documents</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {projectDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-[8px] border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7A70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div className="min-w-0">
                        <p className="text-sm text-body truncate">{doc.file_name}</p>
                        {doc.category_name && (
                          <p className="text-xs text-secondary">{doc.category_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isDocShared(doc.id) ? (
                        <span className="text-xs text-[#1A9E6F] font-medium px-2 py-1 bg-[#1A9E6F]/10 rounded-full">
                          Shared
                        </span>
                      ) : (
                        <button
                          onClick={() => handleShareDocument(doc.id, "project_document")}
                          disabled={sharing}
                          className="text-xs text-[#1A9E6F] font-medium px-2 py-1 hover:bg-[#1A9E6F]/10 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {shareSuccess === doc.id ? "✓ Shared" : "Share"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Documents */}
          {clientDocuments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3">Client Documents</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {clientDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-[8px] border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7A70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div className="min-w-0">
                        <p className="text-sm text-body truncate">{doc.file_name}</p>
                        <p className="text-xs text-secondary">{doc.document_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isDocShared(doc.id) ? (
                        <span className="text-xs text-[#1A9E6F] font-medium px-2 py-1 bg-[#1A9E6F]/10 rounded-full">
                          Shared
                        </span>
                      ) : (
                        <button
                          onClick={() => handleShareDocument(doc.id, "client_document")}
                          disabled={sharing}
                          className="text-xs text-[#1A9E6F] font-medium px-2 py-1 hover:bg-[#1A9E6F]/10 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {shareSuccess === doc.id ? "✓ Shared" : "Share"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projectDocuments.length === 0 && clientDocuments.length === 0 && (
            <p className="text-sm text-secondary text-center py-4">No documents available to share</p>
          )}

          {/* Share History */}
          {documentShares.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3">Share History</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {documentShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between text-xs py-1.5"
                  >
                    <span className="text-secondary">
                      {new Date(share.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" via "}
                      {share.delivery_method}
                    </span>
                    <span className={share.viewed_at ? "text-[#1A9E6F]" : "text-secondary"}>
                      {share.viewed_at ? "Viewed" : "Not viewed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
