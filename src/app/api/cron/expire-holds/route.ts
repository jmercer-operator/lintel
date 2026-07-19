import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDealSpineMissing } from "@/lib/data/deals";

export const dynamic = "force-dynamic";

/**
 * Scheduled reservation-expiry sweep (Vercel Cron, see vercel.json).
 *
 * Delegates entirely to the SECURITY DEFINER RPC lintel_deal_expire_holds():
 *  - idempotent: only reservation-stage deals whose hold_expires_at has
 *    lapsed are cancelled; a run with nothing to do changes nothing,
 *  - concurrency-safe: rows are taken FOR UPDATE SKIP LOCKED, so an overlap
 *    with an inline expiry (lintel_deal_place_hold) or a second sweep run
 *    cannot double-cancel,
 *  - org-safe: each cancellation reverts only that deal's lot and links,
 *    scoped by the deal row itself,
 *  - auditable: every cancellation is written to the append-only audit_log
 *    by the deals trigger, attributed honestly to service_role.
 *
 * Fails closed: no CRON_SECRET configured → 503; wrong/missing bearer → 401.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("lintel_deal_expire_holds");

  if (error) {
    if (isDealSpineMissing(error)) {
      return NextResponse.json(
        { notEnabled: true, expired: 0 },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.expired ?? 0 });
}
