import { notFound } from "next/navigation";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getClientDocuments } from "@/lib/data/documents";
import { getActivities } from "@/lib/data/activities";
import { getFollowUpsByContact } from "@/lib/data/follow-ups";
import { getBuyerInterests } from "@/lib/data/buyer-interests";
import { getProjects } from "@/lib/data/projects";
import { ContactDetailClient } from "./ContactDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents, clientDocs, activities, followUps, buyerInterests, projects] = await Promise.all([
    getContact(id),
    getAgents(),
    getClientDocuments(id),
    getActivities(id),
    getFollowUpsByContact(id),
    getBuyerInterests(id),
    getProjects(),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailClient
      contact={contact}
      agents={agents}
      clientDocuments={clientDocs}
      activities={activities}
      followUps={followUps}
      buyerInterests={buyerInterests}
      projects={projects}
    />
  );
}
