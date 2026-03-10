import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { stockId, contactId, projectId } = await req.json();
  const supabase = await createClient();

  const { error } = await supabase.from("contact_stock").upsert({
    contact_id: contactId,
    stock_id: stockId,
    project_id: projectId,
    role: "buyer",
  }, { onConflict: "contact_id,stock_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
