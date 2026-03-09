import { notFound } from "next/navigation";
import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getClientDocuments } from "@/lib/data/documents";
import { getEmailTemplates } from "@/lib/data/email-templates";
import { getProjectDocumentsForContact, getClientDocumentShareRecords } from "@/lib/data/document-shares";
import { AgentClientDetailClient } from "./AgentClientDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents, clientDocs, templates] = await Promise.all([
    getContact(id),
    getAgents(),
    getClientDocuments(id),
    getEmailTemplates(),
  ]);

  if (!contact) notFound();

  // Verify this contact belongs to this agent
  if (contact.referring_agent_id !== PREVIEW_AGENT_ID) {
    notFound();
  }

  // Get project documents for contact's linked projects
  const linkedProjectIds = [...new Set(contact.linked_stock.map((ls) => ls.project_id))];
  const [projectDocs, docShares] = await Promise.all([
    getProjectDocumentsForContact(linkedProjectIds),
    getClientDocumentShareRecords(id),
  ]);

  // Get current agent name
  const currentAgent = agents.find((a) => a.id === PREVIEW_AGENT_ID);
  const agentName = currentAgent ? `${currentAgent.first_name} ${currentAgent.last_name}` : undefined;

  return (
    <AgentClientDetailClient
      contact={contact}
      agents={agents}
      clientDocuments={clientDocs}
      agentId={PREVIEW_AGENT_ID}
      emailTemplates={templates}
      projectDocuments={projectDocs}
      documentShares={docShares}
      agentName={agentName}
    />
  );
}
