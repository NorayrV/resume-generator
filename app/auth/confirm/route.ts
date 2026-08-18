import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where an emailed sign-in link lands.
 *
 * Separate from /auth/callback, and for a concrete reason. That route
 * completes the PKCE exchange, which requires a `code_verifier` the browser
 * stored when it started the flow. That works for Google and GitHub, because
 * the whole round trip happens in one browser. It does not work for a link
 * sent by email: people request the link in one browser and open it wherever
 * their mail client decides to open it — a different browser, a webview
 * inside the mail app, sometimes a different device entirely. The verifier is
 * not there, and the exchange fails with "PKCE code verifier not found in
 * storage", which is exactly what happened in testing.
 *
 * verifyOtp with a token hash has no such requirement. The hash is the proof,
 * the exchange happens server-side, and the session cookies are set on
 * whichever browser followed the link. So an emailed link works from
 * anywhere, which is the only behaviour a person would call correct.
 *
 * This route requires the email template to send the user here — see
 * `{{ .TokenHash }}` in Supabase's Auth email templates. Until it does, the
 * default template still points at /auth/callback and PKCE still applies.
 */

/** The email flows we accept a hash for. Anything else is rejected. */
const ALLOWED: EmailOtpType[] = [
  "magiclink",
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Same-site only, so a crafted link cannot bounce someone off-site after
  // signing them in.
  const requested = searchParams.get("next") ?? "/";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  if (!tokenHash || !type) return fail("missing_token");
  if (!ALLOWED.includes(type)) return fail("unsupported_link_type");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
