import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/data-client";

export async function GET() {
  try {
    const supabase = await createDataClient();

    const { count, error } = await supabase
      .from("agent_registrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
