import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/data-client";

export async function GET() {
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, first_name, last_name, email")
    .eq("status", "active")
    .order("first_name", { ascending: true });

  if (error) {
    return NextResponse.json({ agents: [] }, { status: 500 });
  }

  return NextResponse.json({ agents: data || [] });
}
