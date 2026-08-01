import "server-only";

import { createHash, timingSafeEqual } from "crypto";

/**
 * Cryptomus — crypto payments.
 *
 * Cryptomus has no usable SDK (the npm package is a 0.0.0 stub), so this is
 * the REST API by hand.
 *
 * Authentication on both directions is the same scheme:
 *
 *     sign = md5( base64( json(body) ) + API_KEY )
 *
 * where `body` for a webhook is the callback payload with its own `sign`
 * field removed.
 *
 * The awkward part: Cryptomus signs the JSON *PHP* produced, and PHP's
 * json_encode escapes forward slashes as `\/` by default. Node's
 * JSON.stringify does not. Any payload containing a URL or a transaction hash
 * with a slash therefore hashes differently. verifySignature tries both
 * serialisations — both are derived from the same payload, so accepting
 * either does not weaken anything: a forger still needs the API key.
 */

const API = "https://api.cryptomus.com/v1";

/** How long one crypto payment buys. Crypto cannot auto-renew. */
export const CRYPTO_ACCESS_DAYS = 30;

export function cryptomusEnabled(): boolean {
  return Boolean(
    process.env.CRYPTOMUS_MERCHANT_ID && process.env.CRYPTOMUS_PAYMENT_KEY,
  );
}

function apiKey(): string {
  const key = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!key) throw new Error("CRYPTOMUS_PAYMENT_KEY is not set.");
  return key;
}

function merchantId(): string {
  const id = process.env.CRYPTOMUS_MERCHANT_ID;
  if (!id) throw new Error("CRYPTOMUS_MERCHANT_ID is not set.");
  return id;
}

/** md5(base64(payload) + key), the scheme Cryptomus uses in both directions. */
function sign(serialised: string, key: string): string {
  return createHash("md5")
    .update(Buffer.from(serialised).toString("base64") + key)
    .digest("hex");
}

/** PHP's json_encode default: forward slashes escaped. */
function phpStyle(json: string): string {
  return json.replace(/\//g, "\\/");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/* ------------------------------------------------------------------ */
/* Creating an invoice                                                 */
/* ------------------------------------------------------------------ */

export interface InvoiceResult {
  url: string;
  uuid: string;
}

/**
 * Create a hosted crypto invoice.
 *
 * `orderId` is ours and comes back on the webhook, which is how a payment is
 * matched to a user. Never trust anything else on that callback for identity.
 */
export async function createInvoice(input: {
  orderId: string;
  amount: string;
  currency: string;
  callbackUrl: string;
  returnUrl: string;
  successUrl: string;
}): Promise<InvoiceResult> {
  const body = {
    amount: input.amount,
    currency: input.currency,
    order_id: input.orderId,
    url_callback: input.callbackUrl,
    url_return: input.returnUrl,
    url_success: input.successUrl,
    lifetime: 3600,
  };

  const json = JSON.stringify(body);

  const response = await fetch(`${API}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      merchant: merchantId(),
      sign: sign(json, apiKey()),
    },
    body: json,
  });

  const data = (await response.json().catch(() => null)) as {
    state?: number;
    result?: { url?: string; uuid?: string };
    message?: string;
    errors?: unknown;
  } | null;

  if (!response.ok || !data?.result?.url || !data.result.uuid) {
    throw new Error(data?.message ?? "Cryptomus did not return an invoice.");
  }

  return { url: data.result.url, uuid: data.result.uuid };
}

/* ------------------------------------------------------------------ */
/* Verifying a callback                                                */
/* ------------------------------------------------------------------ */

export interface CallbackPayload {
  order_id?: string;
  uuid?: string;
  status?: string;
  amount?: string;
  currency?: string;
  is_final?: boolean;
  [key: string]: unknown;
}

/**
 * Parse and authenticate a webhook body.
 *
 * Returns null when the signature does not match, which the route turns into
 * a rejection. Nothing downstream should ever see an unverified payload.
 */
export function verifyCallback(rawBody: string): CallbackPayload | null {
  let parsed: CallbackPayload;

  try {
    parsed = JSON.parse(rawBody) as CallbackPayload;
  } catch {
    return null;
  }

  const provided = typeof parsed.sign === "string" ? parsed.sign : null;
  if (!provided) return null;

  // The signature is computed over the payload without its own sign field.
  const { sign: _omit, ...rest } = parsed;
  const json = JSON.stringify(rest);

  const key = apiKey();
  const candidates = [sign(json, key), sign(phpStyle(json), key)];

  return candidates.some((c) => safeEqual(c, provided)) ? parsed : null;
}

/**
 * Cryptomus statuses that mean the money has actually arrived.
 *
 * `paid_over` is an overpayment, which still counts. Anything else — pending,
 * partially paid, failed, expired — grants nothing.
 */
const PAID = new Set(["paid", "paid_over"]);

export function isPaid(payload: CallbackPayload): boolean {
  return typeof payload.status === "string" && PAID.has(payload.status);
}
