import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactWithLinkedStock, ContactClassification, StockStatus } from "@/lib/types";

const CUSTOMER_STATUSES: StockStatus[] = ["Under Contract", "Exchanged", "Settled"];

function computeClassification(
  stored: ContactClassification,
  linkedStatuses: StockStatus[]
): ContactClassification {
  if (linkedStatuses.some((s) => CUSTOMER_STATUSES.includes(s))) return "customer";
  return stored;
}

export async function getContacts(filter?: {
  classification?: string;
  search?: string;
  tags?: string[];
  marketingConsent?: boolean;
  projectId?: string;
  source?: string;
}): Promise<ContactWithLinkedStock[]> {
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.search) {
    const s = `%${filter.search}%`;
    query = query.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }
  if (filter?.marketingConsent !== undefined) {
    query = query.eq("marketing_consent", filter.marketingConsent);
  }
  if (filter?.source) {
    query = query.eq("source", filter.source);
  }
  if (filter?.tags && filter.tags.length > 0) {
    query = query.overlaps("tags", filter.tags);
  }

  const { data: contacts, error } = await query;
  if (error) throw error;
  if (!contacts || contacts.length === 0) return [];

  const contactIds = contacts.map((c) => c.id);

  // Get linked stock
  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("contact_id, stock_id, project_id, role")
    .in("contact_id", contactIds);

  const stockIds = [...new Set((contactStock || []).map((cs) => cs.stock_id))];
  const projectIds = [...new Set((contactStock || []).map((cs) => cs.project_id))];

  let stockMap: Record<string, { lot_number: string; status: StockStatus; price: number | null }> = {};
  let projectMap: Record<string, string> = {};

  if (stockIds.length > 0) {
    const { data: stockItems } = await supabase
      .from("stock")
      .select("id, lot_number, status, price")
      .in("id", stockIds);
    for (const s of stockItems || []) {
      stockMap[s.id] = { lot_number: s.lot_number, status: s.status as StockStatus, price: s.price };
    }
  }

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const p of projects || []) {
      projectMap[p.id] = p.name;
    }
  }

  // Filter by project if specified
  const contactsInProject = filter?.projectId
    ? new Set((contactStock || []).filter(cs => cs.project_id === filter.projectId).map(cs => cs.contact_id))
    : null;

  return (contacts as Contact[])
    .filter((c) => !contactsInProject || contactsInProject.has(c.id))
    .map((c) => {
      const links = (contactStock || []).filter((cs) => cs.contact_id === c.id);
      const linked_stock = links.map((cs) => ({
        stock_id: cs.stock_id,
        lot_number: stockMap[cs.stock_id]?.lot_number || "—",
        project_name: projectMap[cs.project_id] || "—",
        project_id: cs.project_id,
        status: stockMap[cs.stock_id]?.status || ("Available" as StockStatus),
        price: stockMap[cs.stock_id]?.price ?? null,
        role: cs.role,
      }));
      const linkedStatuses = linked_stock.map((ls) => ls.status);
      const computed = computeClassification(c.classification, linkedStatuses);

      // Filter by classification after compute
      if (filter?.classification && filter.classification !== "all") {
        if (computed !== filter.classification) return null;
      }

      return {
        ...c,
        linked_stock,
        computed_classification: computed,
      };
    })
    .filter(Boolean) as ContactWithLinkedStock[];
}

export async function getContact(id: string): Promise<ContactWithLinkedStock | null> {
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !contact) return null;

  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("stock_id, project_id, role")
    .eq("contact_id", id);

  const stockIds = (contactStock || []).map((cs) => cs.stock_id);
  const projectIds = [...new Set((contactStock || []).map((cs) => cs.project_id))];

  let stockMap: Record<string, { lot_number: string; status: StockStatus; price: number | null }> = {};
  let projectMap: Record<string, string> = {};

  if (stockIds.length > 0) {
    const { data: stockItems } = await supabase
      .from("stock")
      .select("id, lot_number, status, price")
      .in("id", stockIds);
    for (const s of stockItems || []) {
      stockMap[s.id] = { lot_number: s.lot_number, status: s.status as StockStatus, price: s.price };
    }
  }

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const p of projects || []) {
      projectMap[p.id] = p.name;
    }
  }

  const linked_stock = (contactStock || []).map((cs) => ({
    stock_id: cs.stock_id,
    lot_number: stockMap[cs.stock_id]?.lot_number || "—",
    project_name: projectMap[cs.project_id] || "—",
    project_id: cs.project_id,
    status: stockMap[cs.stock_id]?.status || ("Available" as StockStatus),
    price: stockMap[cs.stock_id]?.price ?? null,
    role: cs.role,
  }));

  const c = contact as Contact;
  const linkedStatuses = linked_stock.map((ls) => ls.status);

  return {
    ...c,
    linked_stock,
    computed_classification: computeClassification(c.classification, linkedStatuses),
  };
}

export async function getContactsForMailGroup(filter: {
  projectId?: string;
  classification?: string;
  tags?: string[];
  source?: string;
  marketingConsent?: boolean;
}): Promise<{ name: string; email: string }[]> {
  const contacts = await getContacts({ ...filter, marketingConsent: filter.marketingConsent ?? true });
  return contacts
    .filter((c) => c.email)
    .map((c) => ({
      name: `${c.first_name} ${c.last_name}`,
      email: c.email!,
    }));
}
