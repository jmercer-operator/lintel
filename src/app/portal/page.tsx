import { createClient } from "@/lib/supabase/server";
import type { Contact, StockItem, Project, Agent } from "@/lib/types";
import { getProjectMilestones } from "@/lib/data/milestones";
import PortalClient from "./PortalClient";

// Demo: David Chen
const DEMO_CONTACT_ID = "d0000000-0000-0000-0000-000000000001";

export default async function PortalPage() {
  const supabase = await createClient();

  // 1. Get contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", DEMO_CONTACT_ID)
    .single();

  if (!contact) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-5">
        <div className="text-center">
          <span className="text-5xl">🏠</span>
          <h1 className="text-xl font-bold text-heading mt-4">
            Welcome to LINTEL
          </h1>
          <p className="text-secondary text-sm mt-2">
            No client profile found. Please contact your agent.
          </p>
        </div>
      </div>
    );
  }

  // 2. Get linked stock via contact_stock
  const { data: contactStock } = await supabase
    .from("contact_stock")
    .select("stock_id, project_id")
    .eq("contact_id", DEMO_CONTACT_ID);

  let stock: StockItem | null = null;
  let project: Project | null = null;
  let agent: Agent | null = null;

  if (contactStock && contactStock.length > 0) {
    const firstLink = contactStock[0];

    // 3. Get the stock item
    const { data: stockData } = await supabase
      .from("stock")
      .select("*")
      .eq("id", firstLink.stock_id)
      .single();

    if (stockData) {
      stock = stockData as StockItem;

      // 4. Get agent assigned to this lot
      if (stock.agent_id) {
        const { data: agentData } = await supabase
          .from("agents")
          .select("*")
          .eq("id", stock.agent_id)
          .single();
        if (agentData) agent = agentData as Agent;
      }
    }

    // 5. Get project (including progress_pictures, progress_videos)
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("id", firstLink.project_id)
      .single();

    if (projectData) project = projectData as Project;
  }

  // 6. Get milestones for the project
  const projectId = project?.id || (contactStock?.[0]?.project_id ?? "");
  const milestones = projectId
    ? await getProjectMilestones(projectId)
    : [];

  // 7. Get client documents (only Exchanged Contract and Trust Receipt filtered client-side)
  const { data: clientDocuments } = await supabase
    .from("client_documents")
    .select("*")
    .eq("contact_id", DEMO_CONTACT_ID)
    .order("created_at", { ascending: false });

  return (
    <PortalClient
      contact={contact as Contact}
      stock={stock}
      project={project}
      agent={agent}
      milestones={milestones}
      clientDocuments={clientDocuments || []}
    />
  );
}
