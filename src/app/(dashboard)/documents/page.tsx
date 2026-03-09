import { getProjects } from "@/lib/data/projects";
import { getDocumentCategories, getProjectDocumentCounts } from "@/lib/data/documents";
import { DEFAULT_ORG_ID } from "@/lib/types";
import { DocumentsOverviewClient } from "./DocumentsOverviewClient";

export default async function DocumentsPage() {
  const [projects, categories, docCounts] = await Promise.all([
    getProjects(),
    getDocumentCategories(DEFAULT_ORG_ID),
    getProjectDocumentCounts(DEFAULT_ORG_ID),
  ]);

  return (
    <DocumentsOverviewClient
      projects={projects}
      categories={categories}
      docCounts={docCounts}
    />
  );
}
