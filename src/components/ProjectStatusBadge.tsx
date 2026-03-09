"use client";

import {
  PROJECT_CONSTRUCTION_STATUS_LABELS,
  PROJECT_CONSTRUCTION_STATUS_COLORS,
  type ProjectConstructionStatus,
} from "@/lib/types";

interface ProjectStatusBadgeProps {
  status: ProjectConstructionStatus | null;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  if (!status) return null;

  const colors = PROJECT_CONSTRUCTION_STATUS_COLORS[status];
  const label = PROJECT_CONSTRUCTION_STATUS_LABELS[status];

  if (!colors || !label) return null;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}
