import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AGENT_ALLOWED_STATUSES = ["Available", "EOI", "Under Contract", "Exchanged"];

export async function POST(request: Request) {
  try {
    const { id, status, forceOverride } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    if (!AGENT_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Agents cannot set status to Settled" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get current lot status
    const { data: currentLot } = await supabase
      .from("stock")
      .select("status")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("stock")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If status changed to Available, unlink all customers from this lot
    if (status === "Available") {
      await supabase
        .from("contact_stock")
        .delete()
        .eq("stock_id", id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
