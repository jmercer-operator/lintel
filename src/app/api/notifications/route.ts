import { createClient } from "@/lib/supabase/server";
import { PREVIEW_AGENT_ID, PREVIEW_ORG_ID } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "staff";

  // In preview mode, show notifications for the preview agent or org-wide for staff
  const query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (role === "agent") {
    query.eq("recipient_id", PREVIEW_AGENT_ID);
  } else {
    query.eq("org_id", PREVIEW_ORG_ID);
    query.or(`recipient_id.is.null,recipient_type.eq.staff`);
  }

  const { data, error } = await query;

  if (error) {
    // Table may not exist yet — return empty
    return NextResponse.json([]);
  }

  return NextResponse.json(data || []);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "staff";

  const query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (role === "agent") {
    query.eq("recipient_id", PREVIEW_AGENT_ID);
  } else {
    query.eq("org_id", PREVIEW_ORG_ID);
  }

  await query;

  return NextResponse.json({ ok: true });
}
