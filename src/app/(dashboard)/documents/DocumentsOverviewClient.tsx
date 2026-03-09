"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { uploadProjectDocumentAction } from "@/lib/actions";
import { getCurrentUserRole, canUploadDocument } from "@/lib/auth/roles";
import type { ProjectWithStats } from "@/lib/types";
import type { DocumentCategory } from "@/components/DocumentsTab";

interface Props {
  projects: ProjectWithStats[];
  categories: DocumentCategory[];
  docCounts: Array<{
    project_id: string;
    project_name: string;
    category_id: string;
    category_name: string;
    count: number;
  }>;
}

export function DocumentsOverviewClient({ projects, categories, docCounts }: Props) {
  const router = useRouter();
  const role = getCurrentUserRole();
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [uploadCategoryId, setUploadCategoryId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProjects = filterProjectId === "all"
    ? projects
    : projects.filter((p) => p.id === filterProjectId);

  // Get doc counts per project
  function getProjectDocCount(projectId: string): number {
    return docCounts
      .filter((d) => d.project_id === projectId)
      .reduce((sum, d) => sum + d.count, 0);
  }

  function getCategoryDocCount(projectId: string, categoryId: string): number {
    return docCounts.find((d) => d.project_id === projectId && d.category_id === categoryId)?.count || 0;
  }

  async function handleUpload(file: File) {
    if (!uploadProjectId || !uploadCategoryId) {
      setError("Select a project and category first");
      return;
    }
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("project_id", uploadProjectId);
    formData.set("category_id", uploadCategoryId);
    formData.set("file", file);
    formData.set("visibility", "agent");

    const result = await uploadProjectDocumentAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Documents</h1>
          <p className="text-sm text-secondary mt-1">Project documents across all developments</p>
        </div>
        <div className="relative">
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="appearance-none px-4 py-2 pr-9 text-sm font-medium rounded-[var(--radius-input)] border border-border bg-white text-body cursor-pointer hover:border-secondary focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-sm">
          {error}
        </div>
      )}

      {/* Quick Upload */}
      {canUploadDocument(role) && (
        <Card padding="md">
          <h3 className="font-semibold text-heading mb-4">Quick Upload</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={uploadProjectId}
              onChange={(e) => setUploadProjectId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body"
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={uploadCategoryId}
              onChange={(e) => setUploadCategoryId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-white text-body"
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !uploadProjectId || !uploadCategoryId}
            >
              {uploading ? "Uploading…" : "Upload File"}
            </Button>
          </div>
        </Card>
      )}

      {/* Project Document Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const totalDocs = getProjectDocCount(project.id);
          return (
            <Card key={project.id} padding="md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    href={`/projects/${project.id}?tab=documents`}
                    className="text-base font-semibold text-heading hover:text-emerald-primary transition-colors"
                  >
                    {project.name}
                  </Link>
                  <p className="text-xs text-secondary mt-0.5">{project.address}</p>
                </div>
                <span className="text-2xl font-bold font-mono text-heading">{totalDocs}</span>
              </div>

              {categories.length > 0 && (
                <div className="space-y-1.5">
                  {categories.map((cat) => {
                    const count = getCategoryDocCount(project.id, cat.id);
                    return (
                      <div key={cat.id} className="flex items-center justify-between text-sm">
                        <span className="text-secondary">{cat.name}</span>
                        <span className="font-mono text-xs text-muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border">
                <Link
                  href={`/projects/${project.id}?tab=documents`}
                  className="text-xs font-semibold text-emerald-primary hover:underline"
                >
                  View Documents →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary text-sm">No projects found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
