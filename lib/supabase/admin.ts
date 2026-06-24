import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses Row Level Security entirely.
 * NEVER import this in a client component or expose it to the
 * browser. Only use it server-side (API routes, server
 * components) for operations that intentionally aren't scoped
 * to a single user, like the shared daily usage counter.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
