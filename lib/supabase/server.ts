import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// New Supabase keys: publishable (sb_publishable_..., public) and secret (sb_secret_..., server only).
// Legacy anon / service_role keys still work as a fallback until Supabase retires them.
const PUBLIC_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET_KEY = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || !PUBLIC_KEY();

/** Acts as the signed-in organiser (row-level security applies). */
export async function userClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, PUBLIC_KEY()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component: safe to ignore */ } },
    },
  });
}

/** Server-only admin client. Used for guest RSVPs and private-event links, after our own validation. */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SECRET_KEY()!, { auth: { persistSession: false } });
}
