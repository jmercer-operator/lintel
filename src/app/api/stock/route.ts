import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("stock")
    .select("id, lot_number, price")
    .order("lot_number", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data || []);
}
