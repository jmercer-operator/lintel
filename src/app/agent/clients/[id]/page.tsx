import { notFound } from "next/navigation";
import { PREVIEW_AGENT_ID } from "@/lib/auth/roles";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getClientDocuments } from "@/lib/data/documents";
import { AgentClientDetailClient } from "./AgentClientDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents, clientDocs] = await Promise.all([
    getContact(id),
    getAgents(),
    getClientDocuments(id),
  ]);

  if (!contact) notFound();

  // Verify this contact belongs to this agent
  if (contact.referring_agent_id !== PREVIEW_AGENT_ID) {
    notFound();
  }

  return (
    <AgentClientDetailClient
      contact={contact}
      agents={agents}
      clientDocuments={clientDocs}
      agentId={PREVIEW_AGENT_ID}
    />
  );
}
