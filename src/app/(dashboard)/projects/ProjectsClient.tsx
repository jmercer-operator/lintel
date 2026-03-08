"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { NewProjectForm } from "@/components/NewProjectForm";
import { StockSummaryBar } from "@/components/StockSummaryBar";
import type { ProjectWithStats } from "@/lib/types";

const projectStatusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]" },
  completed: { bg: "bg-[#2D8C5A]/10", text: "text-[#2D8C5A]" },
  on_hold: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]" },
  archived: { bg: "bg-[#6B7A70]/10", text: "text-[#6B7A70]" },
};

const projectStatusLabels: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

interface ProjectsClientProps {
  projects: ProjectWithStats[];
}

export function ProjectsClient({ projects }: ProjectsClientProps) {
  const [showNewProject, setShowNewProject] = useState(false);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Projects</h1>
          <p className="text-secondary text-sm mt-1">
            All your development projects in one place
          </p>
        </div>
        <Button onClick={() => setShowNewProject(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {projects.map((project) => {
          const colors = projectStatusColors[project.status] || projectStatusColors.active;
          const label = projectStatusLabels[project.status] || project.status;

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card
                padding="md"
                className="hover:shadow-card-hover cursor-pointer transition-shadow h-full"
              >
                <div className="space-y-4">
                  {/* Project name + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-heading">{project.name}</h3>
                      <p className="text-sm text-secondary mt-0.5">
                        {project.address}
                        {project.suburb && `, ${project.suburb}`}
                        {project.state && ` ${project.state}`}
                        {project.postcode && ` ${project.postcode}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${colors.bg} ${colors.text}`}>
                      {label}
                    </span>
                  </div>

                  {/* Stock count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-body">
                      <span className="font-semibold text-heading">{project.stats.available}</span>
                      <span className="text-secondary"> available</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="font-mono text-heading">{project.stats.total}</span>
                      <span className="text-secondary"> total</span>
                    </span>
                  </div>

                  {/* Stock summary bar */}
                  <StockSummaryBar stats={project.stats} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-secondary">No projects yet. Create your first project to get started.</p>
        </Card>
      )}

      {/* New Project Modal */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New Project">
        <NewProjectForm
          onSuccess={() => {
            setShowNewProject(false);
            window.location.reload();
          }}
          onCancel={() => setShowNewProject(false)}
        />
      </Modal>
    </div>
  );
}
