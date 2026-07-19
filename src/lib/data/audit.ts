import { createDataClient } from "@/lib/supabase/data-client";
import { requireStaff } from "@/lib/auth/identity";

/**
 * Read side of the immutable audit ledger (public.audit_log, written only by
 * database triggers — see supabase/migrations/*_lintel_audit_ledger.sql).
 * Staff-only. Fails closed: no staff identity → empty; ledger table not yet
 * migrated → { available: false } so the UI shows an honest empty state.
 *
 * This is deliberately separate from src/lib/data/activities.ts: activities
 * is a curated customer-facing feed, the ledger is the tamper-evident record.
 */

interface AuditRow {
  id: string;
  org_id: string;
  entity_table: string;
  entity_id: string | null;
  action: string;
  changed_fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  actor_auth_user_id: string | null;
  actor_role: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface AuditChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityTable: string;
  entityId: string | null;
  entityLabel: string;
  projectName: string | null;
  actorLabel: string;
  changes: AuditChange[];
  createdAt: string;
}

export interface AuditFeed {
  /** False when the ledger migration has not been applied yet. */
  available: boolean;
  events: AuditEvent[];
}

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  price: "Price",
  agent_id: "Agent",
  agent_name: "Agent name",
  commission_type: "Commission type",
  commission_rate: "Commission rate",
  project_id: "Project",
};

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("audit_log") &&
    (msg.includes("does not exist") || msg.includes("schema cache"))
  );
}

function asDisplay(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  return String(value);
}

export async function getAuditEvents(limit = 300): Promise<AuditFeed> {
  const staff = await requireStaff();
  if (!staff || !staff.orgId) return { available: false, events: [] };

  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", staff.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return { available: false, events: [] };
    throw error;
  }

  const rows = (data || []) as AuditRow[];
  if (rows.length === 0) return { available: true, events: [] };

  // ── Collect ids for label resolution ──
  const stockIds = new Set<string>();
  const projectIds = new Set<string>();
  const agentIds = new Set<string>();
  const actorAuthIds = new Set<string>();

  for (const row of rows) {
    if (row.entity_table === "stock" && row.entity_id) stockIds.add(row.entity_id);
    const ctxProject = row.context?.project_id;
    if (typeof ctxProject === "string") projectIds.add(ctxProject);
    const ctxAgent = row.context?.agent_id;
    if (typeof ctxAgent === "string") agentIds.add(ctxAgent);
    for (const values of [row.old_values, row.new_values]) {
      const agentVal = values?.agent_id;
      if (typeof agentVal === "string") agentIds.add(agentVal);
      const projectVal = values?.project_id;
      if (typeof projectVal === "string") projectIds.add(projectVal);
    }
    if (row.actor_auth_user_id) actorAuthIds.add(row.actor_auth_user_id);
  }

  const [stockRes, agentsRes, profilesRes, actorAgentsRes] = await Promise.all([
    stockIds.size
      ? supabase.from("stock").select("id, lot_number, project_id").in("id", [...stockIds])
      : Promise.resolve({ data: [] }),
    agentIds.size
      ? supabase.from("agents").select("id, first_name, last_name").in("id", [...agentIds])
      : Promise.resolve({ data: [] }),
    actorAuthIds.size
      ? supabase
          .from("user_profiles")
          .select("auth_user_id, first_name, last_name, email")
          .in("auth_user_id", [...actorAuthIds])
      : Promise.resolve({ data: [] }),
    actorAuthIds.size
      ? supabase
          .from("agents")
          .select("auth_user_id, first_name, last_name")
          .in("auth_user_id", [...actorAuthIds])
      : Promise.resolve({ data: [] }),
  ]);

  const stockMap = new Map<string, { lot_number: string; project_id: string }>();
  for (const s of (stockRes.data || []) as Array<{ id: string; lot_number: string; project_id: string }>) {
    stockMap.set(s.id, { lot_number: s.lot_number, project_id: s.project_id });
    if (s.project_id) projectIds.add(s.project_id);
  }

  const { data: projectRows } = projectIds.size
    ? await supabase.from("projects").select("id, name").in("id", [...projectIds])
    : { data: [] };
  const projectMap = new Map<string, string>(
    ((projectRows || []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name])
  );

  const agentMap = new Map<string, string>(
    ((agentsRes.data || []) as Array<{ id: string; first_name: string; last_name: string }>).map(
      (a) => [a.id, `${a.first_name} ${a.last_name}`.trim()]
    )
  );

  const actorMap = new Map<string, string>();
  for (const a of (actorAgentsRes.data || []) as Array<{
    auth_user_id: string | null; first_name: string; last_name: string;
  }>) {
    if (a.auth_user_id) actorMap.set(a.auth_user_id, `${a.first_name} ${a.last_name}`.trim());
  }
  for (const p of (profilesRes.data || []) as Array<{
    auth_user_id: string | null; first_name: string | null; last_name: string | null; email: string;
  }>) {
    if (p.auth_user_id) {
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
      actorMap.set(p.auth_user_id, name || p.email);
    }
  }

  // ── Shape events ──
  const events: AuditEvent[] = rows.map((row) => {
    const ctx = row.context || {};

    let projectId: string | null = typeof ctx.project_id === "string" ? ctx.project_id : null;
    let entityLabel = row.entity_table;

    if (row.entity_table === "stock") {
      const stock = row.entity_id ? stockMap.get(row.entity_id) : undefined;
      const lot = stock?.lot_number ?? (typeof ctx.lot_number === "string" ? ctx.lot_number : null);
      projectId = stock?.project_id ?? projectId;
      entityLabel = lot ? `Lot ${lot}` : "Lot (deleted)";
    } else if (row.entity_table === "agent_projects") {
      const agentId = typeof ctx.agent_id === "string" ? ctx.agent_id : null;
      const agentName = agentId ? agentMap.get(agentId) : null;
      entityLabel = agentName ? `Agent ${agentName}` : "Agent assignment";
    }

    const projectName = projectId ? projectMap.get(projectId) || null : null;

    let actorLabel: string;
    if (row.actor_auth_user_id) {
      actorLabel =
        actorMap.get(row.actor_auth_user_id) ||
        row.actor_email ||
        "Unknown user";
    } else if (row.actor_role === "service_role") {
      actorLabel = "System (service role)";
    } else if (row.actor_role === "anon") {
      actorLabel = "Anonymous";
    } else {
      actorLabel = "Unknown";
    }

    const changes: AuditChange[] = [];
    const skipAgentName =
      row.changed_fields.includes("agent_id") &&
      row.changed_fields.includes("agent_name");

    for (const field of row.changed_fields) {
      if (field === "agent_name" && skipAgentName) continue;

      const rawFrom = row.old_values ? row.old_values[field] : undefined;
      const rawTo = row.new_values ? row.new_values[field] : undefined;

      let from = asDisplay(rawFrom ?? null);
      let to = asDisplay(rawTo ?? null);

      if (field === "agent_id") {
        from = typeof rawFrom === "string" ? agentMap.get(rawFrom) || from : from;
        to = typeof rawTo === "string" ? agentMap.get(rawTo) || to : to;
      }
      if (field === "project_id") {
        from = typeof rawFrom === "string" ? projectMap.get(rawFrom) || from : from;
        to = typeof rawTo === "string" ? projectMap.get(rawTo) || to : to;
      }

      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        from,
        to,
      });
    }

    return {
      id: row.id,
      action: row.action,
      entityTable: row.entity_table,
      entityId: row.entity_id,
      entityLabel,
      projectName,
      actorLabel,
      changes,
      createdAt: row.created_at,
    };
  });

  return { available: true, events };
}
