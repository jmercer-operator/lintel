import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const path = searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json({ error: "Missing bucket or path" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) {
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
