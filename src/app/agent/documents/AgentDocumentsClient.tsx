"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import type { ProjectWithStats } from "@/lib/types";
import type { DocumentCategory, ProjectDocument } from "@/lib/data/documents";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  projects: ProjectWithStats[];
  categories: DocumentCategory[];
}

export function AgentDocumentsClient({ projects, categories }: Props) {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || "");
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(`/api/agent/documents?projectId=${selectedProject}`)
      .then((r) => r.json())
      .then((data) => {
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  // Group docs by category
  const docsByCategory: Record<string, ProjectDocument[]> = {};
  for (const doc of documents) {
    if (!docsByCategory[doc.category_id]) {
      docsByCategory[doc.category_id] = [];
    }
    docsByCategory[doc.category_id].push(doc);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Documents</h1>
        <p className="text-secondary text-sm mt-1">Project documents available to you</p>
      </div>

      {/* Project selector */}
      {projects.length > 0 ? (
        <div className="max-w-sm">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-heading font-semibold">No assigned projects</p>
            <p className="text-sm text-muted mt-1">You don&apos;t have any projects assigned yet</p>
          </div>
        </Card>
      )}

      {/* Documents grouped by category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-bg-alt rounded w-32" />
                <div className="h-3 bg-bg-alt rounded w-full" />
                <div className="h-3 bg-bg-alt rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 && selectedProject ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <svg className="mx-auto text-muted mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-heading font-semibold">No documents yet</p>
            <p className="text-sm text-muted mt-1">No documents have been shared for this project</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories
            .filter((cat) => docsByCategory[cat.id]?.length > 0)
            .map((cat) => (
              <Card key={cat.id} padding="md">
                <h3 className="text-sm font-semibold text-heading mb-3">{cat.name}</h3>
                <div className="space-y-2">
                  {docsByCategory[cat.id].map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="flex-shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-heading truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted">{formatFileSize(doc.file_size)}</p>
                        </div>
                      </div>
                      <a
                        href={`/api/agent/download?path=${encodeURIComponent(doc.file_path)}&bucket=project-documents`}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-primary border border-emerald-primary/20 rounded-[var(--radius-button)] hover:bg-emerald-primary/5 transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
