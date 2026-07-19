"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";

/**
 * Agent-scoped contact actions. Unlike the staff actions in actions.ts these
 * derive the acting agent from the authenticated session (getAgentApiContext)
 * and never trust client-supplied agent/org identity:
 * - referring_agent_id is forced to the session agent for non-privileged callers.
 * - org_id comes from the session context, never the form.
 * - Updates are restricted to the agent's own referred clients.
 * - Lot status changes go through the lintel_agent_update_lot_status RPC for
 *   agent sessions (direct stock UPDATE was dropped in phase 6 RLS).
 * RLS remains the backstop for every write here.
 */

function parseContactFields(formData: FormData) {
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  if (!first_name || !last_name) {
    return { error: "First name and last name are required" as const };
  }

  const email = formData.get("email") as string;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email format" as const };
  }

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const buyerType = (formData.get("buyer_type") as string) || null;
  if (buyerType === "investor") {
    if (!tags.includes("investor")) tags.push("investor");
    const idx = tags.indexOf("owner-occupier");
    if (idx !== -1) tags.splice(idx, 1);
  }
  if (buyerType === "owner_occupier") {
    if (!tags.includes("owner-occupier")) tags.push("owner-occupier");
    const idx = tags.indexOf("investor");
    if (idx !== -1) tags.splice(idx, 1);
  }

  const firbRequired =
    formData.get("firb_required") === "true" || formData.get("firb_required") === "on";

  return {
    fields: {
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
      preferred_contact_method: (formData.get("preferred_contact_method") as string) || null,
      marketing_consent:
        formData.get("marketing_consent") === "on" ||
        formData.get("marketing_consent") === "true",
      notes: (formData.get("notes") as string) || null,
    },
    tags,
  };
}

export async function agentCreateContactAction(formData: FormData) {
  const ctx = await getAgentApiContext();
  if (!ctx || !ctx.agentId) return { error: "Unauthorized" };

  const parsed = parseContactFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields, tags } = parsed;

  const supabase = await createDataClient();

  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      ...fields,
      org_id: ctx.orgId,
      referring_agent_id: ctx.agentId,
      tags,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Auto-link to stock when opened from the Reserve/Link flow.
  const defaultStockId = formData.get("default_stock_id") as string;
  const defaultProjectId = formData.get("default_project_id") as string;
  if (defaultStockId && defaultProjectId && newContact) {
    // The lot must belong to the acting agent (staff callers may act freely).
    if (!ctx.isPrivileged) {
      const { data: lot } = await supabase
        .from("stock")
        .select("id, agent_id")
        .eq("id", defaultStockId)
        .maybeSingle();
      if (!lot || lot.agent_id !== ctx.agentId) {
        return { error: "You can only link clients to your own lots" };
      }
    }

    const { data: existingLinks } = await supabase
      .from("contact_stock")
      .select("id")
      .eq("stock_id", defaultStockId);

    const role = existingLinks && existingLinks.length > 0 ? "co_buyer" : "buyer";

    const { error: linkError } = await supabase.from("contact_stock").insert({
      contact_id: newContact.id,
      stock_id: defaultStockId,
      project_id: defaultProjectId,
      role,
    });
    if (linkError) return { error: `Client saved but lot link failed: ${linkError.message}` };

    // Linked lots move to EOI. Agent sessions must use the hardened RPC.
    if (ctx.isPrivileged) {
      await supabase
        .from("stock")
        .update({ status: "EOI", updated_at: new Date().toISOString() })
        .eq("id", defaultStockId);
    } else {
      const { error: rpcError } = await supabase.rpc("lintel_agent_update_lot_status", {
        target_stock_id: defaultStockId,
        target_status: "EOI",
      });
      if (rpcError) {
        return { error: `Client linked but status change failed: ${rpcError.message}` };
      }
    }

    // Auto-add project slug tag.
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", defaultProjectId)
      .single();
    if (project) {
      const slug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (!tags.includes(slug)) {
        await supabase
          .from("contacts")
          .update({ tags: [...tags, slug] })
          .eq("id", newContact.id);
      }
    }
  }

  revalidatePath("/agent");
  revalidatePath("/agent/clients");
  revalidatePath("/agent/lots");
  return { success: true };
}

export async function agentUpdateContactAction(formData: FormData) {
  const ctx = await getAgentApiContext();
  if (!ctx || !ctx.agentId) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Contact ID is required" };

  const parsed = parseContactFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields, tags } = parsed;

  const supabase = await createDataClient();

  // Agents may only edit their own referred clients.
  if (!ctx.isPrivileged) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, referring_agent_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing || existing.referring_agent_id !== ctx.agentId) {
      return { error: "You can only edit your own clients" };
    }
  }

  // referring_agent_id and org_id are intentionally never updated here.
  const { error } = await supabase
    .from("contacts")
    .update({
      ...fields,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/agent/clients");
  revalidatePath(`/agent/clients/${id}`);
  return { success: true };
}
