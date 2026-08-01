import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/billing";
import { polar, polarEnabled } from "@/lib/polar";

export const runtime = "nodejs";

/**
 * Opens Polar's customer portal, where a subscriber cancels or updates their
 * card.
 *
 * The customer id comes from our own entitlements row rather than the
 * request, so one user can never open another's billing page.
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

  const entitlement = await getEntitlement(user.id);

  if (entitlement?.provider !== "polar" || !entitlement.externalCustomerId) {
    return NextResponse.json(
      { error: "No card subscription found on this account." },
      { status: 404 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await polar().customerSessions.create({
      customerId: entitlement.externalCustomerId,
    });

    const url =
      session.customerPortalUrl ?? `${origin}/account`;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 502 },
    );
  }
}
