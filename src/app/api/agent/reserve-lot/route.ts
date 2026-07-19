import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/data-client";
import { getAgentApiContext } from "@/lib/auth/identity";
import { isDealSpineMissing } from "@/lib/data/deals";

/**
 * Atomic lot reservation for the agent portal.
 *
 * The hold itself is placed by the SECURITY DEFINER RPC
 * lintel_deal_place_hold, which enforces INSIDE THE DATABASE that:
 *  - the lot is Available and has no active deal (one hold per lot),
 *  - agent sessions act only as themselves, only on their own assigned lots,
 *    and only for contacts they refer (client-supplied ids are never trusted),
 *  - everything stays within the caller's organisation.
 *
 * When the deal-spine migration is not applied, responds 503 with
 * notEnabled=true so the client can fall back to the legacy link flow —
 * no timed hold is ever fabricated.
 */
export async function POST(request: Request) {
  try {
    const { stock_id, project_id, contact_ids } = await request.json();

    if (
      !stock_id ||
      !project_id ||
      !Array.isArray(contact_ids) ||
      contact_ids.length === 0 ||
      contact_ids.some((id: unknown) => typeof id !== "string")
    ) {
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

    // Non-privileged agents: verify ALL selected contacts are their own
    // referrals up front (the RPC validates the primary buyer; co-buyer
    // links below need the same guarantee).
    if (!ctx.isPrivileged) {
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

    const [primaryContactId, ...coBuyerIds] = contact_ids as string[];

    // acting_agent_id is only honoured by the RPC for staff/service callers;
    // real agent sessions always act as themselves regardless of this value.
    const { data: deal, error: rpcError } = await supabase.rpc(
      "lintel_deal_place_hold",
      {
        target_stock_id: stock_id,
        target_contact_id: primaryContactId,
        hold_hours: 72,
        acting_agent_id: ctx.isPrivileged ? ctx.agentId : null,
      }
    );

    if (rpcError) {
      if (isDealSpineMissing(rpcError)) {
        return NextResponse.json(
          {
            error: "Reservation holds are not enabled in this environment yet.",
            notEnabled: true,
          },
          { status: 503 }
        );
      }
      if (rpcError.code === "55006") {
        return NextResponse.json(
          { error: "This lot is no longer available — it already has an active reservation or deal." },
          { status: 409 }
        );
      }
      if (rpcError.code === "28000" || rpcError.code === "42501") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // Co-buyers: additional contact_stock links (deal + primary buyer link
    // were created atomically by the RPC).
    if (coBuyerIds.length > 0) {
      const { data: existingLinks } = await supabase
        .from("contact_stock")
        .select("contact_id")
        .eq("stock_id", stock_id);
      const alreadyLinked = new Set((existingLinks || []).map((l) => l.contact_id));

      const rows = coBuyerIds
        .filter((id) => !alreadyLinked.has(id))
        .map((contactId) => ({
          contact_id: contactId,
          stock_id,
          project_id,
          role: "co_buyer",
        }));
      if (rows.length > 0) {
        await supabase.from("contact_stock").insert(rows);
      }
    }

    // Auto-add project slug tag (parity with the legacy link flow).
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

      for (const contactId of contact_ids as string[]) {
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

    return NextResponse.json({ success: true, deal });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
