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
): Promise<PolarSubscription | null> {
  if (!polarEnabled()) return null;

  try {
    const page = await polar().subscriptions.list({
      externalCustomerId: userId,
      // Not `active: true` — that would exclude a cancelled subscription
      // still inside the period the customer paid for.
      limit: 20,
    });

    const items = page.result?.items ?? [];

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

    return best;
  } catch (error) {
    console.error("[polar] findLiveSubscription", error);
    return null;
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
