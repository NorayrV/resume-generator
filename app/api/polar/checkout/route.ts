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
    const checkout = await polar().checkouts.create({
      products: [process.env.POLAR_PRODUCT_ID!],
      successUrl: `${origin}/account?paid=card`,
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      metadata: { user_id: user.id },
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Polar did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
