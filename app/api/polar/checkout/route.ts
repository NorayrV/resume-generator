import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { polar, polarEnabled } from "@/lib/polar";

export const runtime = "nodejs";

/**
 * Starts a Polar checkout for the signed-in user.
 *
 * The user id goes out as externalCustomerId and in metadata, which is how
 * the webhook later knows whose payment this was. It is taken from the
 * session, never from the request body — otherwise anyone could buy access
 * for, or as, someone else.
 */
export async function POST(request: Request) {
  if (!polarEnabled()) {
    return NextResponse.json(
      { error: "Card payments are not configured on this deployment." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    /*
     * No customerEmail here on purpose. Polar rejects it on this product
     * shape with a validation error, and it buys nothing: Polar collects the
     * email at checkout anyway, and externalCustomerId is what actually links
     * the payment back to our user.
     */
    const checkout = await polar().checkouts.create({
      products: [process.env.POLAR_PRODUCT_ID!],
      successUrl: `${origin}/account?paid=card`,
      externalCustomerId: user.id,
      metadata: { user_id: user.id },
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Polar did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    /*
     * Surface what Polar actually said. A generic "try again" hides the one
     * piece of information needed to fix a wrong product id, an expired
     * token, or a sandbox/production mismatch — and the caller is the site
     * owner far more often than a customer.
     */
    const detail =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message).slice(0, 300)
        : "";

    console.error("[polar/checkout]", err);

    return NextResponse.json(
      {
        error: detail
          ? `Polar rejected the checkout: ${detail}`
          : "Could not start checkout. Please try again.",
      },
      { status: 502 },
    );
  }
}
