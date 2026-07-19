import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";
import { createAdminClient } from "./admin";
import { isPreviewAllowed } from "@/lib/auth/preview";

// Server-side only. Both the session client and the admin client satisfy this
// shape; callers use plain table/storage operations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataClient = SupabaseClient<any, any, any>;

/**
 * Preview-aware Supabase client for server-side data access.
 *
 * - Real session present → session-scoped client. RLS applies to every query,
 *   so authenticated users can never read more than their policies allow.
 * - No session + allowed local preview (isPreviewAllowed(): NEXT_PUBLIC_PREVIEW_MODE
 *   AND not a production deploy) → service-role client so demo pages render
 *   seeded data despite hardened RLS. This branch is unreachable in production.
 * - No session + production → session (anon) client. Hardened RLS returns
 *   nothing and middleware has already redirected to /login: fails closed.
 *
 * Never import from client components — this module touches next/headers and,
 * in the preview branch, the service-role key.
 */
export async function createDataClient(): Promise<DataClient> {
  const supabase = await createClient();

  if (isPreviewAllowed()) {
    // Cookie check only — this does not authenticate anything, it just picks
    // the session client whenever a real session exists so RLS still applies.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return createAdminClient() as DataClient;
  }

  return supabase as DataClient;
}
