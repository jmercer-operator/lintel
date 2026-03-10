import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { projectIds } = await req.json();
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: "projectIds array required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Update sort_order for each project based on array position
    for (let i = 0; i < projectIds.length; i++) {
      const { error } = await supabase
        .from("projects")
        .update({ sort_order: i })
        .eq("id", projectIds[i]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder projects" }, { status: 500 });
  }
}
