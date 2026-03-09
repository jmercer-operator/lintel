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
  logo_url: string | null;
  hero_render_url: string | null;
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
  commission_rate: number | null;
  commission_type: CommissionType | null;
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

// Classification
export type ContactClassification = "prospect" | "customer";

export const CLASSIFICATION_COLORS: Record<ContactClassification, { bg: string; text: string; hex: string }> = {
  prospect: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]", hex: "#D4A855" },
  customer: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]", hex: "#1A9E6F" },
};

export type AgentStatus = "active" | "inactive";
export type CommissionType = "percentage" | "flat";

export interface Agent {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  company: string | null;
  agency: string | null;
  license_number: string | null;
  license_expiry: string | null;
  commission_type: CommissionType | null;
  commission_rate: number | null;
  status: AgentStatus;
  notes: string | null;
  avatar_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWithStats extends Agent {
  assigned_projects: string[];
  total_lots: number;
  lots_by_status: Record<string, number>;
  total_value: number;
}

export type BuyerType = "owner_occupier" | "investor";

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  owner_occupier: "Owner Occupier",
  investor: "Investor",
};

export const BUYER_TYPE_COLORS: Record<BuyerType, { bg: string; text: string }> = {
  owner_occupier: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]" },
  investor: { bg: "bg-[#7B3FA0]/10", text: "text-[#7B3FA0]" },
};

export interface Contact {
  id: string;
  org_id: string;
  classification: ContactClassification;
  buyer_type: BuyerType | null;
  firb_required: boolean;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  id_type: string | null;
  id_number: string | null;
  id_expiry: string | null;
  id_country: string | null;
  id_document_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  postal_address_line_1: string | null;
  postal_address_line_2: string | null;
  postal_suburb: string | null;
  postal_state: string | null;
  postal_postcode: string | null;
  postal_country: string | null;
  employer: string | null;
  occupation: string | null;
  company: string | null;
  solicitor_name: string | null;
  solicitor_firm: string | null;
  solicitor_email: string | null;
  solicitor_phone: string | null;
  source: string | null;
  source_detail: string | null;
  referring_agent_id: string | null;
  preferred_contact_method: string | null;
  marketing_consent: boolean;
  marketing_consent_date: string | null;
  tags: string[] | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithLinkedStock extends Contact {
  linked_stock: Array<{
    stock_id: string;
    lot_number: string;
    project_name: string;
    project_id: string;
    status: StockStatus;
    price: number | null;
    role: string;
  }>;
  computed_classification: ContactClassification;
}

export interface ContactStock {
  id: string;
  contact_id: string;
  stock_id: string;
  project_id: string;
  role: string;
  linked_at: string;
  notes: string | null;
}

export interface AgentProject {
  id: string;
  agent_id: string;
  project_id: string;
  assigned_at: string;
}

/* ─── Document & Milestone Types ─── */

export type DocumentVisibility = "staff" | "agent" | "client";

export const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  staff: "Staff Only",
  agent: "Agents",
  client: "Everyone",
};

export const VISIBILITY_COLORS: Record<DocumentVisibility, { bg: string; text: string }> = {
  staff: { bg: "bg-[#E05252]/10", text: "text-[#E05252]" },
  agent: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]" },
  client: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]" },
};
