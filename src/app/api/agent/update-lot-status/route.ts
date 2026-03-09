import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AGENT_ALLOWED_STATUSES = ["Available", "EOI", "Under Contract", "Exchanged"];

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    if (!AGENT_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Agents cannot set status to Settled" }, { status: 403 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("stock")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
