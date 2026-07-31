import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";
import { billingEnabled, stripe } from "@/lib/stripe";

/**
 * Opens Stripe's Customer Portal for the signed-in user.
 *
 * The portal is where a subscriber cancels, updates their card, and downloads
 * invoices. Building those screens ourselves would mean handling payment
 * details, which Stripe is set up to do and we are not.
 *
 * The customer id comes from our own table rather than the request, so one
 * user can never open another's billing page.
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

  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe first." },
      { status: 404 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // The most common cause is the portal not being configured in Stripe yet,
    // which is a one-time dashboard step. Say so rather than "try again".
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";

    const notConfigured = message.toLowerCase().includes("configuration");

    return NextResponse.json(
      {
        error: notConfigured
          ? "The billing portal has not been set up in Stripe yet."
          : "Could not open the billing portal. Please try again.",
      },
      { status: 502 },
    );
  }
}
