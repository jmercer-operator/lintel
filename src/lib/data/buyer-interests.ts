import { createClient } from "@/lib/supabase/server";
import type { BuyerInterest } from "@/lib/types";

export async function getBuyerInterests(contactId: string): Promise<BuyerInterest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("buyer_interests")
    .select(`
      *,
      stock:stock_id (lot_number, price, project_id, projects:project_id (name))
    `)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching buyer interests:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const stock = row.stock as { lot_number: string; price: number | null; project_id: string; projects: { name: string } | null } | null;
    return {
      id: row.id as string,
      contact_id: row.contact_id as string,
      stock_id: row.stock_id as string,
      interest_level: row.interest_level as BuyerInterest["interest_level"],
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      lot_number: stock?.lot_number || undefined,
      project_name: stock?.projects?.name || undefined,
      project_id: stock?.project_id || undefined,
      price: stock?.price ?? null,
    };
  });
}

export async function createBuyerInterest(data: {
  contact_id: string;
  stock_id: string;
  interest_level: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("buyer_interests").insert({
    contact_id: data.contact_id,
    stock_id: data.stock_id,
    interest_level: data.interest_level,
    notes: data.notes || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "This interest already exists" };
    return { error: error.message };
  }
  return {};
}

export async function removeBuyerInterest(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("buyer_interests")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}
