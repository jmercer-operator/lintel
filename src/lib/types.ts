export type StockStatus = "Available" | "EOI" | "Under Contract" | "Exchanged" | "Settled";
export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";

export const ALL_STATUSES: StockStatus[] = ["Available", "EOI", "Under Contract", "Exchanged", "Settled"];

export const STATUS_COLORS: Record<StockStatus, string> = {
  Available: "#1A9E6F",
  EOI: "#D4A855",
  "Under Contract": "#7B3FA0",
  Exchanged: "#E07858",
  Settled: "#2D8C5A",
};

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  status: ProjectStatus;
  total_lots: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  project_id: string;
  org_id: string;
  lot_number: string;
  bedrooms: number;
  bathrooms: number;
  car_spaces: number;
  internal_area: number | null;
  external_area: number | null;
  price: number | null;
  status: StockStatus;
  level: number | null;
  aspect: string | null;
  agent_id: string | null;
  agent_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockStats {
  total: number;
  available: number;
  eoi: number;
  underContract: number;
  exchanged: number;
  settled: number;
}

export interface ProjectWithStats extends Project {
  stats: StockStats;
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  return `$${Math.round(price).toLocaleString("en-AU")}`;
}

export function formatArea(area: number | null): string {
  if (area === null || area === undefined) return "—";
  return Math.round(area).toString();
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// Default org for creating new projects
export const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";
