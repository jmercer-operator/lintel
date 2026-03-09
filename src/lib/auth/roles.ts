export type UserRole = "staff" | "agent" | "client";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  org_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

const ROLE_KEY = "lintel-role-preview";

/**
 * Check if preview mode is enabled (client-side).
 */
export function isPreviewMode(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";
}

/**
 * Get current user role from localStorage (preview mode).
 * Falls back to 'staff' on server or when not set.
 */
export function getCurrentUserRole(): UserRole {
  if (typeof window === "undefined") return "staff";
  const stored = localStorage.getItem(ROLE_KEY);
  if (stored === "staff" || stored === "agent" || stored === "client") return stored;
  return "staff";
}

/**
 * Set the current role preview in localStorage.
 */
export function setCurrentUserRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, role);
}

/** Default agent for preview mode */
export const PREVIEW_AGENT_ID = "c0000000-0000-0000-0000-000000000001";
export const PREVIEW_ORG_ID = "a0000000-0000-0000-0000-000000000001";

/* ─── Permission helpers ─── */

export function canCreateProject(role: UserRole): boolean {
  return role === "staff";
}

export function canUploadDocument(role: UserRole): boolean {
  return role === "staff" || role === "agent";
}

export function canDeleteDocument(role: UserRole): boolean {
  return role === "staff";
}

export function canAddAgent(role: UserRole): boolean {
  return role === "staff";
}

export function canChangeStatus(role: UserRole): boolean {
  return role === "staff" || role === "agent";
}

export function canEditMilestone(role: UserRole): boolean {
  return role === "staff";
}

export function canViewStaffDocs(role: UserRole): boolean {
  return role === "staff";
}

export function canViewAgentDocs(role: UserRole): boolean {
  return role === "staff" || role === "agent";
}

export function canViewClientDocs(role: UserRole): boolean {
  return true; // all roles
}

export function canViewDocument(role: UserRole, visibility: string): boolean {
  switch (visibility) {
    case "staff":
      return canViewStaffDocs(role);
    case "agent":
      return canViewAgentDocs(role);
    case "client":
      return canViewClientDocs(role);
    default:
      return false;
  }
}

export function canUploadClientDocument(role: UserRole): boolean {
  return role === "staff" || role === "agent";
}

export function canDeleteClientDocument(role: UserRole): boolean {
  return role === "staff";
}

export function canAddContact(role: UserRole): boolean {
  return role === "staff" || role === "agent";
}

export function canViewReports(role: UserRole): boolean {
  return role === "staff";
}
