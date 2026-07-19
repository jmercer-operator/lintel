import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { stockId, contactId, projectId } = await req.json();

  if (!stockId || !contactId || !projectId) {
    return NextResponse.json(
      { error: "stockId, contactId and projectId are required" },
      { status: 400 }
    );
  }

  const ctx = await getAgentApiContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createDataClient();

  // Non-privileged agents may only link their own contacts to their own lots.
  if (!ctx.isPrivileged) {
    const { data: stock } = await supabase
      .from("stock")
      .select("id, agent_id, project_id")
      .eq("id", stockId)
      .maybeSingle();

    if (!stock || stock.agent_id !== ctx.agentId || stock.project_id !== projectId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("id, referring_agent_id")
      .eq("id", contactId)
      .maybeSingle();

    if (!contact || contact.referring_agent_id !== ctx.agentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("contact_stock").upsert({
    contact_id: contactId,
    stock_id: stockId,
    project_id: projectId,
    role: "buyer",
  }, { onConflict: "contact_id,stock_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
