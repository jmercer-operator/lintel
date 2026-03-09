import { notFound } from "next/navigation";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getClientDocuments } from "@/lib/data/documents";
import { ContactDetailClient } from "./ContactDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents, clientDocs] = await Promise.all([
    getContact(id),
    getAgents(),
    getClientDocuments(id),
  ]);

  if (!contact) notFound();

  return <ContactDetailClient contact={contact} agents={agents} clientDocuments={clientDocs} />;
}
