"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { uploadClientDocumentAction, deleteClientDocumentAction } from "@/lib/actions";
import { getCurrentUserRole, canUploadClientDocument, canDeleteClientDocument } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";

export interface ClientDocument {
  id: string;
  contact_id: string;
  org_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  visibility: "staff" | "agent" | "client";
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CLIENT_DOCUMENT_TYPES = [
  "Signed Contract",
  "ID Document",
  "Proof of Funds",
  "Solicitor Letter",
  "Deposit Receipt",
  "Other",
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  contactId: string;
  documents: ClientDocument[];
}

export function ClientDocuments({ contactId, documents }: Props) {
  const router = useRouter();
  const role = getCurrentUserRole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(CLIENT_DOCUMENT_TYPES[0]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("contact_id", contactId);
    formData.set("document_type", selectedType);
    formData.set("file", file);

    const result = await uploadClientDocumentAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setUploading(false);
  }

  async function handleDelete(doc: ClientDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    setDeleting(doc.id);

    const formData = new FormData();
    formData.set("id", doc.id);
    formData.set("file_path", doc.file_path);
    formData.set("contact_id", contactId);

    const result = await deleteClientDocumentAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setDeleting(null);
  }

  async function handleDownload(doc: ClientDocument) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 3600);

    if (error || !data?.signedUrl) {
      setError("Failed to generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  // Group documents by type
  const docsByType = CLIENT_DOCUMENT_TYPES.map((type) => ({
    type,
    docs: documents.filter((d) => d.document_type === type),
  })).filter(({ docs }) => docs.length > 0);

  const ungroupedDocs = documents.filter(
    (d) => !CLIENT_DOCUMENT_TYPES.includes(d.document_type as typeof CLIENT_DOCUMENT_TYPES[number])
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Documents</h3>
        {canUploadClientDocument(role) && (
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-[var(--radius-input)] border border-border bg-white text-body"
            >
              {CLIENT_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </span>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 mb-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-xs">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-secondary">No documents uploaded</p>
      ) : (
        <div className="space-y-4">
          {docsByType.map(({ type, docs }) => (
            <div key={type}>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">{type}</p>
              <div className="space-y-1">
                {docs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    deleting={deleting === doc.id}
                    canDelete={canDeleteClientDocument(role)}
                  />
                ))}
              </div>
            </div>
          ))}
          {ungroupedDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Other</p>
              <div className="space-y-1">
                {ungroupedDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    deleting={deleting === doc.id}
                    canDelete={canDeleteClientDocument(role)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DocumentRow({
  doc,
  onDownload,
  onDelete,
  deleting,
  canDelete,
}: {
  doc: ClientDocument;
  onDownload: (doc: ClientDocument) => void;
  onDelete: (doc: ClientDocument) => void;
  deleting: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors">
      <div className="w-6 h-6 rounded bg-bg-alt flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-heading truncate">{doc.file_name}</p>
        <p className="text-[10px] text-muted">
          {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
        </p>
      </div>
      <button
        onClick={() => onDownload(doc)}
        className="p-1 rounded hover:bg-bg-alt text-secondary hover:text-heading cursor-pointer"
        title="Download"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {canDelete && (
        <button
          onClick={() => onDelete(doc)}
          disabled={deleting}
          className="p-1 rounded hover:bg-error/10 text-secondary hover:text-error cursor-pointer disabled:opacity-50"
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
