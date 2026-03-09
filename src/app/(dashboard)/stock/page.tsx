import { getAllStock } from "@/lib/data/stock";
import { getProjects } from "@/lib/data/projects";
import { getAgents } from "@/lib/data/agents";
import { StockClient } from "./StockClient";

interface PageProps {
  searchParams: Promise<{
    project?: string;
    status?: string;
    agent?: string;
    search?: string;
  }>;
}

export default async function StockPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters = {
    projectId: params.project || "",
    status: params.status || "All",
    agentId: params.agent || "",
    search: params.search || "",
  };

  const [stock, projects, agents] = await Promise.all([
    getAllStock({
      projectId: filters.projectId || undefined,
      status: filters.status !== "All" ? filters.status : undefined,
      agentId: filters.agentId || undefined,
      search: filters.search || undefined,
    }),
    getProjects(),
    getAgents(),
  ]);

  return (
    <StockClient
      stock={stock}
      projects={projects}
      agents={agents}
      filters={filters}
    />
  );
}
