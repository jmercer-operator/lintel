export type UserRole = "staff" | "agent" | "client";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  org_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get current user role — for now returns 'staff' (preview mode).
 * Will be replaced with actual auth lookup later.
 */
export function getCurrentUserRole(): UserRole {
  return "staff";
}

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
