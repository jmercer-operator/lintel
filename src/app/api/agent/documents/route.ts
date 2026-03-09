import { NextResponse } from "next/server";
import { getAgentProjectDocuments } from "@/lib/data/agent-portal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    const documents = await getAgentProjectDocuments(projectId);
    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
