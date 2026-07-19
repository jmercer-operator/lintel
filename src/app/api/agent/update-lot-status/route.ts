import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";

const AGENT_ALLOWED_STATUSES = ["Available", "EOI", "Under Contract", "Exchanged"];
const ALL_STATUSES = [...AGENT_ALLOWED_STATUSES, "Settled"];

export async function POST(request: Request) {
  try {
    const { id, status, agentId: requestedAgentId } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    if (!ALL_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Derive the acting agent from the session; body agentId is only
    // honoured for staff / allowed local preview.
    const ctx = await getAgentApiContext(requestedAgentId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ctx.isPrivileged && !AGENT_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Agents cannot set status to Settled" }, { status: 403 });
    }
    const agentId = ctx.agentId;

    // Session-scoped client — RLS applies; the caller's session (or allowed
    // local preview policies) must permit these operations.
    const supabase = await createDataClient();

    // Agents may only change status on lots assigned to them.
    if (!ctx.isPrivileged) {
      const { data: lot } = await supabase
        .from("stock")
        .select("agent_id")
        .eq("id", id)
        .maybeSingle();

      if (!lot || lot.agent_id !== ctx.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateResult = ctx.isPrivileged
      ? await supabase
          .from("stock")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", id)
      : await supabase.rpc("lintel_agent_update_lot_status", {
          target_stock_id: id,
          target_status: status,
        });

    const error = updateResult.error;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If staff changed status to Available, unlink all customers from this lot.
    // Agent changes do this inside lintel_agent_update_lot_status so agents do
    // not need broad table-level stock/contact_stock update privileges.
    if (ctx.isPrivileged && status === "Available") {
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
          org_id: ctx.orgId,
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
