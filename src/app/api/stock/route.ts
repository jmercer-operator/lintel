import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("stock")
    .select("id, lot_number, price, bedrooms, bathrooms, car_spaces, internal_area, external_area, status, project_id, agent_id")
    .order("lot_number", { ascending: true });

  if (projectId) query = query.eq("project_id", projectId);
  if (agentId) query = query.eq("agent_id", agentId);
  if (status) {
    const statuses = status.split(",");
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
