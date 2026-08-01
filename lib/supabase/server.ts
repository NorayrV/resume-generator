import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase clients for server code.
 *
 * Two different clients, and the difference matters:
 *
 *   supabaseServer()  acts as the signed-in user. Row Level Security applies,
 *                     so it can only touch that user's rows. Use this for
 *                     everything the user does themselves.
 *
 *   supabaseAdmin()   uses the service-role key and bypasses RLS entirely.
 *                     Use it only for things the user must not be able to
 *                     forge — the usage meter, and the payment webhooks.
 *                     Never import this into a client component.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Request-scoped client that respects RLS as the signed-in user. */
export async function supabaseServer() {
  const jar = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              jar.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** Service-role client. Bypasses RLS — server-only, never expose to the browser. */
export function supabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** The signed-in user, or null. */
export async function currentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
