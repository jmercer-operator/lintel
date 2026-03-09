import { notFound } from "next/navigation";
import { getContact } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getClientDocuments } from "@/lib/data/documents";
import { getActivities } from "@/lib/data/activities";
import { getFollowUpsByContact } from "@/lib/data/follow-ups";
import { getBuyerInterests } from "@/lib/data/buyer-interests";
import { getProjects } from "@/lib/data/projects";
import { getEmailTemplates } from "@/lib/data/email-templates";
import { getProjectDocumentsForContact, getClientDocumentShareRecords } from "@/lib/data/document-shares";
import { ContactDetailClient } from "./ContactDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, agents, clientDocs, activities, followUps, buyerInterests, projects, templates] = await Promise.all([
    getContact(id),
    getAgents(),
    getClientDocuments(id),
    getActivities(id),
    getFollowUpsByContact(id),
    getBuyerInterests(id),
    getProjects(),
    getEmailTemplates(),
  ]);

  if (!contact) notFound();

  // Get project documents for contact's linked projects
  const linkedProjectIds = [...new Set(contact.linked_stock.map((ls) => ls.project_id))];
  const [projectDocs, docShares] = await Promise.all([
    getProjectDocumentsForContact(linkedProjectIds),
    getClientDocumentShareRecords(id),
  ]);

  return (
    <ContactDetailClient
      contact={contact}
      agents={agents}
      clientDocuments={clientDocs}
      activities={activities}
      followUps={followUps}
      buyerInterests={buyerInterests}
      projects={projects}
      emailTemplates={templates}
      projectDocuments={projectDocs}
      documentShares={docShares}
    />
  );
}
