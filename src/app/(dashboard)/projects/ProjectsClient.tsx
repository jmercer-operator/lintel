"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { NewProjectForm } from "@/components/NewProjectForm";
import { StockSummaryBar } from "@/components/StockSummaryBar";
import { ProjectLogo } from "@/components/ProjectLogo";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import type { ProjectWithStats, ProjectConstructionStatus } from "@/lib/types";

interface ProjectsClientProps {
  projects: ProjectWithStats[];
}

export function ProjectsClient({ projects: initialProjects }: ProjectsClientProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState(initialProjects);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragCounter = useRef<Record<number, number>>({});

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => {
      el.style.opacity = "0.5";
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "1";
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = {};
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current[index] = (dragCounter.current[index] || 0) + 1;
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current[index] = (dragCounter.current[index] || 0) - 1;
    if (dragCounter.current[index] <= 0) {
      dragCounter.current[index] = 0;
      if (dragOverIndex === index) {
        setDragOverIndex(null);
      }
    }
  }, [dragOverIndex]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    dragCounter.current = {};

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    const newProjects = [...projects];
    const [moved] = newProjects.splice(dragIndex, 1);
    newProjects.splice(dropIndex, 0, moved);
    setProjects(newProjects);
    setDragIndex(null);

    // Save new order
    setSaving(true);
    try {
      await fetch("/api/projects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: newProjects.map((p) => p.id) }),
      });
    } catch {
      // Revert on error
      setProjects(projects);
    }
    setSaving(false);
  }, [dragIndex, projects]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Projects</h1>
          <p className="text-secondary text-sm mt-1">
            All your development projects in one place
            {saving && <span className="ml-2 text-emerald-primary">· Saving order…</span>}
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
        {projects.map((project, index) => (
          <div
            key={project.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={(e) => handleDragLeave(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`transition-all duration-200 rounded-[14px] ${
              dragOverIndex === index && dragIndex !== index
                ? "ring-2 ring-dashed ring-[#1A9E6F] scale-[1.02]"
                : ""
            } ${dragIndex === index ? "opacity-50" : ""}`}
            style={{ cursor: "grab" }}
          >
            <Link href={`/projects/${project.id}`} draggable={false}>
              <Card
                padding="md"
                className="hover:shadow-card-hover cursor-pointer transition-shadow h-full"
              >
                <div className="space-y-4">
                  {/* Hero Render */}
                  {project.hero_render_url && (
                    <div className="-mx-5 -mt-5 mb-2 overflow-hidden rounded-t-[14px]">
                      <img
                        src={project.hero_render_url}
                        alt={project.name}
                        className="w-full h-36 object-cover"
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* Project name + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ProjectLogo logoUrl={project.logo_url} name={project.name} size={24} />
                        <h3 className="text-base font-semibold text-heading">{project.name}</h3>
                      </div>
                      <p className="text-sm text-secondary mt-0.5">
                        {project.address}
                        {project.suburb && `, ${project.suburb}`}
                        {project.state && ` ${project.state}`}
                        {project.postcode && ` ${project.postcode}`}
                      </p>
                    </div>
                    <ProjectStatusBadge status={project.project_status as ProjectConstructionStatus | null} />
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
          </div>
        ))}
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
