"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { ProjectLogo } from "@/components/ProjectLogo";
import { StockSummaryBar } from "@/components/StockSummaryBar";
import type { ProjectWithStats } from "@/lib/types";

interface Props {
  projects: ProjectWithStats[];
}

export function AgentProjectsClient({ projects }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Projects</h1>
        <p className="text-secondary text-sm mt-1">{projects.length} assigned project{projects.length !== 1 ? "s" : ""}</p>
      </div>

      {projects.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-heading font-semibold">No projects assigned</p>
            <p className="text-sm text-muted mt-1">Projects will appear here when assigned to you</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/agent/projects/${project.id}`}>
              <Card padding="sm" className="hover:border-emerald-primary/30 transition-colors overflow-hidden">
                {/* Hero image */}
                {project.hero_render_url ? (
                  <div className="h-36 -mx-4 -mt-4 mb-3 overflow-hidden bg-bg-alt">
                    <img
                      src={project.hero_render_url}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-36 -mx-4 -mt-4 mb-3 bg-gradient-to-br from-emerald-primary/10 to-emerald-primary/5 flex items-center justify-center">
                    <span className="text-4xl font-bold text-emerald-primary/20">{project.name.charAt(0)}</span>
                  </div>
                )}
                <div className="px-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ProjectLogo logoUrl={project.logo_url} name={project.name} size={24} />
                    <h3 className="text-sm font-semibold text-heading truncate">{project.name}</h3>
                  </div>
                  <p className="text-xs text-secondary mb-3 truncate">
                    {project.address}
                    {project.suburb && `, ${project.suburb}`}
                  </p>
                  <StockSummaryBar stats={project.stats} />
                  <p className="text-[10px] text-muted mt-1.5">{project.stats.total} lot{project.stats.total !== 1 ? "s" : ""}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
