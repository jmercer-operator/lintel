import { createDataClient } from "@/lib/supabase/data-client";
import { getSessionIdentity } from "@/lib/auth/identity";
import { isPreviewAllowed } from "@/lib/auth/preview";
import { PREVIEW_AGENT_ID, PREVIEW_ORG_ID } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

/**
 * Resolve the notification scope from the SESSION, never from the query
 * string. The `?role=` param is only honoured in allowed local preview.
 */
async function resolveScope(
  request: Request
): Promise<
  | { kind: "agent"; recipientId: string }
  | { kind: "staff"; orgId: string }
  | null
> {
  const identity = await getSessionIdentity();

  if (identity?.role === "agent") {
    return { kind: "agent", recipientId: identity.profileId };
  }
  if (identity?.role === "staff") {
    return { kind: "staff", orgId: identity.orgId || PREVIEW_ORG_ID };
  }
  if (identity?.role === "client") {
    // Clients have no notification feed yet.
    return null;
  }

  // No mapped session: only allowed in local preview.
  if (isPreviewAllowed()) {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "staff";
    if (role === "agent") {
      return { kind: "agent", recipientId: PREVIEW_AGENT_ID };
    }
    return { kind: "staff", orgId: PREVIEW_ORG_ID };
  }

  return null;
}

export async function GET(request: Request) {
  const scope = await resolveScope(request);
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createDataClient();
  const query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (scope.kind === "agent") {
    query.eq("recipient_id", scope.recipientId);
  } else {
    query.eq("org_id", scope.orgId);
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
  const scope = await resolveScope(request);
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createDataClient();
  const query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (scope.kind === "agent") {
    query.eq("recipient_id", scope.recipientId);
  } else {
    query.eq("org_id", scope.orgId);
  }

  await query;

  return NextResponse.json({ ok: true });
}
