import {
  getPortfolioStats,
  getProjectSalesBreakdown,
  getAgentPerformance,
  getCommissionSummary,
  getSettlementPipeline,
  getSalesHeatmapData,
} from "@/lib/data/reports";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const [
    portfolioStats,
    projectBreakdown,
    agentPerformance,
    commissionSummary,
    settlementPipeline,
    heatmapData,
  ] = await Promise.all([
    getPortfolioStats(),
    getProjectSalesBreakdown(),
    getAgentPerformance(),
    getCommissionSummary(),
    getSettlementPipeline(),
    getSalesHeatmapData(),
  ]);

  return (
    <ReportsClient
      portfolioStats={portfolioStats}
      projectBreakdown={projectBreakdown}
      agentPerformance={agentPerformance}
      commissionSummary={commissionSummary}
      settlementPipeline={settlementPipeline}
      heatmapData={heatmapData}
    />
  );
}
