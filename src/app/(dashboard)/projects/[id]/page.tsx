import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getStock } from "@/lib/data/stock";
import { getAgents } from "@/lib/data/agents";
import { getDocumentCategories, getProjectDocuments } from "@/lib/data/documents";
import { getProjectMilestones } from "@/lib/data/milestones";
import { DEFAULT_ORG_ID } from "@/lib/types";
import { ProjectDetailClient } from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { status, tab } = await searchParams;

  const [project, agents, categories, documents, milestones] = await Promise.all([
    getProject(id),
    getAgents(),
    getDocumentCategories(DEFAULT_ORG_ID),
    getProjectDocuments(id),
    getProjectMilestones(id),
  ]);

  if (!project) notFound();

  const activeTab = (tab === "documents" || tab === "milestones") ? tab : "stock";
  const statusFilter = status || "All";
  const stock = await getStock(id, statusFilter);

  return (
    <ProjectDetailClient
      project={project}
      stock={stock}
      statusFilter={statusFilter}
      agents={agents}
      categories={categories}
      documents={documents}
      milestones={milestones}
      activeTab={activeTab}
    />
  );
}
