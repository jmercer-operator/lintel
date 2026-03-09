import { notFound } from "next/navigation";
import { PREVIEW_ORG_ID } from "@/lib/auth/roles";
import { getAgentProjectDetail, getProjectStockForAgent, getAgentProjectDocuments } from "@/lib/data/agent-portal";
import { getProjectMilestones } from "@/lib/data/milestones";
import { getDocumentCategories } from "@/lib/data/documents";
import { AgentProjectDetailClient } from "./AgentProjectDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AgentProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getAgentProjectDetail(id);
  if (!project) notFound();

  const stock = await getProjectStockForAgent(id);
  const milestones = await getProjectMilestones(id);
  const documents = await getAgentProjectDocuments(id);
  const categories = await getDocumentCategories(PREVIEW_ORG_ID);

  return (
    <AgentProjectDetailClient
      project={project}
      stock={stock}
      milestones={milestones}
      documents={documents}
      categories={categories}
    />
  );
}
