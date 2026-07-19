import type { SupabaseClient } from "@supabase/supabase-js";
import { createDataClient } from "@/lib/supabase/data-client";
import { getSessionIdentity, type SessionIdentity } from "./identity";
import { isPreviewAllowed } from "./preview";

const ALLOWED_BUCKETS = ["project-documents", "client-documents"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type SignResult =
  | { url: string }
  | { error: string; status: number };

/**
 * Create a signed download URL ONLY after verifying that the current
 * session is allowed to access the document backing the storage path.
 *
 * Rules:
 * - Only the two known private buckets can be signed.
 * - The path must correspond to a known document row (no arbitrary paths).
 * - staff: documents within their org.
 * - agent: project docs with visibility agent/client for projects they are
 *   assigned to (agent_projects or assigned stock); client docs for their
 *   own referred contacts.
 * - client: their own client docs; project docs with visibility 'client'
 *   for projects they are linked to via contact_stock.
 * - Allowed local preview bypasses (demo only, never in production).
 */
export async function createAuthorizedSignedUrl(
  bucket: string,
  path: string
): Promise<SignResult> {
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return { error: "Invalid bucket", status: 400 };
  }
  if (!path || path.includes("..")) {
    return { error: "Invalid path", status: 400 };
  }

  const identity = await getSessionIdentity();
  // Real sessions get the session-scoped client (RLS applies to lookups and
  // signing). Only sessionless allowed-local-preview gets the admin client,
  // and that branch signs demo files without per-user checks anyway.
  const db = (await createDataClient()) as Db;

  if (!identity) {
    if (!isPreviewAllowed()) {
      return { error: "Unauthorized", status: 401 };
    }
    // Allowed local preview: sign without per-user checks (demo only).
    return sign(db, bucket as AllowedBucket, path);
  }

  if (bucket === "project-documents") {
    const { data: doc } = await db
      .from("project_documents")
      .select("id, org_id, project_id, visibility")
      .eq("file_path", path)
      .maybeSingle();

    if (!doc) {
      // No document row for this path — refuse to sign arbitrary paths.
      // TODO: progress pictures/videos are stored in this bucket without
      // project_documents rows; they are served via their own URLs, not
      // this route. If that changes, add an explicit progress-media check.
      return { error: "Not found", status: 404 };
    }

    const allowed = await canAccessProjectDocument(db, identity, doc);
    if (!allowed) return { error: "Forbidden", status: 403 };
    return sign(db, bucket, path);
  }

  // client-documents
  const { data: doc } = await db
    .from("client_documents")
    .select("id, org_id, contact_id, visibility")
    .eq("file_path", path)
    .maybeSingle();

  if (!doc) {
    return { error: "Not found", status: 404 };
  }

  const allowed = await canAccessClientDocument(db, identity, doc);
  if (!allowed) return { error: "Forbidden", status: 403 };
  return sign(db, bucket as AllowedBucket, path);
}

async function canAccessProjectDocument(
  db: Db,
  identity: SessionIdentity,
  doc: { id: string; org_id: string; project_id: string; visibility: string }
): Promise<boolean> {
  if (identity.role === "staff") {
    return !identity.orgId || identity.orgId === doc.org_id;
  }

  if (identity.role === "agent") {
    if (doc.visibility !== "agent" && doc.visibility !== "client") return false;
    // Assigned via agent_projects…
    const { data: ap } = await db
      .from("agent_projects")
      .select("agent_id")
      .eq("agent_id", identity.profileId)
      .eq("project_id", doc.project_id)
      .maybeSingle();
    if (ap) return true;
    // …or has stock assigned in this project.
    const { data: stock } = await db
      .from("stock")
      .select("id")
      .eq("agent_id", identity.profileId)
      .eq("project_id", doc.project_id)
      .limit(1);
    return !!(stock && stock.length > 0);
  }

  if (identity.role === "client") {
    if (doc.visibility !== "client") return false;
    // Linked to the project through their lot.
    const { data: link } = await db
      .from("contact_stock")
      .select("contact_id")
      .eq("contact_id", identity.profileId)
      .eq("project_id", doc.project_id)
      .limit(1);
    if (link && link.length > 0) return true;
    // TODO: also honour explicit shares once document_shares rows are
    // reliably written for project documents (document_type =
    // 'project_document', shared_with_type = 'contact').
    const { data: share } = await db
      .from("document_shares")
      .select("id")
      .eq("document_id", doc.id)
      .eq("shared_with_id", identity.profileId)
      .eq("shared_with_type", "contact")
      .eq("document_type", "project_document")
      .limit(1);
    return !!(share && share.length > 0);
  }

  return false;
}

async function canAccessClientDocument(
  db: Db,
  identity: SessionIdentity,
  doc: { org_id: string; contact_id: string; visibility: string }
): Promise<boolean> {
  if (identity.role === "staff") {
    return !identity.orgId || identity.orgId === doc.org_id;
  }

  if (identity.role === "agent") {
    // Agents can access documents for contacts they refer.
    const { data: contact } = await db
      .from("contacts")
      .select("referring_agent_id")
      .eq("id", doc.contact_id)
      .maybeSingle();
    return contact?.referring_agent_id === identity.profileId;
  }

  if (identity.role === "client") {
    return doc.contact_id === identity.profileId;
  }

  return false;
}

async function sign(db: Db, bucket: AllowedBucket, path: string): Promise<SignResult> {
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) {
    return { error: "Failed to create download URL", status: 500 };
  }
  return { url: data.signedUrl };
}
