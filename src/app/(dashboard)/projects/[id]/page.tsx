import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getStock } from "@/lib/data/stock";
import { getAgents } from "@/lib/data/agents";
import { getContacts } from "@/lib/data/contacts";
import { getDocumentCategories, getProjectDocuments, getClientDocumentsByProject } from "@/lib/data/documents";
import { getProjectMilestones } from "@/lib/data/milestones";
import { DEFAULT_ORG_ID } from "@/lib/types";
import { ProjectDetailClient } from "./ProjectDetailClient";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { status, tab } = await searchParams;

  const [project, agents, categories, documents, milestones, contacts, clientDocs] = await Promise.all([
    getProject(id),
    getAgents(),
    getDocumentCategories(DEFAULT_ORG_ID),
    getProjectDocuments(id),
    getProjectMilestones(id),
    getContacts(),
    getClientDocumentsByProject(id),
  ]);

  if (!project) notFound();

  const activeTab = (tab === "documents" || tab === "milestones" || tab === "progress") ? tab : "stock";
  const statusFilter = status || "All";
  const stock = await getStock(id, statusFilter);

  // Build stock → contact name map
  const supabase = await createClient();
  const stockIds = stock.map(s => s.id);
  let stockContactMap: Record<string, string> = {};
  if (stockIds.length > 0) {
    const { data: contactStock } = await supabase
      .from("contact_stock")
      .select("stock_id, contact_id")
      .in("stock_id", stockIds);

    if (contactStock && contactStock.length > 0) {
      const contactIds = [...new Set(contactStock.map(cs => cs.contact_id))];
      const { data: contactNames } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .in("id", contactIds);

      const nameMap = new Map((contactNames || []).map(c => [c.id, `${c.first_name} ${c.last_name}`]));
      for (const cs of contactStock) {
        stockContactMap[cs.stock_id] = nameMap.get(cs.contact_id) || "Unknown";
      }
    }
  }

  // Map client docs to the shape expected by DocumentsTab
  const clientDocsMapped = clientDocs.map(d => ({
    id: d.id,
    contact_id: d.contact_id,
    contact_name: d.contact_name,
    document_type: d.document_type,
    file_name: d.file_name,
    file_path: d.file_path,
    file_size: d.file_size,
    mime_type: d.mime_type,
    created_at: d.created_at,
  }));

  return (
    <ProjectDetailClient
      project={project}
      stock={stock}
      statusFilter={statusFilter}
      agents={agents}
      contacts={contacts}
      categories={categories}
      documents={documents}
      clientDocuments={clientDocsMapped}
      milestones={milestones}
      activeTab={activeTab}
      stockContactMap={stockContactMap}
    />
  );
}
