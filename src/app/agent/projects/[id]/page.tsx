import { notFound, redirect } from "next/navigation";
import { getEffectiveAgentId, getEffectiveOrgId } from "@/lib/auth/identity";
import { getAgentProjectDetail, getAgentProjects, getProjectStockForAgent, getAgentProjectDocuments } from "@/lib/data/agent-portal";
import { getProjectMilestones } from "@/lib/data/milestones";
import { getDocumentCategories } from "@/lib/data/documents";
import { AgentProjectDetailClient } from "./AgentProjectDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AgentProjectDetailPage({ params }: Props) {
  const agentId = await getEffectiveAgentId();
  const orgId = await getEffectiveOrgId();
  if (!agentId || !orgId) redirect("/login");

  const { id } = await params;
  const assignedProjects = await getAgentProjects(agentId);
  if (!assignedProjects.some((p) => p.id === id)) notFound();

  const project = await getAgentProjectDetail(id);
  if (!project) notFound();

  const stock = await getProjectStockForAgent(id);
  const milestones = await getProjectMilestones(id);
  const documents = await getAgentProjectDocuments(id);
  const categories = await getDocumentCategories(orgId);

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
