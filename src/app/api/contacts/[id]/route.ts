import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Remove contact_stock links
  await supabase.from("contact_stock").delete().eq("contact_id", id);

  // Remove client_documents
  await supabase.from("client_documents").delete().eq("contact_id", id);

  // Delete contact
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
