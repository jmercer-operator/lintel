import { getContacts } from "@/lib/data/contacts";
import { getAgents } from "@/lib/data/agents";
import { getProjects } from "@/lib/data/projects";
import { ContactsClient } from "./ContactsClient";

interface PageProps {
  searchParams: Promise<{ tab?: string; search?: string }>;
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const { tab, search } = await searchParams;

  const [contacts, agents, projects] = await Promise.all([
    getContacts({ classification: tab || "all", search }),
    getAgents(),
    getProjects(),
  ]);

  return (
    <ContactsClient
      contacts={contacts}
      agents={agents}
      projects={projects}
      currentTab={tab || "all"}
      searchQuery={search || ""}
    />
  );
}
