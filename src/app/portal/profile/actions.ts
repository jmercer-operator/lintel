"use server";

import { createDataClient } from "@/lib/supabase/data-client";
import { getEffectiveContactId } from "@/lib/auth/identity";
import { revalidatePath } from "next/cache";

export async function updateClientProfile(
  contactId: string,
  data: {
    email: string;
    phone: string;
    residential_address_line_1: string;
    residential_address_line_2: string;
    residential_suburb: string;
    residential_state: string;
    residential_postcode: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // Clients may only update their own contact record.
  const sessionContactId = await getEffectiveContactId();
  if (!sessionContactId || sessionContactId !== contactId) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createDataClient();

  const { error } = await supabase
    .from("contacts")
    .update({
      email: data.email || null,
      phone: data.phone || null,
      address_line_1: data.residential_address_line_1 || null,
      address_line_2: data.residential_address_line_2 || null,
      suburb: data.residential_suburb || null,
      state: data.residential_state || null,
      postcode: data.residential_postcode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/portal/profile");
  return { success: true };
}
