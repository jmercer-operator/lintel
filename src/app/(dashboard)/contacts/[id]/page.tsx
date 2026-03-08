import { notFound } from "next/navigation";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { ContactDetailClient } from "./ContactDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents] = await Promise.all([getContact(id), getAgents()]);

  if (!contact) notFound();

  return <ContactDetailClient contact={contact} agents={agents} />;
}
