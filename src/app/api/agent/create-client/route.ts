import { createClient } from "@/lib/supabase/server";
import { PREVIEW_ORG_ID } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { first_name, last_name, email, phone, agentId } = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase.from("contacts").insert({
    first_name,
    last_name,
    email: email || null,
    phone: phone || null,
    referring_agent_id: agentId,
    source: "agent",
    classification: "prospect",
    pipeline_stage: "new_lead",
    org_id: PREVIEW_ORG_ID,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
