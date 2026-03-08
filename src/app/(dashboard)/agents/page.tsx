import { getAgentsWithProjectCounts } from "@/lib/data/agents";
import { getProjects } from "@/lib/data/projects";
import { AgentsClient } from "./AgentsClient";

export default async function AgentsPage() {
  const [agents, projects] = await Promise.all([
    getAgentsWithProjectCounts(),
    getProjects(),
  ]);

  return <AgentsClient agents={agents} projects={projects} />;
}
