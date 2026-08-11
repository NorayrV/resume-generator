/**
 * Content Security Policy.
 *
 * `script-src` allows 'unsafe-inline' and 'unsafe-eval' deliberately. Next's
 * App Router injects inline bootstrap scripts, and locking those down means
 * generating a nonce per request in middleware — worth doing for an app that
 * renders untrusted HTML, which this one never does. There is no
 * dangerouslySetInnerHTML anywhere in the codebase, so the XSS this would
 * defend against has no way in.
 *
 * The directives that cost nothing and are worth having are the rest of it:
 * `frame-ancestors` stops the app being framed for clickjacking, `object-src`
 * kills plugin embedding, and `base-uri`/`form-action` stop an injected tag
 * redirecting relative URLs or posting a form somewhere else.
 *
 * `connect-src` has to include Supabase, which the browser talks to directly
 * for auth and profile reads. The URL is public — it is already NEXT_PUBLIC_ —
 * and the wildcard fallback keeps a preview deployment working if the variable
 * is missing at build time.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Avatars come from Google and GitHub; data: covers inlined icons.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} https://*.supabase.co`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // These are heavier Node libraries. Keeping them external stops Next from
  // trying to bundle them into the serverless function.
  serverExternalPackages: ["docx", "pdfkit"],

  // Make sure the PDF fonts ship with the deployed API routes. Vercel's file
  // tracing cannot see them, because pdfGenerator.ts builds their paths at
  // runtime — without this, PDF download works locally and 500s in production.
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Redundant beside frame-ancestors, but still read by older browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin cross-site, never the full path — a resume URL
          // should not travel in a Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
