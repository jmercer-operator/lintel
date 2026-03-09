import { PREVIEW_AGENT_ID, PREVIEW_ORG_ID } from "@/lib/auth/roles";
import { getAgentProjects } from "@/lib/data/agent-portal";
import { getDocumentCategories } from "@/lib/data/documents";
import { AgentDocumentsClient } from "./AgentDocumentsClient";

export default async function AgentDocumentsPage() {
  const projects = await getAgentProjects(PREVIEW_AGENT_ID);
  const categories = await getDocumentCategories(PREVIEW_ORG_ID);

  return <AgentDocumentsClient projects={projects} categories={categories} />;
}
