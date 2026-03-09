import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Unassign stock from this agent
  await supabase
    .from("stock")
    .update({ agent_id: null, agent_name: null })
    .eq("agent_id", id);

  // Remove agent_projects
  await supabase.from("agent_projects").delete().eq("agent_id", id);

  // Delete agent
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
