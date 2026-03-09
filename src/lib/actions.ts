"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ORG_ID } from "@/lib/types";
import type { DocumentVisibility } from "@/lib/types";

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
      agency: (formData.get("agency") as string) || null,
      commission_type: (formData.get("commission_type") as string) || null,
      commission_rate: formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null,
      status: (formData.get("status") as string) || "active",
      address_line_1: (formData.get("address_line_1") as string) || null,
      address_line_2: (formData.get("address_line_2") as string) || null,
      suburb: (formData.get("suburb") as string) || null,
      state: (formData.get("state") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      country: (formData.get("country") as string) || "AU",
      notes: (formData.get("notes") as string) || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Assign to projects with per-project commission
  const projectIds = formData.getAll("project_ids") as string[];
  if (projectIds.length > 0 && agent) {
    const rows = projectIds.map((pid) => {
      const commType = (formData.get(`project_commission_type_${pid}`) as string) || null;
      const commRate = formData.get(`project_commission_rate_${pid}`)
        ? parseFloat(formData.get(`project_commission_rate_${pid}`) as string)
        : null;
      return {
        agent_id: agent.id,
        project_id: pid,
        commission_type: commType,
        commission_rate: commRate,
      };
    });
    await supabase.from("agent_projects").insert(rows);
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
      agency: (formData.get("agency") as string) || null,
      commission_type: (formData.get("commission_type") as string) || null,
      commission_rate: formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null,
      status: (formData.get("status") as string) || "active",
      address_line_1: (formData.get("address_line_1") as string) || null,
      address_line_2: (formData.get("address_line_2") as string) || null,
      suburb: (formData.get("suburb") as string) || null,
      state: (formData.get("state") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      country: (formData.get("country") as string) || "AU",
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Update project assignments with per-project commission
  const projectIds = formData.getAll("project_ids") as string[];
  await supabase.from("agent_projects").delete().eq("agent_id", id);
  if (projectIds.length > 0) {
    const rows = projectIds.map((pid) => {
      const commType = (formData.get(`project_commission_type_${pid}`) as string) || null;
      const commRate = formData.get(`project_commission_rate_${pid}`)
        ? parseFloat(formData.get(`project_commission_rate_${pid}`) as string)
        : null;
      return {
        agent_id: id,
        project_id: pid,
        commission_type: commType,
        commission_rate: commRate,
      };
    });
    await supabase.from("agent_projects").insert(rows);
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

  // Auto-tags based on buyer_type
  const buyerType = (formData.get("buyer_type") as string) || null;
  if (buyerType === "investor" && !tags.includes("investor")) tags.push("investor");
  if (buyerType === "owner_occupier" && !tags.includes("owner-occupier")) tags.push("owner-occupier");
  // Remove opposite tag if switching
  if (buyerType === "investor") {
    const idx = tags.indexOf("owner-occupier");
    if (idx !== -1) tags.splice(idx, 1);
  }
  if (buyerType === "owner_occupier") {
    const idx = tags.indexOf("investor");
    if (idx !== -1) tags.splice(idx, 1);
  }

  const firbRequired = formData.get("firb_required") === "true" || formData.get("firb_required") === "on";

  const { data: newContact, error } = await supabase.from("contacts").insert({
    org_id: DEFAULT_ORG_ID,
    classification: (formData.get("classification") as string) || "prospect",
    buyer_type: buyerType,
    firb_required: firbRequired,
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
  }).select().single();

  if (error) return { error: error.message };

  // Auto-link to stock if default_stock_id was provided (from Reserve/Link flow)
  const defaultStockId = formData.get("default_stock_id") as string;
  const defaultProjectId = formData.get("default_project_id") as string;
  if (defaultStockId && defaultProjectId && newContact) {
    // Check if this lot already has a buyer
    const { data: existingLinks } = await supabase
      .from("contact_stock")
      .select("id")
      .eq("stock_id", defaultStockId);

    const role = (existingLinks && existingLinks.length > 0) ? "co_buyer" : "buyer";

    await supabase.from("contact_stock").insert({
      contact_id: newContact.id,
      stock_id: defaultStockId,
      project_id: defaultProjectId,
      role,
    });

    // Auto-change lot status to EOI
    await supabase
      .from("stock")
      .update({ status: "EOI", updated_at: new Date().toISOString() })
      .eq("id", defaultStockId);

    // Auto-add project slug tag
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", defaultProjectId)
      .single();

    if (project) {
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!tags.includes(slug)) {
        await supabase
          .from("contacts")
          .update({ tags: [...tags, slug] })
          .eq("id", newContact.id);
      }
    }

    revalidatePath(`/projects/${defaultProjectId}`);
  }

  revalidatePath("/contacts");
  revalidatePath("/agent/lots");
  revalidatePath("/agent/clients");
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

  // Auto-tags based on buyer_type
  const buyerType = (formData.get("buyer_type") as string) || null;
  if (buyerType === "investor" && !tags.includes("investor")) tags.push("investor");
  if (buyerType === "owner_occupier" && !tags.includes("owner-occupier")) tags.push("owner-occupier");
  if (buyerType === "investor") {
    const idx = tags.indexOf("owner-occupier");
    if (idx !== -1) tags.splice(idx, 1);
  }
  if (buyerType === "owner_occupier") {
    const idx = tags.indexOf("investor");
    if (idx !== -1) tags.splice(idx, 1);
  }

  const firbRequired = formData.get("firb_required") === "true" || formData.get("firb_required") === "on";

  const { error } = await supabase
    .from("contacts")
    .update({
      classification: (formData.get("classification") as string) || "prospect",
      buyer_type: buyerType,
      firb_required: firbRequired,
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

  const project_status = (formData.get("project_status") as string) || null;
  const development_type = (formData.get("development_type") as string) || null;
  const num_dwellings = formData.get("num_dwellings") ? parseInt(formData.get("num_dwellings") as string) : null;
  const num_commercial = formData.get("num_commercial") ? parseInt(formData.get("num_commercial") as string) : null;
  const num_hotel_keys = formData.get("num_hotel_keys") ? parseInt(formData.get("num_hotel_keys") as string) : null;
  const description = (formData.get("description") as string) || null;

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
      project_status,
      development_type,
      num_dwellings,
      num_commercial,
      num_hotel_keys,
      description,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}

export async function updateProjectAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  if (!id) return { error: "Project ID is required" };

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  if (!name || !address) return { error: "Name and address are required" };

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      address,
      suburb: (formData.get("suburb") as string) || null,
      state: (formData.get("state") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      project_status: (formData.get("project_status") as string) || null,
      development_type: (formData.get("development_type") as string) || null,
      num_dwellings: formData.get("num_dwellings") ? parseInt(formData.get("num_dwellings") as string) : null,
      num_commercial: formData.get("num_commercial") ? parseInt(formData.get("num_commercial") as string) : null,
      num_hotel_keys: formData.get("num_hotel_keys") ? parseInt(formData.get("num_hotel_keys") as string) : null,
      description: (formData.get("description") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${id}`);
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
  const commission_type = (formData.get("commission_type") as string) || null;
  const commission_rate = formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null;

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
      commission_type,
      commission_rate,
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

  const commission_type_upd = (formData.get("commission_type") as string) || null;
  const commission_rate_upd = formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : null;

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
      commission_type: commission_type_upd,
      commission_rate: commission_rate_upd,
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

/* ─── Document Actions ─── */

export async function uploadProjectDocumentAction(formData: FormData) {
  const supabase = await createClient();

  const project_id = formData.get("project_id") as string;
  const category_id = formData.get("category_id") as string;
  const visibility = (formData.get("visibility") as DocumentVisibility) || "agent";
  const file = formData.get("file") as File;

  if (!file || !project_id || !category_id) {
    return { error: "File, project, and category are required" };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { error: "File size exceeds 50MB limit" };
  }

  const filePath = `${DEFAULT_ORG_ID}/${project_id}/${category_id}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from("project_documents").insert({
    project_id,
    org_id: DEFAULT_ORG_ID,
    category_id,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
    visibility,
    uploaded_by: null,
  });

  if (dbError) return { error: dbError.message };

  // Auto-set project logo/hero for special categories
  const categoryName = formData.get("category_name") as string;
  if (categoryName === "Project Logo") {
    const { data: signedData } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    if (signedData?.signedUrl) {
      await supabase
        .from("projects")
        .update({ logo_url: signedData.signedUrl, updated_at: new Date().toISOString() })
        .eq("id", project_id);
    }
  }
  if (categoryName === "Hero Render") {
    const { data: signedData } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    if (signedData?.signedUrl) {
      await supabase
        .from("projects")
        .update({ hero_render_url: signedData.signedUrl, updated_at: new Date().toISOString() })
        .eq("id", project_id);
    }
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/documents");
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProjectDocumentAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const file_path = formData.get("file_path") as string;
  const project_id = formData.get("project_id") as string;

  if (!id) return { error: "Document ID is required" };

  if (file_path) {
    await supabase.storage.from("project-documents").remove([file_path]);
  }

  const { error } = await supabase.from("project_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/documents");
  return { success: true };
}

export async function uploadClientDocumentAction(formData: FormData) {
  const supabase = await createClient();

  const contact_id = formData.get("contact_id") as string;
  const document_type = formData.get("document_type") as string;
  const file = formData.get("file") as File;

  if (!file || !contact_id || !document_type) {
    return { error: "File, contact, and document type are required" };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { error: "File size exceeds 50MB limit" };
  }

  const typeSlug = document_type.toLowerCase().replace(/\s+/g, "-");
  const filePath = `${DEFAULT_ORG_ID}/${contact_id}/${typeSlug}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from("client_documents").insert({
    contact_id,
    org_id: DEFAULT_ORG_ID,
    document_type,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
    visibility: "staff",
    uploaded_by: null,
  });

  if (dbError) return { error: dbError.message };

  revalidatePath(`/contacts/${contact_id}`);
  return { success: true };
}

export async function deleteClientDocumentAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const file_path = formData.get("file_path") as string;
  const contact_id = formData.get("contact_id") as string;

  if (!id) return { error: "Document ID is required" };

  if (file_path) {
    await supabase.storage.from("client-documents").remove([file_path]);
  }

  const { error } = await supabase.from("client_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contact_id}`);
  return { success: true };
}

/* ─── Contact-Stock Linking Actions ─── */

export async function linkContactToStockAction(formData: FormData) {
  const supabase = await createClient();

  const contact_id = formData.get("contact_id") as string;
  const stock_id = formData.get("stock_id") as string;
  const project_id = formData.get("project_id") as string;

  if (!contact_id || !stock_id || !project_id) {
    return { error: "Contact, stock, and project are required" };
  }

  // Create the link
  const { error: linkError } = await supabase.from("contact_stock").insert({
    contact_id,
    stock_id,
    project_id,
    role: "buyer",
  });

  if (linkError) {
    if (linkError.message.includes("duplicate") || linkError.message.includes("unique")) {
      return { error: "This contact is already linked to this lot" };
    }
    return { error: linkError.message };
  }

  // Auto-change stock status to EOI
  await supabase
    .from("stock")
    .update({ status: "EOI", updated_at: new Date().toISOString() })
    .eq("id", stock_id);

  // Auto-add project slug tag to contact
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", project_id)
    .single();

  if (project) {
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", contact_id)
      .single();

    const currentTags: string[] = contact?.tags || [];
    if (!currentTags.includes(slug)) {
      await supabase
        .from("contacts")
        .update({ tags: [...currentTags, slug] })
        .eq("id", contact_id);
    }
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath(`/contacts/${contact_id}`);
  revalidatePath("/contacts");
  return { success: true };
}

/* ─── Multi-file Upload Action ─── */

export async function uploadMultipleProjectDocumentsAction(formData: FormData) {
  const supabase = await createClient();

  const project_id = formData.get("project_id") as string;
  const category_id = formData.get("category_id") as string;
  const category_name = formData.get("category_name") as string;
  const visibility = (formData.get("visibility") as DocumentVisibility) || "agent";
  const files = formData.getAll("files") as File[];

  if (!files.length || !project_id || !category_id) {
    return { error: "Files, project, and category are required" };
  }

  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) {
      return { error: `File "${file.name}" exceeds 50MB limit` };
    }

    const filePath = `${DEFAULT_ORG_ID}/${project_id}/${category_id}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) return { error: uploadError.message };

    const { error: dbError } = await supabase.from("project_documents").insert({
      project_id,
      org_id: DEFAULT_ORG_ID,
      category_id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      visibility,
      uploaded_by: null,
    });

    if (dbError) return { error: dbError.message };

    // Auto-set project logo_url or hero_render_url for special categories
    if (category_name === "Project Logo") {
      const { data: signedData } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (signedData?.signedUrl) {
        await supabase
          .from("projects")
          .update({ logo_url: signedData.signedUrl, updated_at: new Date().toISOString() })
          .eq("id", project_id);
      }
    }

    if (category_name === "Hero Render" && files.indexOf(file) === 0) {
      const { data: signedData } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signedData?.signedUrl) {
        await supabase
          .from("projects")
          .update({ hero_render_url: signedData.signedUrl, updated_at: new Date().toISOString() })
          .eq("id", project_id);
      }
    }
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/documents");
  revalidatePath("/projects");
  return { success: true };
}

/* ─── Milestone Actions ─── */

export async function updateMilestoneAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const target_date = (formData.get("target_date") as string) || null;
  const completed_date = (formData.get("completed_date") as string) || null;
  const project_id = formData.get("project_id") as string;

  if (!id) return { error: "Milestone ID is required" };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (target_date !== undefined) updates.target_date = target_date;
  if (completed_date !== undefined) updates.completed_date = completed_date;

  const { error } = await supabase
    .from("project_milestones")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${project_id}`);
  return { success: true };
}
