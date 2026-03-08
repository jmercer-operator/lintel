"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ORG_ID } from "@/lib/types";

/* ─── Agent Actions ─── */

export async function createAgentAction(formData: FormData) {
  const supabase = await createClient();

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;

  if (!first_name || !last_name) {
    return { error: "First name and last name are required" };
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      org_id: DEFAULT_ORG_ID,
      first_name,
      last_name,
      preferred_name: (formData.get("preferred_name") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      secondary_phone: (formData.get("secondary_phone") as string) || null,
      company: (formData.get("company") as string) || null,
      agency: (formData.get("agency") as string) || null,
      license_number: (formData.get("license_number") as string) || null,
      license_expiry: (formData.get("license_expiry") as string) || null,
      commission_type: (formData.get("commission_type") as string) || null,
      commission_rate: formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null,
      status: (formData.get("status") as string) || "active",
      notes: (formData.get("notes") as string) || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Assign to projects
  const projectIds = formData.getAll("project_ids") as string[];
  if (projectIds.length > 0 && agent) {
    await supabase.from("agent_projects").insert(
      projectIds.map((pid) => ({ agent_id: agent.id, project_id: pid }))
    );
  }

  revalidatePath("/agents");
  return { success: true };
}

export async function updateAgentAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  if (!id) return { error: "Agent ID is required" };

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  if (!first_name || !last_name) return { error: "First name and last name are required" };

  const { error } = await supabase
    .from("agents")
    .update({
      first_name,
      last_name,
      preferred_name: (formData.get("preferred_name") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      secondary_phone: (formData.get("secondary_phone") as string) || null,
      company: (formData.get("company") as string) || null,
      agency: (formData.get("agency") as string) || null,
      license_number: (formData.get("license_number") as string) || null,
      license_expiry: (formData.get("license_expiry") as string) || null,
      commission_type: (formData.get("commission_type") as string) || null,
      commission_rate: formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null,
      status: (formData.get("status") as string) || "active",
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Update project assignments
  const projectIds = formData.getAll("project_ids") as string[];
  await supabase.from("agent_projects").delete().eq("agent_id", id);
  if (projectIds.length > 0) {
    await supabase.from("agent_projects").insert(
      projectIds.map((pid) => ({ agent_id: id, project_id: pid }))
    );
  }

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);
  return { success: true };
}

/* ─── Contact Actions ─── */

export async function createContactAction(formData: FormData) {
  const supabase = await createClient();

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  if (!first_name || !last_name) return { error: "First name and last name are required" };

  const email = formData.get("email") as string;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email format" };
  }

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const { error } = await supabase.from("contacts").insert({
    org_id: DEFAULT_ORG_ID,
    classification: (formData.get("classification") as string) || "prospect",
    first_name,
    last_name,
    preferred_name: (formData.get("preferred_name") as string) || null,
    email: email || null,
    phone: (formData.get("phone") as string) || null,
    secondary_phone: (formData.get("secondary_phone") as string) || null,
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    nationality: (formData.get("nationality") as string) || null,
    country_of_residence: (formData.get("country_of_residence") as string) || null,
    id_type: (formData.get("id_type") as string) || null,
    id_number: (formData.get("id_number") as string) || null,
    id_expiry: (formData.get("id_expiry") as string) || null,
    id_country: (formData.get("id_country") as string) || null,
    address_line_1: (formData.get("address_line_1") as string) || null,
    address_line_2: (formData.get("address_line_2") as string) || null,
    suburb: (formData.get("suburb") as string) || null,
    state: (formData.get("state") as string) || null,
    postcode: (formData.get("postcode") as string) || null,
    country: (formData.get("country") as string) || "AU",
    postal_address_line_1: (formData.get("postal_address_line_1") as string) || null,
    postal_address_line_2: (formData.get("postal_address_line_2") as string) || null,
    postal_suburb: (formData.get("postal_suburb") as string) || null,
    postal_state: (formData.get("postal_state") as string) || null,
    postal_postcode: (formData.get("postal_postcode") as string) || null,
    postal_country: (formData.get("postal_country") as string) || null,
    employer: (formData.get("employer") as string) || null,
    occupation: (formData.get("occupation") as string) || null,
    company: (formData.get("company") as string) || null,
    solicitor_name: (formData.get("solicitor_name") as string) || null,
    solicitor_firm: (formData.get("solicitor_firm") as string) || null,
    solicitor_email: (formData.get("solicitor_email") as string) || null,
    solicitor_phone: (formData.get("solicitor_phone") as string) || null,
    source: (formData.get("source") as string) || null,
    source_detail: (formData.get("source_detail") as string) || null,
    referring_agent_id: (formData.get("referring_agent_id") as string) || null,
    preferred_contact_method: (formData.get("preferred_contact_method") as string) || null,
    marketing_consent: formData.get("marketing_consent") === "on" || formData.get("marketing_consent") === "true",
    tags,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return { success: true };
}

export async function updateContactAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  if (!id) return { error: "Contact ID is required" };

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  if (!first_name || !last_name) return { error: "First name and last name are required" };

  const email = formData.get("email") as string;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email format" };
  }

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const { error } = await supabase
    .from("contacts")
    .update({
      classification: (formData.get("classification") as string) || "prospect",
      first_name,
      last_name,
      preferred_name: (formData.get("preferred_name") as string) || null,
      email: email || null,
      phone: (formData.get("phone") as string) || null,
      secondary_phone: (formData.get("secondary_phone") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      nationality: (formData.get("nationality") as string) || null,
      country_of_residence: (formData.get("country_of_residence") as string) || null,
      id_type: (formData.get("id_type") as string) || null,
      id_number: (formData.get("id_number") as string) || null,
      id_expiry: (formData.get("id_expiry") as string) || null,
      id_country: (formData.get("id_country") as string) || null,
      address_line_1: (formData.get("address_line_1") as string) || null,
      address_line_2: (formData.get("address_line_2") as string) || null,
      suburb: (formData.get("suburb") as string) || null,
      state: (formData.get("state") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      country: (formData.get("country") as string) || "AU",
      postal_address_line_1: (formData.get("postal_address_line_1") as string) || null,
      postal_address_line_2: (formData.get("postal_address_line_2") as string) || null,
      postal_suburb: (formData.get("postal_suburb") as string) || null,
      postal_state: (formData.get("postal_state") as string) || null,
      postal_postcode: (formData.get("postal_postcode") as string) || null,
      postal_country: (formData.get("postal_country") as string) || null,
      employer: (formData.get("employer") as string) || null,
      occupation: (formData.get("occupation") as string) || null,
      company: (formData.get("company") as string) || null,
      solicitor_name: (formData.get("solicitor_name") as string) || null,
      solicitor_firm: (formData.get("solicitor_firm") as string) || null,
      solicitor_email: (formData.get("solicitor_email") as string) || null,
      solicitor_phone: (formData.get("solicitor_phone") as string) || null,
      source: (formData.get("source") as string) || null,
      source_detail: (formData.get("source_detail") as string) || null,
      referring_agent_id: (formData.get("referring_agent_id") as string) || null,
      preferred_contact_method: (formData.get("preferred_contact_method") as string) || null,
      marketing_consent: formData.get("marketing_consent") === "on" || formData.get("marketing_consent") === "true",
      tags,
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const suburb = formData.get("suburb") as string;
  const state = formData.get("state") as string;
  const postcode = formData.get("postcode") as string;

  if (!name || !address) {
    return { error: "Name and address are required" };
  }

  const { error } = await supabase
    .from("projects")
    .insert({
      org_id: DEFAULT_ORG_ID,
      name,
      address,
      suburb: suburb || null,
      state: state || null,
      postcode: postcode || null,
      status: "active",
      total_lots: 0,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}

export async function createStockAction(formData: FormData) {
  const supabase = await createClient();

  const project_id = formData.get("project_id") as string;
  const lot_number = formData.get("lot_number") as string;
  const bedrooms = parseInt(formData.get("bedrooms") as string) || 0;
  const bathrooms = parseInt(formData.get("bathrooms") as string) || 0;
  const car_spaces = parseInt(formData.get("car_spaces") as string) || 0;
  const internal_area = formData.get("internal_area") ? parseFloat(formData.get("internal_area") as string) : null;
  const external_area = formData.get("external_area") ? parseFloat(formData.get("external_area") as string) : null;
  const price = formData.get("price") ? parseFloat(formData.get("price") as string) : null;
  const status = (formData.get("status") as string) || "Available";
  const level = formData.get("level") ? parseInt(formData.get("level") as string) : null;
  const aspect = (formData.get("aspect") as string) || null;
  const agent_name = (formData.get("agent_name") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!lot_number || !project_id) {
    return { error: "Lot number and project are required" };
  }

  const { error } = await supabase
    .from("stock")
    .insert({
      project_id,
      org_id: DEFAULT_ORG_ID,
      lot_number,
      bedrooms,
      bathrooms,
      car_spaces,
      internal_area,
      external_area,
      price,
      status,
      level,
      aspect,
      agent_name,
      notes,
    });

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: `Lot ${lot_number} already exists in this project` };
    }
    return { error: error.message };
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}

export async function updateStockAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const project_id = formData.get("project_id") as string;
  const lot_number = formData.get("lot_number") as string;
  const bedrooms = parseInt(formData.get("bedrooms") as string) || 0;
  const bathrooms = parseInt(formData.get("bathrooms") as string) || 0;
  const car_spaces = parseInt(formData.get("car_spaces") as string) || 0;
  const internal_area = formData.get("internal_area") ? parseFloat(formData.get("internal_area") as string) : null;
  const external_area = formData.get("external_area") ? parseFloat(formData.get("external_area") as string) : null;
  const price = formData.get("price") ? parseFloat(formData.get("price") as string) : null;
  const status = (formData.get("status") as string) || "Available";
  const level = formData.get("level") ? parseInt(formData.get("level") as string) : null;
  const aspect = (formData.get("aspect") as string) || null;
  const agent_name = (formData.get("agent_name") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !lot_number) {
    return { error: "ID and lot number are required" };
  }

  const { error } = await supabase
    .from("stock")
    .update({
      lot_number,
      bedrooms,
      bathrooms,
      car_spaces,
      internal_area,
      external_area,
      price,
      status,
      level,
      aspect,
      agent_name,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}
