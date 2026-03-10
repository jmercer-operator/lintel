export type StockStatus = "Available" | "EOI" | "Under Contract" | "Exchanged" | "Settled";
export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";
export type ProjectConstructionStatus = "pre_construction" | "under_construction" | "complete";

export const PROJECT_CONSTRUCTION_STATUS_LABELS: Record<ProjectConstructionStatus, string> = {
  pre_construction: "Pre-Construction",
  under_construction: "Under Construction",
  complete: "Complete",
};

export const PROJECT_CONSTRUCTION_STATUS_COLORS: Record<ProjectConstructionStatus, { bg: string; text: string; hex: string }> = {
  pre_construction: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]", hex: "#D4A855" },
  under_construction: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]", hex: "#1A9E6F" },
  complete: { bg: "bg-[#6B7A70]/10", text: "text-[#6B7A70]", hex: "#6B7A70" },
};

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
  project_status: ProjectConstructionStatus | null;
  development_type: string | null;
  num_dwellings: number | null;
  num_commercial: number | null;
  num_hotel_keys: number | null;
  progress_pictures: Array<string | { url: string; uploaded_at?: string }> | null;
  progress_videos: Array<string | { url: string; uploaded_at?: string }> | null;
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
  deposit_amount: number | null;
  deposit_paid: boolean;
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
  commission_type: CommissionType | null;
  commission_rate: number | null;
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

/* ─── Pipeline / Deal Engine Types ─── */

export type PipelineStage = 'new_lead' | 'contacted' | 'inspection_booked' | 'offer_submitted' | 'reserved' | 'contract_issued' | 'exchanged' | 'settled';
export type ActivityType = 'call' | 'email' | 'meeting' | 'inspection' | 'note' | 'document' | 'status_change' | 'system';
export type FollowUpAction = 'call' | 'email' | 'meeting' | 'send_document' | 'follow_up' | 'other';
export type InterestLevel = 'enquiry' | 'shortlisted' | 'strong' | 'offer';
export type FollowUpPriority = 'low' | 'normal' | 'high';

export const PIPELINE_STAGES: { key: PipelineStage; label: string; shortLabel: string }[] = [
  { key: 'new_lead', label: 'New Lead', shortLabel: 'New' },
  { key: 'contacted', label: 'Contacted', shortLabel: 'Contacted' },
  { key: 'inspection_booked', label: 'Inspection Booked', shortLabel: 'Inspection' },
  { key: 'offer_submitted', label: 'Offer Submitted', shortLabel: 'Offer' },
  { key: 'reserved', label: 'Reserved', shortLabel: 'Reserved' },
  { key: 'contract_issued', label: 'Contract Issued', shortLabel: 'Contract' },
  { key: 'exchanged', label: 'Exchanged', shortLabel: 'Exchanged' },
  { key: 'settled', label: 'Settled', shortLabel: 'Settled' },
];

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; hex: string }> = {
  new_lead: { bg: 'bg-[#D4A855]/10', text: 'text-[#D4A855]', hex: '#D4A855' },
  contacted: { bg: 'bg-[#1A9E6F]/10', text: 'text-[#1A9E6F]', hex: '#1A9E6F' },
  inspection_booked: { bg: 'bg-[#1A9E6F]/10', text: 'text-[#1A9E6F]', hex: '#1A9E6F' },
  offer_submitted: { bg: 'bg-[#7B3FA0]/10', text: 'text-[#7B3FA0]', hex: '#7B3FA0' },
  reserved: { bg: 'bg-[#D4A855]/10', text: 'text-[#D4A855]', hex: '#D4A855' },
  contract_issued: { bg: 'bg-[#7B3FA0]/10', text: 'text-[#7B3FA0]', hex: '#7B3FA0' },
  exchanged: { bg: 'bg-[#E07858]/10', text: 'text-[#E07858]', hex: '#E07858' },
  settled: { bg: 'bg-[#2D8C5A]/10', text: 'text-[#2D8C5A]', hex: '#2D8C5A' },
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  call: '📞',
  email: '✉️',
  meeting: '🤝',
  inspection: '🏠',
  note: '📝',
  document: '📄',
  status_change: '🔄',
  system: '⚙️',
};

export const FOLLOW_UP_ACTION_LABELS: Record<FollowUpAction, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  send_document: 'Send Document',
  follow_up: 'Follow Up',
  other: 'Other',
};

export const INTEREST_LEVEL_COLORS: Record<InterestLevel, { bg: string; text: string }> = {
  enquiry: { bg: 'bg-[#6B7A70]/10', text: 'text-[#6B7A70]' },
  shortlisted: { bg: 'bg-[#D4A855]/10', text: 'text-[#D4A855]' },
  strong: { bg: 'bg-[#1A9E6F]/10', text: 'text-[#1A9E6F]' },
  offer: { bg: 'bg-[#7B3FA0]/10', text: 'text-[#7B3FA0]' },
};

export const PRIORITY_COLORS: Record<FollowUpPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-[#6B7A70]/10', text: 'text-[#6B7A70]' },
  normal: { bg: 'bg-[#1A9E6F]/10', text: 'text-[#1A9E6F]' },
  high: { bg: 'bg-[#E05252]/10', text: 'text-[#E05252]' },
};

export interface Activity {
  id: string;
  org_id: string;
  contact_id: string;
  stock_id: string | null;
  agent_id: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  // Joined fields
  agent_name?: string;
}

export interface FollowUp {
  id: string;
  org_id: string;
  contact_id: string;
  stock_id: string | null;
  agent_id: string | null;
  action_type: FollowUpAction;
  description: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  priority: FollowUpPriority;
  created_at: string;
  // Joined fields
  contact_name?: string;
  agent_name?: string;
  project_name?: string;
  lot_number?: string;
}

export interface BuyerInterest {
  id: string;
  contact_id: string;
  stock_id: string;
  interest_level: InterestLevel;
  notes: string | null;
  created_at: string;
  // Joined fields
  lot_number?: string;
  project_name?: string;
  project_id?: string;
  price?: number | null;
}

/* ─── Phase 2: Developer Intelligence Types ─── */

export type SettlementStatus = 'not_applicable' | 'pending' | 'finance_pending' | 'finance_approved' | 'settling_soon' | 'settled' | 'fallen_over';
export type SalesChannel = 'agent' | 'direct' | 'referral' | 'website' | 'event';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  not_applicable: 'N/A',
  pending: 'Pending',
  finance_pending: 'Finance Pending',
  finance_approved: 'Finance Approved',
  settling_soon: 'Settling Soon',
  settled: 'Settled',
  fallen_over: 'Fallen Over',
};

export const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, { bg: string; text: string }> = {
  not_applicable: { bg: 'bg-[#6B7A70]/10', text: 'text-[#6B7A70]' },
  pending: { bg: 'bg-[#D4A855]/10', text: 'text-[#D4A855]' },
  finance_pending: { bg: 'bg-[#E07858]/10', text: 'text-[#E07858]' },
  finance_approved: { bg: 'bg-[#1A9E6F]/10', text: 'text-[#1A9E6F]' },
  settling_soon: { bg: 'bg-[#D4A855]/10', text: 'text-[#D4A855]' },
  settled: { bg: 'bg-[#2D8C5A]/10', text: 'text-[#2D8C5A]' },
  fallen_over: { bg: 'bg-[#E05252]/10', text: 'text-[#E05252]' },
};

export interface PortfolioStats {
  totalValue: number;
  soldValue: number;
  availableValue: number;
  sellThroughRate: number;
  averagePrice: number;
  salesVelocity: number;
  totalLots: number;
  soldLots: number;
}

export interface ProjectSalesBreakdown {
  project_id: string;
  project_name: string;
  total: number;
  available: number;
  eoi: number;
  under_contract: number;
  exchanged: number;
  settled: number;
  revenue: number;
  sold_value: number;
  sell_through: number;
}

export interface AgentPerformanceRow {
  agent_id: string;
  agent_name: string;
  agency: string | null;
  total_sales: number;
  revenue: number;
  avg_sale_price: number;
  commission_due: number;
}

export interface CommissionSummary {
  totalCommissionsDue: number;
  commissionsOnSettled: number;
  commissionsPending: number;
}

export interface SettlementRow {
  stock_id: string;
  lot_number: string;
  project_name: string;
  customer_name: string | null;
  exchange_date: string | null;
  settlement_date: string | null;
  settlement_status: SettlementStatus;
  days_until: number | null;
  price: number | null;
}

export interface HeatmapProject {
  project_id: string;
  project_name: string;
  lots: Array<{
    id: string;
    lot_number: string;
    status: StockStatus;
    level: number | null;
    bedrooms: number;
    price: number | null;
  }>;
}

export interface PipelineContact {
  id: string;
  first_name: string;
  last_name: string;
  pipeline_stage: PipelineStage;
  next_action: string | null;
  next_action_date: string | null;
  referring_agent_id: string | null;
  agent_name?: string;
  project_name?: string;
  lot_number?: string;
  created_at: string;
  updated_at: string;
}

/* ─── Phase 3: Communication & Document Sharing Types ─── */

export type DocumentShareType = 'project_document' | 'client_document';
export type DeliveryMethod = 'email' | 'portal' | 'link';
export type EmailTemplateCategory = 'welcome' | 'follow_up' | 'document' | 'inspection' | 'contract' | 'settlement' | 'marketing' | 'custom';

export const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  welcome: 'Welcome',
  follow_up: 'Follow Up',
  document: 'Document',
  inspection: 'Inspection',
  contract: 'Contract',
  settlement: 'Settlement',
  marketing: 'Marketing',
  custom: 'Custom',
};

export interface DocumentShare {
  id: string;
  document_type: DocumentShareType;
  document_id: string;
  shared_with_id: string;
  shared_with_type: 'contact' | 'agent';
  shared_by: string | null;
  delivery_method: DeliveryMethod;
  viewed_at: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
  created_at: string;
  updated_at: string;
}
