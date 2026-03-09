import { NextResponse } from "next/server";
import { logCommunicationAction } from "@/lib/actions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await logCommunicationAction(formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
