/**
 * Preview-mode gate.
 *
 * Preview mode (auth bypass + demo identities) is ONLY allowed outside
 * production. In production (Vercel production deploy or NODE_ENV=production)
 * the NEXT_PUBLIC_PREVIEW_MODE flag is ignored and the app fails closed.
 *
 * This module is intentionally pure (no next/headers imports) so it can be
 * used from both middleware (edge) and server code.
 */
export function isPreviewAllowed(): boolean {
  return (
    process.env.NEXT_PUBLIC_PREVIEW_MODE === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production"
  );
}
