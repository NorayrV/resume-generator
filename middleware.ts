import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and gates private routes.
 *
 * Two jobs, in this order:
 *
 *   1. Touch the session so an expiring access token is refreshed and the new
 *      cookies are written onto the response. Without this a user is silently
 *      signed out about an hour after signing in.
 *   2. Redirect signed-out visitors away from the app, and signed-in ones away
 *      from the login page.
 *
 * Anything not listed in PUBLIC_PATHS requires a session.
 */

const PUBLIC_PATHS = [
  "/login",
  // Readable without an account, and fetched by Google when it verifies the
  // OAuth consent screen.
  "/privacy",
  "/terms",
  "/auth/callback",
  // Emailed sign-in links land here; the visitor has no session yet.
  "/auth/confirm",
  // Polar calls this server-to-server with no session. It verifies its own
  // signature, which is what makes it safe to expose.
  "/api/polar/webhook",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed: an unconfigured deployment must not become an open door.
  if (!url || !anonKey) {
    if (isPublic(request.nextUrl.pathname)) return response;
    return request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Server is not configured." }, { status: 503 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates with Supabase rather than trusting the cookie alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Already signed in and looking at the login page — send them to the app.
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
