import { createDataClient } from "@/lib/supabase/data-client";

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
  /** Resolved display name for uploaded_by (staff profile or agent). */
  uploader_name?: string | null;
  created_at: string;
  updated_at: string;
}

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
  /** Resolved display name for uploaded_by (staff profile or agent). */
  uploader_name?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resolve uploaded_by ids (user_profiles.id for staff, agents.id for agents)
 * to display names. Missing/unknown ids stay null — never fabricated.
 */
async function withUploaderNames<T extends { uploaded_by: string | null }>(
  docs: T[]
): Promise<(T & { uploader_name: string | null })[]> {
  const ids = [...new Set(docs.map((d) => d.uploaded_by).filter((id): id is string => !!id))];
  if (ids.length === 0) {
    return docs.map((d) => ({ ...d, uploader_name: null }));
  }

  const supabase = await createDataClient();
  const [profilesRes, agentsRes] = await Promise.all([
    supabase.from("user_profiles").select("id, first_name, last_name, email").in("id", ids),
    supabase.from("agents").select("id, first_name, last_name").in("id", ids),
  ]);

  const nameMap = new Map<string, string>();
  for (const a of (agentsRes.data || []) as Array<{ id: string; first_name: string; last_name: string }>) {
    nameMap.set(a.id, `${a.first_name} ${a.last_name}`.trim());
  }
  for (const p of (profilesRes.data || []) as Array<{
    id: string; first_name: string | null; last_name: string | null; email: string;
  }>) {
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    nameMap.set(p.id, name || p.email);
  }

  return docs.map((d) => ({
    ...d,
    uploader_name: d.uploaded_by ? nameMap.get(d.uploaded_by) || null : null,
  }));
}

export async function getDocumentCategories(orgId: string): Promise<DocumentCategory[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("document_categories")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as DocumentCategory[];
}

export async function getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return withUploaderNames((data || []) as ProjectDocument[]);
}

export async function getProjectDocumentCounts(orgId: string): Promise<
  Array<{ project_id: string; project_name: string; category_id: string; category_name: string; count: number }>
> {
  const supabase = await createDataClient();

  // Get all project documents with project and category info
  const { data: docs, error: docsErr } = await supabase
    .from("project_documents")
    .select("project_id, category_id")
    .eq("org_id", orgId);

  if (docsErr) throw docsErr;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId);

  const { data: categories } = await supabase
    .from("document_categories")
    .select("id, name")
    .eq("org_id", orgId);

  const projectMap = new Map((projects || []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const categoryMap = new Map((categories || []).map((c: { id: string; name: string }) => [c.id, c.name]));

  // Aggregate counts
  const countMap = new Map<string, { project_id: string; project_name: string; category_id: string; category_name: string; count: number }>();

  for (const doc of docs || []) {
    const key = `${doc.project_id}:${doc.category_id}`;
    if (!countMap.has(key)) {
      countMap.set(key, {
        project_id: doc.project_id,
        project_name: projectMap.get(doc.project_id) || "Unknown",
        category_id: doc.category_id,
        category_name: categoryMap.get(doc.category_id) || "Unknown",
        count: 0,
      });
    }
    countMap.get(key)!.count++;
  }

  return Array.from(countMap.values());
}

export async function getClientDocuments(contactId: string): Promise<ClientDocument[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("client_documents")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return withUploaderNames((data || []) as ClientDocument[]);
}

export async function getClientDocumentsByProject(projectId: string): Promise<(ClientDocument & { contact_name: string })[]> {
  const supabase = await createDataClient();

  // Get contacts linked to stock in this project
  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("contact_id")
    .eq("project_id", projectId);

  if (!contactStock || contactStock.length === 0) return [];

  const contactIds = [...new Set(contactStock.map((cs) => cs.contact_id))];

  const { data: docs, error } = await supabase
    .from("client_documents")
    .select("*")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Get contact names
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .in("id", contactIds);

  const contactMap = new Map((contacts || []).map((c: { id: string; first_name: string; last_name: string }) => [c.id, `${c.first_name} ${c.last_name}`]));

  const withNames = await withUploaderNames((docs || []) as ClientDocument[]);
  return withNames.map((d) => ({
    ...d,
    contact_name: contactMap.get(d.contact_id) || "Unknown",
  }));
}

export async function createSignedUrl(bucket: string, filePath: string): Promise<string | null> {
  const supabase = await createDataClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error) return null;
  return data.signedUrl;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CLIENT_DOCUMENT_TYPES = [
  "Signed Contract",
  "Exchanged Contract",
  "Trust Receipt",
  "ID Document",
  "Solicitor Letter",
  "Deposit Receipt",
  "FIRB",
  "Other",
] as const;

export type ClientDocumentType = (typeof CLIENT_DOCUMENT_TYPES)[number];
