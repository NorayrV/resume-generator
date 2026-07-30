"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser code.
 *
 * Only ever uses the anon key, which is safe to ship: Row Level Security in
 * the database is what actually keeps one user out of another's rows.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
