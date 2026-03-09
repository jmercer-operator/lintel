import { getEmailTemplates } from "@/lib/data/email-templates";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage() {
  const templates = await getEmailTemplates();

  return <TemplatesClient templates={templates} />;
}
