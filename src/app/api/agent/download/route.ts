import { NextResponse } from "next/server";
import { createAuthorizedSignedUrl } from "@/lib/auth/document-access";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const bucket = searchParams.get("bucket") || "project-documents";

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const result = await createAuthorizedSignedUrl(bucket, path);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.redirect(result.url);
}
