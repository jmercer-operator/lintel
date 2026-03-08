"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ORG_ID } from "@/lib/types";

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
