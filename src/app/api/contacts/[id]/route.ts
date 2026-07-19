import { createDataClient } from "@/lib/supabase/data-client";
import { requireStaff } from "@/lib/auth/identity";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createDataClient();

  // Remove contact_stock links
  await supabase.from("contact_stock").delete().eq("contact_id", id);

  // Remove client_documents
  await supabase.from("client_documents").delete().eq("contact_id", id);

  // Delete contact
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
