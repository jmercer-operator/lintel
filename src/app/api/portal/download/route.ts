import { NextRequest, NextResponse } from "next/server";
import { createAuthorizedSignedUrl } from "@/lib/auth/document-access";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const path = searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json({ error: "Missing bucket or path" }, { status: 400 });
  }

  const result = await createAuthorizedSignedUrl(bucket, path);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url });
}
