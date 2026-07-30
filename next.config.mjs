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
};

export default nextConfig;
