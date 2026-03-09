import { createClient } from "@/lib/supabase/server";
import type { EmailTemplate, EmailTemplateCategory } from "@/lib/types";
import { DEFAULT_ORG_ID } from "@/lib/types";

export async function getEmailTemplates(category?: EmailTemplateCategory): Promise<EmailTemplate[]> {
  const supabase = await createClient();
  let query = supabase
    .from("email_templates")
    .select("*")
    .eq("org_id", DEFAULT_ORG_ID)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }
  return (data || []) as EmailTemplate[];
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as EmailTemplate;
}

export async function createTemplate(data: {
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").insert({
    org_id: DEFAULT_ORG_ID,
    name: data.name,
    subject: data.subject,
    body: data.body,
    category: data.category,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updateTemplate(
  id: string,
  data: {
    name: string;
    subject: string;
    body: string;
    category: EmailTemplateCategory;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      name: data.name,
      subject: data.subject,
      body: data.body,
      category: data.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}
