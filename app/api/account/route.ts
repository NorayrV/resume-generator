import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { getUsage } from "@/lib/usage";
import { billingEnabled, getPlanPricing } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who the user is, how much of the free tier is left, and whether they can upgrade. */
export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [usage, plan] = await Promise.all([getUsage(user.id), getPlanPricing()]);

  return NextResponse.json({
    user: {
      email: user.email ?? null,
      name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    usage: {
      used: usage.used,
      limit: usage.limit,
      unlimited: usage.unlimited,
      remaining: usage.unlimited ? null : usage.remaining,
    },
    billing_enabled: billingEnabled(),
    /** Read from Stripe, so the page can never quote a stale figure. */
    plan,
  });
}
