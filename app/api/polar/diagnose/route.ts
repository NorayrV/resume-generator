import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/billing";
import { polar, polarEnabled, polarServer, getPlanPricing } from "@/lib/polar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Why does Polar say this account has nothing?
 *
 * Read-only, and answers the questions that otherwise need someone to read a
 * dashboard and an environment variable and compare them by eye:
 *
 *   - is this deployment talking to Polar's sandbox or to production?
 *   - can its token see the configured product at all?
 *   - does Polar know this user by external id, or by email, or not at all?
 *   - what does our own entitlements table say?
 *
 * Deliberately reports no secrets: no token, no organisation id, and nothing
 * about any customer other than the caller. "sandbox or production" is a fact
 * about the deployment, not a credential — and it is the single most likely
 * explanation for a subscription that exists in one place and not the other.
 *
 * Writes nothing. Running it cannot change anyone's access.
 */
export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const report: Record<string, unknown> = {
    server: polarServer(),
    configured: polarEnabled(),
    productIdSet: Boolean(process.env.POLAR_PRODUCT_ID),
    webhookSecretSet: Boolean(process.env.POLAR_WEBHOOK_SECRET),
    you: { userId: user.id, email: user.email ?? null },
  };

  /* Can the token see the product the checkout sells? */
  try {
    const plan = await getPlanPricing();
    report.product = {
      priceShown: plan.price,
      // false means the lookup failed and the hardcoded fallback is showing.
      liveFromPolar: plan.live,
    };
  } catch (error) {
    report.product = { error: String(error).slice(0, 200) };
  }

  /* Does Polar know this user by the id the checkout attaches? */
  try {
    const page = await polar().subscriptions.list({
      externalCustomerId: user.id,
      limit: 20,
    });
    const items = (page.result?.items ?? []) as Array<{
      status?: string;
      currentPeriodEnd?: Date | null;
      endsAt?: Date | null;
    }>;

    report.byExternalId = {
      found: items.length,
      statuses: items.map((s) => String(s.status)),
      periodEnds: items.map((s) =>
        s.endsAt || s.currentPeriodEnd
          ? new Date((s.endsAt ?? s.currentPeriodEnd)!).toISOString()
          : null,
      ),
    };
  } catch (error) {
    report.byExternalId = { error: String(error).slice(0, 200) };
  }

  /* And by email, which catches a subscription created by hand. */
  try {
    const email = user.email;
    if (!email) {
      report.byEmail = { skipped: "account has no email" };
    } else {
      const customers = await polar().customers.list({ email, limit: 10 });
      const ids = ((customers.result?.items ?? []) as Array<{ id?: string }>)
        .map((c) => String(c.id))
        .filter(Boolean);

      const statuses: string[] = [];
      for (const customerId of ids) {
        const subs = await polar().subscriptions.list({ customerId, limit: 20 });
        for (const s of (subs.result?.items ?? []) as Array<{ status?: string }>) {
          statuses.push(String(s.status));
        }
      }

      report.byEmail = { customersFound: ids.length, subscriptions: statuses };
    }
  } catch (error) {
    report.byEmail = { error: String(error).slice(0, 200) };
  }

  /* What we have written down for this user. */
  const entitlement = await getEntitlement(user.id);
  report.storedEntitlement = entitlement
    ? {
        provider: entitlement.provider,
        status: entitlement.status,
        accessUntil: entitlement.accessUntil?.toISOString() ?? null,
      }
    : null;

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
