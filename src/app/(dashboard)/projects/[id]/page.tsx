import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getStock } from "@/lib/data/stock";
import { ProjectDetailClient } from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { status } = await searchParams;

  const project = await getProject(id);
  if (!project) notFound();

  const statusFilter = status || "All";
  const stock = await getStock(id, statusFilter);

  return (
    <ProjectDetailClient
      project={project}
      stock={stock}
      statusFilter={statusFilter}
    />
  );
}
