import { createClient } from "@/lib/supabase/server";
import type { StockItem } from "@/lib/types";

export async function getStock(projectId: string, status?: string): Promise<StockItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("stock")
    .select("*")
    .eq("project_id", projectId)
    .order("lot_number", { ascending: true });

  if (status && status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as StockItem[];
}

export async function getStockForDashboard(projectId?: string, status?: string): Promise<StockItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("stock")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  if (status && status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as StockItem[];
}

export async function getStockItem(id: string): Promise<StockItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as StockItem;
}

export async function createStock(data: {
  project_id: string;
  org_id: string;
  lot_number: string;
  bedrooms: number;
  bathrooms: number;
  car_spaces: number;
  internal_area?: number | null;
  external_area?: number | null;
  price?: number | null;
  status: string;
  level?: number | null;
  aspect?: string | null;
  agent_name?: string | null;
  notes?: string | null;
}): Promise<StockItem> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return stock as StockItem;
}

export async function updateStock(
  id: string,
  data: Partial<{
    lot_number: string;
    bedrooms: number;
    bathrooms: number;
    car_spaces: number;
    internal_area: number | null;
    external_area: number | null;
    price: number | null;
    status: string;
    level: number | null;
    aspect: string | null;
    agent_name: string | null;
    notes: string | null;
  }>
): Promise<StockItem> {
  const supabase = await createClient();

  const { data: stock, error } = await supabase
    .from("stock")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return stock as StockItem;
}
