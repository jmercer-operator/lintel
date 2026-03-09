import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const projectId = request.nextUrl.searchParams.get("project_id");

  let contactIds: string[] | null = null;

  // If project_id provided, get contacts linked to that project
  if (projectId) {
    const { data: links } = await supabase
      .from("contact_stock")
      .select("contact_id")
      .eq("project_id", projectId);

    if (links) {
      contactIds = [...new Set(links.map((l) => l.contact_id))];
    }
  }

  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .order("first_name", { ascending: true });

  if (contactIds !== null) {
    if (contactIds.length === 0) {
      return NextResponse.json({ contacts: [] });
    }
    query = query.in("id", contactIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ contacts: [] }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
}
