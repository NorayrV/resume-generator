import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Stripe's view of the truth, mirrored into our subscriptions table.
 *
 * This route is public — middleware skips it — because Stripe calls it
 * server-to-server with no session. The signature check below is what makes
 * that safe: without a valid signature nothing is written.
 *
 * The raw body is required for signature verification, so it must be read as
 * text and never parsed as JSON first.
 */

export const runtime = "nodejs";

/** Copy the parts of a Stripe subscription we care about into our table. */
async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end;

  await supabaseAdmin().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price?.id ?? null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const raw = await request.text();
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    // Bad signature, or a body that did not come from Stripe.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // A subscription checkout does not carry the subscription object
        // inline, so fetch it to get status and period end.
        if (session.subscription) {
          const id =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe().subscriptions.retrieve(id);

          // Belt and braces: if metadata went missing, fall back to the id
          // Checkout carried for us.
          if (!subscription.metadata?.user_id && session.client_reference_id) {
            subscription.metadata = {
              ...subscription.metadata,
              user_id: session.client_reference_id,
            };
          }

          await syncSubscription(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }

      default:
        // Everything else is acknowledged and ignored.
        break;
    }
  } catch {
    // Return 500 so Stripe retries rather than dropping the event.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
