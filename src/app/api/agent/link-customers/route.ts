import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const { stock_id, project_id, contact_ids } = await request.json();

    if (!stock_id || !project_id || !contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return NextResponse.json(
        { error: "stock_id, project_id, and contact_ids array are required" },
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
        .eq("id", stock_id)
        .maybeSingle();

      if (!stock || stock.agent_id !== ctx.agentId || stock.project_id !== project_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: ownedContacts } = await supabase
        .from("contacts")
        .select("id")
        .in("id", contact_ids)
        .eq("referring_agent_id", ctx.agentId);

      const ownedIds = new Set((ownedContacts || []).map((c) => c.id));
      if (contact_ids.some((id: string) => !ownedIds.has(id))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check which contacts are already linked to this stock
    const { data: existingLinks } = await supabase
      .from("contact_stock")
      .select("contact_id")
      .eq("stock_id", stock_id);

    const alreadyLinked = new Set((existingLinks || []).map((l) => l.contact_id));
    const hasExistingBuyer = alreadyLinked.size > 0;

    // Filter out already-linked contacts
    const newContactIds = contact_ids.filter((id: string) => !alreadyLinked.has(id));

    if (newContactIds.length === 0) {
      return NextResponse.json(
        { error: "All selected contacts are already linked to this lot" },
        { status: 400 }
      );
    }

    // Insert contact_stock rows: first = 'buyer' (if no existing buyer), rest = 'co_buyer'
    const rows = newContactIds.map((contactId: string, index: number) => ({
      contact_id: contactId,
      stock_id,
      project_id,
      role: !hasExistingBuyer && index === 0 ? "buyer" : "co_buyer",
    }));

    const { error: linkError } = await supabase.from("contact_stock").insert(rows);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    // Auto-change stock status to EOI. Agent sessions have no direct stock
    // UPDATE policy (phase 6) — they must go through the hardened RPC.
    if (ctx.isPrivileged) {
      await supabase
        .from("stock")
        .update({ status: "EOI", updated_at: new Date().toISOString() })
        .eq("id", stock_id);
    } else {
      const { error: rpcError } = await supabase.rpc("lintel_agent_update_lot_status", {
        target_stock_id: stock_id,
        target_status: "EOI",
      });
      if (rpcError) {
        return NextResponse.json(
          { error: `Customers linked but status change failed: ${rpcError.message}` },
          { status: 500 }
        );
      }
    }

    // Auto-add project slug tag to each contact
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single();

    if (project) {
      const slug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      for (const contactId of newContactIds) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("tags")
          .eq("id", contactId)
          .single();

        const currentTags: string[] = contact?.tags || [];
        if (!currentTags.includes(slug)) {
          await supabase
            .from("contacts")
            .update({ tags: [...currentTags, slug] })
            .eq("id", contactId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
