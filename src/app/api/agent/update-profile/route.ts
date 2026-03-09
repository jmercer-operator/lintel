import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { id, email, phone, secondary_phone, address_line_1, address_line_2, suburb, state, postcode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("agents")
      .update({
        email: email || null,
        phone: phone || null,
        secondary_phone: secondary_phone || null,
        address_line_1: address_line_1 || null,
        address_line_2: address_line_2 || null,
        suburb: suburb || null,
        state: state || null,
        postcode: postcode || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
