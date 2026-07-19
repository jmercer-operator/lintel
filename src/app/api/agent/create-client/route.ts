import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { first_name, last_name, email, phone, agentId } = await req.json();

  // Derive the acting agent from the session; the body agentId is only
  // honoured for staff / allowed local preview.
  const ctx = await getAgentApiContext(agentId);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }
  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: "First name and last name are required" },
      { status: 400 }
    );
  }

  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      referring_agent_id: ctx.agentId,
      source: "agent",
      classification: "prospect",
      pipeline_stage: "new_lead",
      org_id: ctx.orgId,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
