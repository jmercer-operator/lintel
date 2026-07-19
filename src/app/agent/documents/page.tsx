import { redirect } from "next/navigation";
import { getEffectiveAgentId, getEffectiveOrgId } from "@/lib/auth/identity";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { getDocumentCategories } from "@/lib/data/documents";
import { AgentDocumentsClient } from "./AgentDocumentsClient";

export default async function AgentDocumentsPage() {
  const agentId = await getEffectiveAgentId();
  const orgId = await getEffectiveOrgId();
  if (!agentId || !orgId) redirect("/login");
  const projects = await getAgentProjects(agentId);
  const categories = await getDocumentCategories(orgId);

  return <AgentDocumentsClient projects={projects} categories={categories} />;
}
