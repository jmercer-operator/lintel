import { NextResponse } from "next/server";
import { createSignedUrl } from "@/lib/data/documents";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const bucket = searchParams.get("bucket") || "project-documents";

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const url = await createSignedUrl(bucket, path);
    if (!url) {
      return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
    }
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
  }
}
