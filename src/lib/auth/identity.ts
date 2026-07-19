// Server-only helpers: relies on next/headers via the Supabase server client.
import { createClient } from "@/lib/supabase/server";
import { isPreviewAllowed } from "./preview";
import {
  PREVIEW_AGENT_ID,
  PREVIEW_CONTACT_ID,
  PREVIEW_ORG_ID,
  type UserRole,
} from "./roles";

export interface SessionIdentity {
  authUserId: string;
  email: string;
  role: UserRole;
  /** user_profiles.id when role=staff, agents.id when role=agent, contacts.id when role=client */
  profileId: string;
  orgId: string | null;
}

/**
 * Resolve the current authenticated user to a staff/agent/client identity.
 * FAILS CLOSED: returns null when there is no session OR when the
 * authenticated user cannot be mapped to a known staff/agent/client row.
 */
export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Staff first
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role, org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.role === "staff") {
    return {
      authUserId: user.id,
      email: user.email || "",
      role: "staff",
      profileId: profile.id,
      orgId: profile.org_id ?? null,
    };
  }

  // Agent
  const { data: agent } = await supabase
    .from("agents")
    .select("id, org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (agent) {
    return {
      authUserId: user.id,
      email: user.email || "",
      role: "agent",
      profileId: agent.id,
      orgId: agent.org_id ?? null,
    };
  }

  // Client
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (contact) {
    return {
      authUserId: user.id,
      email: user.email || "",
      role: "client",
      profileId: contact.id,
      orgId: contact.org_id ?? null,
    };
  }

  // Authenticated but unmapped — do NOT default to staff.
  return null;
}

/**
 * The agent identity to use for agent-scoped pages/routes.
 * - Real session agent when available.
 * - Falls back to the demo agent ONLY in allowed local preview.
 * - Otherwise null (caller must deny).
 */
export async function getEffectiveAgentId(): Promise<string | null> {
  const identity = await getSessionIdentity();
  if (identity?.role === "agent") return identity.profileId;
  // Staff may impersonate the demo agent only in allowed preview.
  if (isPreviewAllowed()) return PREVIEW_AGENT_ID;
  return null;
}

/**
 * The contact identity to use for client-portal pages/routes.
 * - Real session contact when available.
 * - Falls back to the demo contact ONLY in allowed local preview.
 * - Otherwise null (caller must deny).
 */
export async function getEffectiveContactId(): Promise<string | null> {
  const identity = await getSessionIdentity();
  if (identity?.role === "client") return identity.profileId;
  if (isPreviewAllowed()) return PREVIEW_CONTACT_ID;
  return null;
}

/**
 * Effective organisation for scoped reads. Real sessions use their mapped
 * org; allowed local preview falls back to the seeded preview org.
 */
export async function getEffectiveOrgId(): Promise<string | null> {
  const identity = await getSessionIdentity();
  if (identity?.orgId) return identity.orgId;
  if (isPreviewAllowed()) return PREVIEW_ORG_ID;
  return null;
}

/**
 * Server-derived uploader identity for document provenance.
 * Returns user_profiles.id for staff sessions and agents.id for agent
 * sessions — NEVER a client-supplied value. Sessionless preview and client
 * sessions yield null (recorded honestly as unattributed, not fabricated).
 */
export async function getUploaderProfileId(): Promise<string | null> {
  const identity = await getSessionIdentity();
  if (identity?.role === "staff" || identity?.role === "agent") {
    return identity.profileId;
  }
  return null;
}

export interface AgentApiContext {
  /** The agent to act as. Null only when staff acted without naming an agent. */
  agentId: string | null;
  /** True when the caller is verified staff (or allowed local preview). */
  isPrivileged: boolean;
  orgId: string;
}

/**
 * Resolve the acting agent for /api/agent/* routes.
 * - Session agent: always acts as themselves — client-supplied IDs ignored.
 * - Session staff: may act on the requested agent (privileged).
 * - No mapped session: only allowed in local preview (falls back to demo agent).
 * Returns null when the caller must be denied.
 */
export async function getAgentApiContext(
  requestedAgentId?: string | null
): Promise<AgentApiContext | null> {
  const identity = await getSessionIdentity();

  if (identity?.role === "agent") {
    return {
      agentId: identity.profileId,
      isPrivileged: false,
      orgId: identity.orgId || PREVIEW_ORG_ID,
    };
  }

  if (identity?.role === "staff") {
    return {
      agentId: requestedAgentId || null,
      isPrivileged: true,
      orgId: identity.orgId || PREVIEW_ORG_ID,
    };
  }

  if (isPreviewAllowed()) {
    return {
      agentId: requestedAgentId || PREVIEW_AGENT_ID,
      isPrivileged: true,
      orgId: PREVIEW_ORG_ID,
    };
  }

  return null;
}

/**
 * Require a staff session. In allowed local preview, returns a synthetic
 * staff identity so the demo keeps working. Otherwise null when the caller
 * must deny.
 */
export async function requireStaff(): Promise<SessionIdentity | null> {
  const identity = await getSessionIdentity();
  if (identity?.role === "staff") return identity;
  if (isPreviewAllowed()) {
    return {
      authUserId: "preview",
      email: "preview@localhost",
      role: "staff",
      profileId: "preview",
      orgId: PREVIEW_ORG_ID,
    };
  }
  return null;
}
