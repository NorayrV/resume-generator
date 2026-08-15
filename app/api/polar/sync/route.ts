import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { reconcileEntitlement } from "@/lib/reconcile";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I paid, and the site still says free."
 *
 * Asks Polar about the signed-in user and writes down what it says. This is
 * the recovery path for a webhook that never arrived — pointed at the wrong
 * host, blocked, or lost — which otherwise leaves a paying customer with
 * nothing and no way to fix it themselves.
 *
 * The user id comes from the session, never from the body, so this can only
 * ever repair the caller's own access. It grants and never revokes, so
 * pressing it cannot cost anyone anything.
 */
export async function POST() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await reconcileEntitlement(user.id, user.email ?? null);
  const usage = await getUsage(user.id);

  /*
   * Three different outcomes, three different sentences. The one that used to
   * be missing is the middle one: when Polar cannot be reached or refuses the
   * request, saying "no subscription found" states as fact something we do
   * not know, and sends the customer away believing they never paid.
   */
  const message = result.error
    ? "Could not check with Polar just now, so this is not a no. Please contact support and quote: " +
      result.error
    : result.granted
      ? "Found your subscription. Your plan is up to date."
      : usage.tier !== "free"
        ? "Your plan is already up to date."
        : "No active subscription found for this account on Polar.";

  return NextResponse.json(
    {
      granted: result.granted,
      tier: usage.tier,
      accessUntil: result.accessUntil?.toISOString() ?? null,
      checked: !result.error,
      message,
    },
    // A failed check is a server-side problem, and should read as one.
    { status: result.error ? 502 : 200 },
  );
}
