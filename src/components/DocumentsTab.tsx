"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { uploadProjectDocumentAction, uploadMultipleProjectDocumentsAction, deleteProjectDocumentAction } from "@/lib/actions";
import { VISIBILITY_LABELS, VISIBILITY_COLORS } from "@/lib/types";
import { getCurrentUserRole, canUploadDocument, canDeleteDocument } from "@/lib/auth/roles";
import type { DocumentVisibility } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export interface DocumentCategory {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  org_id: string;
  category_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  visibility: "staff" | "agent" | "client";
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDocForProject {
  id: string;
  contact_id: string;
  contact_name: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Categories that support multiple file uploads
const MULTI_UPLOAD_CATEGORIES = ["Marketing Collateral", "Specifications", "Renders", "Hero Render"];

// Categories that show image thumbnails
const IMAGE_CATEGORIES = ["Project Logo", "Hero Render", "Renders"];

interface Props {
  projectId: string;
  categories: DocumentCategory[];
  documents: ProjectDocument[];
  clientDocuments?: ClientDocForProject[];
}

export function DocumentsTab({ projectId, categories, documents, clientDocuments = [] }: Props) {
  const router = useRouter();
  const role = getCurrentUserRole();
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const docsByCategory = categories.map((cat) => ({
    category: cat,
    docs: documents.filter((d) => d.category_id === cat.id),
  }));

  async function handleUpload(categoryId: string, categoryName: string, files: FileList) {
    setUploading(categoryId);
    setError(null);

    if (files.length === 1) {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("category_id", categoryId);
      formData.set("category_name", categoryName);
      formData.set("file", files[0]);
      formData.set("visibility", "agent");

      const result = await uploadProjectDocumentAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } else {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("category_id", categoryId);
      formData.set("category_name", categoryName);
      formData.set("visibility", "agent");
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const result = await uploadMultipleProjectDocumentsAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    }

    setUploading(null);
  }

  async function handleDelete(doc: ProjectDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    setDeleting(doc.id);

    const formData = new FormData();
    formData.set("id", doc.id);
    formData.set("file_path", doc.file_path);
    formData.set("project_id", projectId);

    const result = await deleteProjectDocumentAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setDeleting(null);
  }

  async function handleDownload(doc: ProjectDocument) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(doc.file_path, 3600);

    if (error || !data?.signedUrl) {
      setError("Failed to generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleClientDocDownload(doc: ClientDocForProject) {
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

  const isImageFile = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-sm">
          {error}
        </div>
      )}

      {docsByCategory.map(({ category, docs }) => {
        const isMultiUpload = MULTI_UPLOAD_CATEGORIES.includes(category.name);
        const isImageCategory = IMAGE_CATEGORIES.includes(category.name);

        return (
          <Card key={category.id} padding="sm">
            <div className="px-4 py-4 sm:px-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-heading">{category.name}</h3>
                {category.description && (
                  <p className="text-xs text-secondary mt-0.5">{category.description}</p>
                )}
                <p className="text-xs text-muted mt-1">{docs.length} {docs.length === 1 ? "document" : "documents"}</p>
              </div>
              {canUploadDocument(role) && (
                <>
                  <input
                    ref={(el) => { fileInputRefs.current[category.id] = el; }}
                    type="file"
                    multiple={isMultiUpload}
                    accept={isImageCategory ? "image/*" : undefined}
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleUpload(category.id, category.name, files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRefs.current[category.id]?.click()}
                    disabled={uploading === category.id}
                  >
                    {uploading === category.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload{isMultiUpload ? " Files" : ""}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {docs.length === 0 ? (
              <div className="px-6 py-8 text-center text-secondary text-sm">
                No documents uploaded yet
              </div>
            ) : isImageCategory ? (
              /* Image thumbnail grid for logo/render categories */
              <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {docs.map((doc) => (
                  <div key={doc.id} className="group relative">
                    <ImageThumbnail doc={doc} />
                    <div className="mt-2">
                      <p className="text-xs text-heading truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-secondary">{formatFileSize(doc.file_size)}</p>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1 bg-white rounded shadow-sm hover:bg-bg-alt text-secondary hover:text-heading cursor-pointer"
                        title="Download"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      {canDeleteDocument(role) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="p-1 bg-white rounded shadow-sm hover:bg-error/10 text-secondary hover:text-error cursor-pointer disabled:opacity-50"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {docs.map((doc) => (
                  <div key={doc.id} className="px-4 sm:px-6 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-[var(--radius-input)] bg-bg-alt flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{doc.file_name}</p>
                      <p className="text-xs text-secondary">
                        {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${VISIBILITY_COLORS[doc.visibility as DocumentVisibility]?.bg || "bg-bg-alt"}
                      ${VISIBILITY_COLORS[doc.visibility as DocumentVisibility]?.text || "text-secondary"}
                    `}>
                      {VISIBILITY_LABELS[doc.visibility as DocumentVisibility] || doc.visibility}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors text-secondary hover:text-heading cursor-pointer"
                        title="Download"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      {canDeleteDocument(role) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="p-1.5 rounded-[var(--radius-input)] hover:bg-error/10 transition-colors text-secondary hover:text-error cursor-pointer disabled:opacity-50"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Client Documents Section */}
      {clientDocuments.length > 0 && (
        <Card padding="sm">
          <div className="px-4 py-4 sm:px-6 border-b border-border">
            <h3 className="font-semibold text-heading">Client Documents</h3>
            <p className="text-xs text-secondary mt-0.5">Documents uploaded for contacts linked to this project</p>
            <p className="text-xs text-muted mt-1">{clientDocuments.length} {clientDocuments.length === 1 ? "document" : "documents"}</p>
          </div>
          <div className="divide-y divide-border">
            {clientDocuments.map((doc) => (
              <div key={doc.id} className="px-4 sm:px-6 py-3 flex items-center gap-4">
                <div className="w-8 h-8 rounded-[var(--radius-input)] bg-[#D4A855]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A855" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{doc.file_name}</p>
                  <p className="text-xs text-secondary">
                    {doc.contact_name} · {doc.document_type} · {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button
                  onClick={() => handleClientDocDownload(doc)}
                  className="p-1.5 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors text-secondary hover:text-heading cursor-pointer"
                  title="Download"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {categories.length === 0 && clientDocuments.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary text-sm">No document categories configured</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ImageThumbnail({ doc }: { doc: ProjectDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("project-documents")
      .createSignedUrl(doc.file_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [doc.file_path]);

  return (
    <div className="aspect-square rounded-[var(--radius-input)] bg-bg-alt overflow-hidden">
      {url ? (
        <img
          src={url}
          alt={doc.file_name}
          className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}


