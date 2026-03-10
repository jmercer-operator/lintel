import { createClient } from "@/lib/supabase/server";

export type MilestoneStatus = "completed" | "in_progress" | "upcoming";

export interface ProjectMilestone {
  id: string;
  project_id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  sort_order: number;
  target_date: string | null;
  completed_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectMilestone[];
}

export async function updateMilestone(
  id: string,
  updates: { status?: MilestoneStatus; target_date?: string | null; completed_date?: string | null }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_milestones")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export function getMilestoneProgress(milestones: ProjectMilestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}
