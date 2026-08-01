import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";
import { createInvoice, cryptomusEnabled } from "@/lib/cryptomus";
import { getPlanAmountMinor } from "@/lib/polar";
import { FALLBACK_PLAN_AMOUNT_MINOR, FALLBACK_PLAN_CURRENCY } from "@/lib/plan";

export const runtime = "nodejs";

/**
 * Creates a Cryptomus invoice for one access period.
 *
 * The order id is generated here and recorded against the user before the
 * invoice exists. That row is what the webhook matches on, so a callback can
 * never be talked into crediting a different account.
 */
export async function POST(request: Request) {
  if (!cryptomusEnabled()) {
    return NextResponse.json(
      { error: "Crypto payments are not configured on this deployment." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Price the crypto invoice from the same product as the card plan, so the
  // two payment methods cannot drift apart.
  const priced = await getPlanAmountMinor();
  const minor = priced?.amount ?? FALLBACK_PLAN_AMOUNT_MINOR;
  const currency = priced?.currency ?? FALLBACK_PLAN_CURRENCY;

  const orderId = `${user.id}_${randomUUID().slice(0, 8)}`;
  const origin = new URL(request.url).origin;

  // Record the order first. If invoice creation fails we are left with a
  // pending row and no invoice, which is harmless; the reverse — an invoice
  // nobody can attribute — is not.
  const { error: insertError } = await supabaseAdmin()
    .from("crypto_invoices")
    .insert({
      order_id: orderId,
      user_id: user.id,
      status: "pending",
      amount: (minor / 100).toFixed(2),
      currency,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "Could not start the payment. Please try again." },
      { status: 500 },
    );
  }

  try {
    const invoice = await createInvoice({
      orderId,
      amount: (minor / 100).toFixed(2),
      currency,
      callbackUrl: `${origin}/api/crypto/webhook`,
      returnUrl: `${origin}/account`,
      successUrl: `${origin}/account?paid=crypto`,
    });

    await supabaseAdmin()
      .from("crypto_invoices")
      .update({ invoice_uuid: invoice.uuid })
      .eq("order_id", orderId);

    return NextResponse.json({ url: invoice.url });
  } catch {
    await supabaseAdmin()
      .from("crypto_invoices")
      .update({ status: "failed" })
      .eq("order_id", orderId);

    return NextResponse.json(
      { error: "Could not create a crypto invoice. Please try again." },
      { status: 502 },
    );
  }
}
