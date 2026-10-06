import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client "service role" : contourne la sécurité RLS.
 * À n'utiliser que côté serveur, après avoir vérifié que l'appelant est admin.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
