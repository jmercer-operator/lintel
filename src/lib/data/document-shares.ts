import { createClient } from "@/lib/supabase/server";
import type { DocumentShare, DocumentShareType, DeliveryMethod } from "@/lib/types";

export async function getDocumentShares(documentId: string): Promise<DocumentShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching document shares:", error);
    return [];
  }
  return (data || []) as DocumentShare[];
}

export async function getSharesForRecipient(recipientId: string, recipientType: 'contact' | 'agent'): Promise<DocumentShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("*")
    .eq("shared_with_id", recipientId)
    .eq("shared_with_type", recipientType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shares for recipient:", error);
    return [];
  }
  return (data || []) as DocumentShare[];
}

export async function createDocumentShare(data: {
  document_type: DocumentShareType;
  document_id: string;
  shared_with_id: string;
  shared_with_type: 'contact' | 'agent';
  shared_by?: string;
  delivery_method?: DeliveryMethod;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("document_shares").insert({
    document_type: data.document_type,
    document_id: data.document_id,
    shared_with_id: data.shared_with_id,
    shared_with_type: data.shared_with_type,
    shared_by: data.shared_by || null,
    delivery_method: data.delivery_method || 'portal',
  });

  if (error) return { error: error.message };
  return {};
}

export async function markAsViewed(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_shares")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return {};
}

export async function getProjectDocumentsForContact(
  projectIds: string[]
): Promise<Array<{ id: string; file_name: string; file_path: string; category_name?: string }>> {
  if (projectIds.length === 0) return [];
  const supabase = await createClient();

  const { data: docs, error } = await supabase
    .from("project_documents")
    .select("id, file_name, file_path, category_id")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (error || !docs) return [];

  // Get category names
  const categoryIds = [...new Set(docs.map((d: { category_id: string }) => d.category_id))];
  const { data: categories } = await supabase
    .from("document_categories")
    .select("id, name")
    .in("id", categoryIds);

  const catMap = new Map(
    (categories || []).map((c: { id: string; name: string }) => [c.id, c.name])
  );

  return docs.map((d: { id: string; file_name: string; file_path: string; category_id: string }) => ({
    id: d.id,
    file_name: d.file_name,
    file_path: d.file_path,
    category_name: catMap.get(d.category_id) || undefined,
  }));
}

export async function getClientDocumentShareRecords(
  contactId: string
): Promise<DocumentShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("*")
    .eq("shared_with_id", contactId)
    .eq("shared_with_type", "contact")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []) as DocumentShare[];
}

export async function getShareCountForDocument(documentId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("document_shares")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) return 0;
  return count || 0;
}
