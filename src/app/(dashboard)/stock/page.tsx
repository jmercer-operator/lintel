import { getAllStock } from "@/lib/data/stock";
import { getProjects } from "@/lib/data/projects";
import { getAgents } from "@/lib/data/agents";
import { getContacts } from "@/lib/data/contacts";
import { getStaffDealAnnotations } from "@/lib/data/deals";
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

  const [stock, projects, agents, contacts] = await Promise.all([
    getAllStock({
      projectId: filters.projectId || undefined,
      status: filters.status !== "All" ? filters.status : undefined,
      agentId: filters.agentId || undefined,
      search: filters.search || undefined,
    }),
    getProjects(),
    getAgents(),
    getContacts(),
  ]);

  const dealAnnotations = await getStaffDealAnnotations(stock.map((s) => s.id));

  return (
    <StockClient
      stock={stock}
      projects={projects}
      agents={agents}
      filters={filters}
      dealsAvailable={dealAnnotations.available}
      dealsByStockId={dealAnnotations.byStockId}
      contactOptions={contacts.map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
      }))}
    />
  );
}
