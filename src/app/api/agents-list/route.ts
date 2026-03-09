import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

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
