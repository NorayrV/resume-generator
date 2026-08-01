# Going public — setup checklist

The code is done. These steps need your own accounts, so you have to do them.

Work top to bottom: each section produces values the next one needs.

---

## 1. Supabase — accounts and database

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query** → run these two files in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — profiles, usage, and the
     signup trigger
   - [`supabase/002_entitlements.sql`](supabase/002_entitlements.sql) — paid
     access and crypto invoices

   Both are safe to run more than once.
3. **Project Settings → API** and copy three values into `.env.local`:

   | Dashboard label | Variable |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses all security rules. It must never appear in
> client code, in git, or with a `NEXT_PUBLIC_` prefix.

---

## 2. Google and GitHub sign-in

In Supabase: **Authentication → Providers**.

### Google

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. Authorised redirect URI — copy the exact **Callback URL** shown on the Supabase
   Google provider page. It looks like:
   `https://<your-project>.supabase.co/auth/v1/callback`
4. Paste the Client ID and Client Secret into Supabase, and enable the provider.

### GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Authorization callback URL — the same Supabase callback URL as above.
3. Paste the Client ID and generated Client Secret into Supabase, and enable it.

### Redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` while developing, your real domain in production.
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

Sign-in fails with a redirect error if these are missing.

---

## 3. Payments

Both are optional. Leave the variables blank and the app runs free-tier only,
with a clear "payments are not switched on yet" message instead of a dead
upgrade button.

### Polar — card payments

Polar is the merchant of record, so it handles sales tax and VAT rather than
leaving that to you.

1. Sign up at [polar.sh](https://polar.sh). Start in the **sandbox**
   organisation at [sandbox.polar.sh](https://sandbox.polar.sh).
2. **Products → New product** → recurring, monthly, your price → copy the
   **product ID** into `POLAR_PRODUCT_ID`.
3. **Settings → Developers → New Token** → copy into `POLAR_ACCESS_TOKEN`.
4. **Settings → Webhooks → Add endpoint**:
   - URL: `https://your-domain.com/api/polar/webhook`
   - Format: **Raw**
   - Events: `subscription.created`, `subscription.active`,
     `subscription.updated`, `subscription.canceled`, `subscription.revoked`
   - Copy the signing secret into `POLAR_WEBHOOK_SECRET`.
5. Leave `POLAR_SERVER=sandbox` while testing. Set it to `production` only
   when the token comes from your production Polar organisation — the two are
   entirely separate accounts.

### Cryptomus — crypto payments

One payment buys 30 days of access. Crypto cannot auto-renew, so there is no
subscription to cancel; the user simply pays again when it runs out.

1. Sign up at [cryptomus.com](https://cryptomus.com) and create a merchant.
2. **API keys** → copy the **merchant ID** into `CRYPTOMUS_MERCHANT_ID` and
   the **payment API key** into `CRYPTOMUS_PAYMENT_KEY`.
   Use the *payment* key, not the payout key — the payment key is what signs
   invoices and verifies callbacks.
3. Callbacks are passed per-invoice by the app, so there is no webhook URL to
   configure in their dashboard.

---

> Cryptomus signs callbacks with `md5(base64(json) + api_key)`, computed over
> the JSON *PHP* produced — which escapes forward slashes. `lib/cryptomus.ts`
> checks both serialisations, so a payload containing a URL or a transaction
> hash still verifies.

## 4. Run it locally

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000 — you should be redirected to `/login` and see the
Google and GitHub buttons.

---

## 5. Deploy

1. Make it a git repo and push to GitHub (private is fine and recommended):

```bash
git init && git add -A && git commit -m "Multi-user resume generator"
```

2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add **every** variable from `.env.local.example` under
   **Settings → Environment Variables**.
4. Deploy, then go back and update:
   - Supabase **Site URL** and **Redirect URLs** with the real domain
   - The Polar webhook endpoint URL with the real domain

---

## How the free tier works

- `lib/plan.ts` sets the limit — currently **5 generations per rolling 30 days**.
- Every successful generation writes a row to `generations`.
- Users have **no insert or delete permission** on that table; only the server
  writes it, so nobody can reset their own meter.
- Paid access makes it unlimited, whether it came from Polar or Cryptomus.
  Both write a single `access_until` date, and access is live while that date
  is in the future.
- The limit is enforced in `app/api/generate/route.ts` before any AI call, so
  hiding the button is a courtesy, not the control.

Change the number in `lib/plan.ts` and both the server limit and the text on the
login and account pages follow.

---

## What still costs you money

Every generation is billed to **your** `DEEPSEEK_API_KEY`, including free-tier
runs. Five free generations per user per month is the exposure per signup. Watch
your DeepSeek spend after launch and lower the number in `lib/plan.ts` if needed.
