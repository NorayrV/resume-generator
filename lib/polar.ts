import "server-only";

import { Polar } from "@polar-sh/sdk";
import {
  FALLBACK_PLAN_PERIOD,
  FALLBACK_PLAN_PRICE,
  type PlanPricing,
} from "./plan";

/**
 * Polar — card payments.
 *
 * Polar is the merchant of record, so it handles sales tax and VAT rather
 * than leaving that to us. Access is granted by webhook, never by the
 * browser coming back from checkout.
 */

let client: Polar | null = null;

/** Sandbox until POLAR_SERVER says otherwise, so a missing var cannot bill anyone. */
export function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function polar(): Polar {
  if (client) return client;

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not set.");

  client = new Polar({ accessToken, server: polarServer() });
  return client;
}

/** True when card payments are configured. */
export function polarEnabled(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID);
}

/* ------------------------------------------------------------------ */
/* What the plan costs                                                 */
/* ------------------------------------------------------------------ */

const TTL_MS = 60 * 60 * 1000;
let priceCache: { value: PlanPricing; at: number } | null = null;

const FALLBACK: PlanPricing = {
  price: FALLBACK_PLAN_PRICE,
  period: FALLBACK_PLAN_PERIOD,
  live: false,
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * The live plan price, read from the Polar product.
 *
 * Never throws: an unconfigured or unreachable Polar falls back to a sensible
 * figure, because a pricing page that fails to render is worse than one
 * showing a slightly stale number.
 */
export async function getPlanPricing(): Promise<PlanPricing> {
  if (priceCache && Date.now() - priceCache.at < TTL_MS) {
    return priceCache.value;
  }

  const id = process.env.POLAR_PRODUCT_ID;
  if (!polarEnabled() || !id) return FALLBACK;

  try {
    const product = await polar().products.get({ id });

    // Take the first recurring price on the product.
    const price = product.prices?.find(
      (p) => "priceAmount" in p && typeof p.priceAmount === "number",
    ) as { priceAmount?: number; priceCurrency?: string } | undefined;

    if (!price?.priceAmount) return FALLBACK;

    const interval =
      product.recurringInterval === "year" ? "year" : "month";

    const value: PlanPricing = {
      price: formatAmount(price.priceAmount, price.priceCurrency ?? "usd"),
      period: interval,
      live: true,
    };

    priceCache = { value, at: Date.now() };
    return value;
  } catch {
    return FALLBACK;
  }
}

/** Amount in minor units, for quoting the crypto invoice at the same price. */
export async function getPlanAmountMinor(): Promise<{
  amount: number;
  currency: string;
} | null> {
  const id = process.env.POLAR_PRODUCT_ID;
  if (!polarEnabled() || !id) return null;

  try {
    const product = await polar().products.get({ id });
    const price = product.prices?.find(
      (p) => "priceAmount" in p && typeof p.priceAmount === "number",
    ) as { priceAmount?: number; priceCurrency?: string } | undefined;

    if (!price?.priceAmount) return null;
    return {
      amount: price.priceAmount,
      currency: (price.priceCurrency ?? "usd").toUpperCase(),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Asking Polar directly                                               */
/* ------------------------------------------------------------------ */

/**
 * Statuses that mean the customer currently has access.
 *
 * "canceled" is included on purpose: Polar keeps a cancelled subscription in
 * that state until the period it was paid for actually runs out, and taking
 * access away early would be taking away time somebody paid for. The period
 * end still governs — see accessUntilFrom below.
 */
const LIVE_STATUSES = new Set(["active", "trialing", "canceled"]);

export interface PolarSubscription {
  id: string;
  status: string;
  customerId: string | null;
  /** When the paid period runs out. */
  accessUntil: Date;
}

/**
 * The outcome of asking, which is not the same as the answer.
 *
 * "Polar has no subscription for you" and "we could not ask Polar" look
 * identical if both are reported as null, and they are opposite problems: the
 * first is a customer who never paid, the second is a broken integration.
 * Collapsing them told a paying customer their subscription did not exist.
 */
export type SubscriptionLookup =
  | { ok: true; subscription: PolarSubscription | null }
  | { ok: false; error: string };

/**
 * What Polar says about this user, right now.
 *
 * The webhook is how access normally arrives, and it is faster — but it is
 * also a single delivery over the public internet to one URL, and if that
 * delivery fails the customer has paid and received nothing. This is the
 * other direction: we ask, rather than wait to be told.
 *
 * Looks the customer up by externalCustomerId, which the checkout route sets
 * to our own user id, so no extra mapping table is needed.
 *
 * Returns null on any failure rather than throwing. A caller uses this to
 * *add* access it could not otherwise prove; it must never be the reason a
 * page fails to load.
 */
export async function findLiveSubscription(
  userId: string,
  /**
   * The account's email, used only as a fallback.
   *
   * Every checkout this app creates carries externalCustomerId, so the id
   * lookup normally finds it. Email covers the case it cannot: a
   * subscription created by hand in the Polar dashboard, which has no
   * external id to match on.
   */
  email?: string | null,
): Promise<SubscriptionLookup> {
  if (!polarEnabled()) {
    return { ok: false, error: "Polar is not configured on this deployment." };
  }

  try {
    let items = await listSubscriptions({
      externalCustomerId: userId,
      limit: 20,
    });

    if (items.length === 0 && email) {
      const customerIds = await customerIdsForEmail(email);

      for (const customerId of customerIds) {
        const byCustomer = await listSubscriptions({ customerId, limit: 20 });
        items = items.concat(byCustomer);
      }
    }

    let best: PolarSubscription | null = null;

    for (const sub of items) {
      if (!LIVE_STATUSES.has(String(sub.status))) continue;

      const until = accessUntilFrom(sub);
      if (!until || until.getTime() <= Date.now()) continue;

      // Keep whichever runs longest, in case of an upgrade leaving two rows.
      if (!best || until.getTime() > best.accessUntil.getTime()) {
        best = {
          id: String(sub.id),
          status: String(sub.status),
          customerId: sub.customerId ? String(sub.customerId) : null,
          accessUntil: until,
        };
      }
    }

    return { ok: true, subscription: best };
  } catch (error) {
    /*
     * Most likely an access token without subscriptions:read — the call that
     * fails first and the one whose absence is least obvious, because
     * products:read and checkouts:write are enough for the site to sell a
     * subscription it can then never look up again.
     */
    const message = String(
      error && typeof error === "object" && "message" in error
        ? (error as { message: unknown }).message
        : error,
    );

    console.error("[polar] findLiveSubscription", error);

    return {
      ok: false,
      error: /insufficient_scope|403/.test(message)
        ? "The Polar access token is missing the subscriptions:read and customers:read permissions."
        : message.slice(0, 200),
    };
  }
}

/**
 * One page of subscriptions, or an empty list.
 *
 * Note there is no product or price filter anywhere here. A subscription
 * bought at an older price, or on a product that has since been replaced, is
 * still a subscription — filtering on either would quietly strand exactly the
 * customers who bought earliest.
 */
async function listSubscriptions(
  request: Record<string, unknown>,
): Promise<
  Array<{
    id: string;
    status: string;
    customerId?: string | null;
    currentPeriodEnd?: Date | null;
    endsAt?: Date | null;
  }>
> {
  const page = await polar().subscriptions.list(request as never);
  return (page.result?.items ?? []) as never;
}

/** Polar customer ids registered against an email address. */
async function customerIdsForEmail(email: string): Promise<string[]> {
  try {
    const page = await polar().customers.list({ email, limit: 10 });
    const items = (page.result?.items ?? []) as Array<{ id?: string }>;
    return items.map((c) => String(c.id)).filter(Boolean);
  } catch (error) {
    console.error("[polar] customerIdsForEmail", error);
    return [];
  }
}

/** endsAt when Polar has set one, otherwise the current period end. */
function accessUntilFrom(sub: {
  currentPeriodEnd?: Date | null;
  endsAt?: Date | null;
}): Date | null {
  const raw = sub.endsAt ?? sub.currentPeriodEnd ?? null;
  if (!raw) return null;

  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
