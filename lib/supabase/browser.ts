"use client";
import { createBrowserClient } from "@supabase/ssr";

// Supabase publishable key (sb_publishable_...). The legacy "anon" key is accepted as a fallback.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const browserDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !PUBLIC_KEY;

export function browserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, PUBLIC_KEY!);
}
