import { getRegistrations } from "@/lib/data/registrations";
import RegistrationsClient from "./RegistrationsClient";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const registrations = await getRegistrations();

  return <RegistrationsClient registrations={registrations} />;
}
