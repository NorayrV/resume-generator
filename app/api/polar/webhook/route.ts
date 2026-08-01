import { NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import { grantAccess, revokeAccess } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Polar's view of the truth, mirrored into our entitlements table.
 *
 * Public by design — Polar calls it server-to-server with no session. The
 * adapter verifies the signature against POLAR_WEBHOOK_SECRET before our
 * handler ever runs, so an unsigned or forged body never reaches this code.
 *
 * Access is granted here and nowhere else. The browser returning from a
 * successful checkout proves nothing.
 */

/**
 * Find our user id on a payload.
 *
 * We set both externalCustomerId and metadata.user_id at checkout, so either
 * will do. Polar has moved these around between versions, hence the spread of
 * places checked rather than one hard-coded path.
 */
function userIdFrom(data: unknown): string | null {
  const d = data as Record<string, unknown> | null;
  if (!d) return null;

  const metadata = d.metadata as Record<string, unknown> | undefined;
  const customer = d.customer as Record<string, unknown> | undefined;

  const candidates = [
    metadata?.user_id,
    d.externalCustomerId,
    d.external_customer_id,
    customer?.externalId,
    customer?.external_id,
  ];

  const found = candidates.find((c) => typeof c === "string" && c.length > 0);
  return typeof found === "string" ? found : null;
}

/** When the paid period runs out. */
function periodEndFrom(data: unknown): Date | null {
  const d = data as Record<string, unknown> | null;
  if (!d) return null;

  const raw =
    d.currentPeriodEnd ?? d.current_period_end ?? d.endsAt ?? d.ends_at;

  if (typeof raw !== "string" && !(raw instanceof Date)) return null;

  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fallback when Polar sends no period end: one month from now. */
function inOneMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function activate(data: unknown, status: string) {
  const userId = userIdFrom(data);
  if (!userId) return;

  const d = data as Record<string, unknown>;
  const customer = d.customer as Record<string, unknown> | undefined;

  await grantAccess({
    userId,
    provider: "polar",
    status,
    accessUntil: periodEndFrom(data) ?? inOneMonth(),
    externalCustomerId:
      (typeof d.customerId === "string" ? d.customerId : null) ??
      (typeof customer?.id === "string" ? customer.id : null),
    externalSubscriptionId: typeof d.id === "string" ? d.id : null,
  });
}

const secret = process.env.POLAR_WEBHOOK_SECRET;

const handler = Webhooks({
  webhookSecret: secret ?? "",

  onSubscriptionActive: async ({ data }) => {
    await activate(data, "active");
  },

  onSubscriptionCreated: async ({ data }) => {
    await activate(data, "active");
  },

  onSubscriptionUpdated: async ({ data }) => {
    await activate(data, "active");
  },

  /**
   * Cancelled, but paid up to the end of the period — so access stays until
   * then. Revoking here would take away time the customer has paid for.
   */
  onSubscriptionCanceled: async ({ data }) => {
    await activate(data, "canceled");
  },

  /** Genuinely over: cut access now. */
  onSubscriptionRevoked: async ({ data }) => {
    const userId = userIdFrom(data);
    if (userId) await revokeAccess(userId, "revoked");
  },
});

/**
 * Fail closed when the secret is missing.
 *
 * Without it the adapter cannot verify anything, so refuse the request rather
 * than let an unverified payload through — or crash with a 500 that looks
 * like a bug rather than a configuration gap.
 */
export async function POST(request: Request): Promise<Response> {
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  }
  return handler(request as never);
}
