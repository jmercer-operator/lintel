import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/supabase/data-client";
import { getEffectiveContactId } from "@/lib/auth/identity";
import type { Contact } from "@/lib/types";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  // Session-derived contact; demo contact only in allowed local preview.
  const contactId = await getEffectiveContactId();
  if (!contactId) redirect("/login");

  const supabase = await createDataClient();

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
