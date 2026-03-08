import { getProjects, getAggregateStats } from "@/lib/data/projects";
import { getStockForDashboard } from "@/lib/data/stock";
import { DashboardClient } from "./DashboardClient";

interface PageProps {
  searchParams: Promise<{ project?: string; status?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { project: projectId, status } = await searchParams;

  const [projects, stats, stock] = await Promise.all([
    getProjects(),
    getAggregateStats(projectId),
    getStockForDashboard(projectId, status),
  ]);

  return (
    <DashboardClient
      projects={projects}
      stats={stats}
      stock={stock}
      selectedProjectId={projectId || ""}
      statusFilter={status || "All"}
    />
  );
}
