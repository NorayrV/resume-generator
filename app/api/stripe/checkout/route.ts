import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";
import { billingEnabled, stripe } from "@/lib/stripe";

/**
 * Starts a Stripe Checkout session for the signed-in user.
 *
 * The user's id travels in client_reference_id and in the subscription
 * metadata, which is how the webhook later knows whose subscription it is.
 */
export async function POST(request: Request) {
  if (!billingEnabled()) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    // Reuse the Stripe customer if this user has subscribed before, so their
    // billing history stays on one record.
    const { data: existing } = await supabaseAdmin()
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      client_reference_id: user.id,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/account?upgraded=1`,
      cancel_url: `${origin}/account`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
