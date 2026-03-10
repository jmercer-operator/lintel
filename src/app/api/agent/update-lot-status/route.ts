import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AGENT_ALLOWED_STATUSES = ["Available", "EOI", "Under Contract", "Exchanged"];

export async function POST(request: Request) {
  try {
    const { id, status, forceOverride, agentId } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    if (!AGENT_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Agents cannot set status to Settled" }, { status: 403 });
    }

    const supabase = createAdminClient();

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

    // Send notification to admin users about status change
    try {
      const { data: lotDetails } = await supabase
        .from("stock")
        .select("lot_number, project_id, projects(name)")
        .eq("id", id)
        .single();

      // Fetch agent info if agentId provided
      let agentName = "Unknown Agent";
      if (agentId) {
        const { data: agentData } = await supabase
          .from("agents")
          .select("first_name, last_name")
          .eq("id", agentId)
          .single();
        if (agentData) {
          agentName = `${agentData.first_name} ${agentData.last_name}`;
        }
      }

      const { data: admins } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("is_admin", true);

      if (admins && admins.length > 0) {
        const projectName = (lotDetails as Record<string, unknown>)?.projects
          ? ((lotDetails as Record<string, unknown>).projects as { name: string }).name
          : "Unknown";
        const lotNumber = lotDetails?.lot_number || "?";

        const notifications = admins.map((admin: { id: string; email: string }) => ({
          org_id: "a0000000-0000-0000-0000-000000000001",
          recipient_id: admin.id,
          recipient_type: "staff",
          type: "lot_status_change",
          title: `Lot ${lotNumber} Status Changed`,
          message: `${agentName} changed ${projectName} Lot ${lotNumber} to ${status}`,
          read: false,
        }));

        await supabase.from("notifications").insert(notifications);
      }
    } catch {
      // Don't fail the status update if notification fails
      console.error("Failed to send admin notifications for lot status change");
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
