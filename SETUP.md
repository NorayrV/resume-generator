# Going public — setup checklist

The code is done. These steps need your own accounts, so you have to do them.

Work top to bottom: each section produces values the next one needs.

---

## 1. Supabase — accounts and database

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query** → paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   It creates three tables with Row Level Security and a trigger that gives every
   new signup an empty profile. It is safe to run more than once.
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

## 3. Stripe — billing

You can skip this entirely at first. Leave the Stripe variables blank and the app
runs on the free tier with the upgrade button hidden.

1. [dashboard.stripe.com](https://dashboard.stripe.com) → stay in **Test mode** until it works.
2. **Products → Add product** → add a **recurring** price (e.g. monthly).
   Copy the **price ID** — it starts with `price_`, not `prod_` — into `STRIPE_PRICE_ID`.
3. **Developers → API keys** → copy the **Secret key** into `STRIPE_SECRET_KEY`.
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

To test webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

That prints a signing secret to use in `.env.local` while it runs.

---

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
   - The Stripe webhook endpoint URL with the real domain

---

## How the free tier works

- `lib/plan.ts` sets the limit — currently **5 generations per rolling 30 days**.
- Every successful generation writes a row to `generations`.
- Users have **no insert or delete permission** on that table; only the server
  writes it, so nobody can reset their own meter.
- A live Stripe subscription (`active` or `trialing`) makes it unlimited.
- The limit is enforced in `app/api/generate/route.ts` before any AI call, so
  hiding the button is a courtesy, not the control.

Change the number in `lib/plan.ts` and both the server limit and the text on the
login and account pages follow.

---

## What still costs you money

Every generation is billed to **your** `DEEPSEEK_API_KEY`, including free-tier
runs. Five free generations per user per month is the exposure per signup. Watch
your DeepSeek spend after launch and lower the number in `lib/plan.ts` if needed.
