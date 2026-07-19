import { getAuditEvents } from "@/lib/data/audit";
import AuditLogClient from "./AuditLogClient";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const feed = await getAuditEvents();

  return <AuditLogClient available={feed.available} events={feed.events} />;
}
