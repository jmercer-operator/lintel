import { getProjects, getAggregateStats } from "@/lib/data/projects";
import { getStockForDashboard } from "@/lib/data/stock";
import { getPipelineStats, getPipelineContacts } from "@/lib/data/pipeline";
import { getFollowUps } from "@/lib/data/follow-ups";
import { DashboardClient } from "./DashboardClient";

interface PageProps {
  searchParams: Promise<{ project?: string; status?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { project: projectId, status } = await searchParams;

  const [projects, stats, stock, pipelineStats, pipelineContacts, followUps] = await Promise.all([
    getProjects(),
    getAggregateStats(projectId),
    getStockForDashboard(projectId, status),
    getPipelineStats(),
    getPipelineContacts(),
    getFollowUps(undefined, { todayOnly: true }),
  ]);

  return (
    <DashboardClient
      projects={projects}
      stats={stats}
      stock={stock}
      selectedProjectId={projectId || ""}
      statusFilter={status || "All"}
      pipelineStats={pipelineStats}
      pipelineContacts={pipelineContacts}
      followUps={followUps}
    />
  );
}
