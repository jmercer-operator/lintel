import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import ProfileClient from "./ProfileClient";

// Demo: David Chen — in production, get from authenticated user
const DEMO_CONTACT_ID = "d0000000-0000-0000-0000-000000000001";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const supabase = await createClient();

  // Try to get the authenticated user's contact record
  let contactId = DEMO_CONTACT_ID;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (contact) {
      contactId = contact.id;
    }
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-5">
        <div className="text-center">
          <span className="text-5xl">👤</span>
          <h1 className="text-xl font-bold text-heading mt-4">
            Profile Not Found
          </h1>
          <p className="text-secondary text-sm mt-2">
            No client profile found. Please contact your agent.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileClient contact={contact as Contact} />;
}
