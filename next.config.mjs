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
  //
  // unpdf and pdfjs-dist are here for a second reason: unpdf locates pdf.js's
  // character maps at runtime with import.meta.resolve, which only answers
  // truthfully when the package is sitting in node_modules rather than folded
  // into a bundle. Bundled, the lookup throws, unpdf quietly carries on with no
  // cMapUrl, and every PDF whose fonts need one extracts as empty strings — a
  // perfectly good resume, refused, its owner told to export it again.
  serverExternalPackages: ["docx", "pdfkit", "unpdf", "pdfjs-dist"],

  // Make sure the PDF fonts ship with the deployed API routes. Vercel's file
  // tracing cannot see them, because pdfGenerator.ts builds their paths at
  // runtime — without this, PDF download works locally and 500s in production.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./assets/fonts/**/*",
      // Resolved by URL at runtime, so nothing static points at them and
      // tracing cannot infer them either.
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },

  /*
   * /pricing was a page of its own while the nav's other two links were
   * anchors on the landing page, so one menu item behaved unlike its
   * neighbours. Pricing now lives in that page alongside them, and this keeps
   * any bookmark, shared link or search result pointing at the old route
   * working instead of 404ing.
   */
  async redirects() {
    return [
      { source: "/pricing", destination: "/login#pricing", permanent: true },
    ];
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
