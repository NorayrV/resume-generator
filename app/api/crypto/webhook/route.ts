import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extendAccess } from "@/lib/billing";
import {
  CRYPTO_ACCESS_DAYS,
  cryptomusEnabled,
  isPaid,
  verifyCallback,
} from "@/lib/cryptomus";

export const runtime = "nodejs";

/**
 * Cryptomus payment callbacks.
 *
 * Public by design — Cryptomus calls it server-to-server with no session. The
 * signature check is what makes that safe: without a body signed with our
 * API key, nothing is credited.
 *
 * Crypto callbacks arrive more than once, and out of order. Everything here
 * is therefore keyed on our own order id and credited at most once, tracked
 * by crypto_invoices.credited_at.
 */
export async function POST(request: Request) {
  if (!cryptomusEnabled()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // The raw body is required: the signature is computed over exactly these
  // bytes, so it must not be parsed and re-serialised first.
  const raw = await request.text();
  const payload = verifyCallback(raw);

  if (!payload) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const orderId = payload.order_id;
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Missing order_id." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: invoice } = await db
    .from("crypto_invoices")
    .select("order_id, user_id, credited_at")
    .eq("order_id", orderId)
    .maybeSingle();

  // An order we never created. Acknowledge so Cryptomus stops retrying, but
  // credit nothing.
  if (!invoice) {
    return NextResponse.json({ received: true });
  }

  const status = typeof payload.status === "string" ? payload.status : "unknown";

  if (!isPaid(payload)) {
    await db
      .from("crypto_invoices")
      .update({ status })
      .eq("order_id", orderId);

    return NextResponse.json({ received: true });
  }

  // Already credited — a repeat callback must not extend access again.
  if (invoice.credited_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  /**
   * Claim the credit atomically. The conditional update means that if two
   * callbacks land at once, only the one that flips credited_at from null
   * proceeds to grant access.
   */
  const { data: claimed } = await db
    .from("crypto_invoices")
    .update({ status, credited_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("credited_at", null)
    .select("order_id");

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await extendAccess({
    userId: invoice.user_id,
    provider: "cryptomus",
    days: CRYPTO_ACCESS_DAYS,
  });

  return NextResponse.json({ received: true });
}
