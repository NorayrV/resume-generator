"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { PlanPricing } from "@/lib/plan";

interface AccountData {
  user: { email: string | null; name: string | null; avatar_url: string | null };
  usage: {
    used: number;
    limit: number;
    unlimited: boolean;
    remaining: number | null;
  };
  billing_enabled: boolean;
  plan: PlanPricing;
}

function AccountBody() {
  const params = useSearchParams();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const justUpgraded = params.get("upgraded") === "1";

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load your account."))
      .finally(() => setLoading(false));
  }, []);

  async function upgrade() {
    setUpgrading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not start checkout.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Could not reach the server.");
    } finally {
      setUpgrading(false);
    }
  }

  /** Hand the user over to Stripe to cancel, change card or fetch invoices. */
  async function manageBilling() {
    setManaging(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not open the billing portal.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Could not reach the server.");
    } finally {
      setManaging(false);
    }
  }

  if (loading) return <div className="card h-56 animate-pulse" />;
  if (!data) return <Alert tone="error">{error ?? "Could not load your account."}</Alert>;

  const { usage, plan } = data;
  const pct = usage.unlimited
    ? 100
    : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="space-y-4">
      {justUpgraded && (
        <Alert tone="info">
          Payment received. If your plan still shows as free, give it a few
          seconds and reload — Stripe confirms in the background.
        </Alert>
      )}

      {/* ---- Who you are ---- */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-body font-semibold tracking-[-0.01em]">Account</h2>
        <p className="hint mt-1">{data.user.email ?? "Signed in"}</p>
      </section>

      {/* ---- Usage ---- */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-body font-semibold tracking-[-0.01em]">Usage</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${
              usage.unlimited
                ? "bg-accent-soft text-accent"
                : "border border-line text-muted"
            }`}
          >
            {usage.unlimited ? "Unlimited" : "Free plan"}
          </span>
        </div>

        {usage.unlimited ? (
          <>
            <p className="hint mt-3">
              You are on the paid plan. Generate as many resumes as you need.
            </p>

            {data.billing_enabled && (
              <>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={manageBilling}
                  disabled={managing}
                >
                  {managing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CreditCard className="h-4 w-4" aria-hidden />
                  )}
                  Manage subscription
                </Button>
                <p className="mt-2 text-[0.75rem] text-faint">
                  Cancel, update your card or download invoices on Stripe.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-body tnum">
              <span className="font-semibold">{usage.used}</span>
              <span className="text-muted"> of {usage.limit} generations used</span>
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.remaining === 0 ? "bg-flag" : "bg-accent"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="hint mt-2">
              {usage.remaining === 0
                ? "You have used your free generations for this month."
                : `${usage.remaining} left. Resets 30 days after each generation.`}
            </p>
          </>
        )}
      </section>

      {/*
        Always rendered when the user is not already unlimited. Hiding it when
        billing is unconfigured left a dead end: the generator tells you to
        upgrade, and the page it sends you to shows nothing at all.
      */}
      {!usage.unlimited && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-body font-semibold tracking-[-0.01em]">
            Upgrade to unlimited
          </h2>

          {/* Never show an unpriced buy button. */}
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-[-0.02em]">
              {plan.price}
            </span>
            <span className="text-small text-muted">
              per {plan.period}
            </span>
          </p>

          <ul className="mt-4 space-y-1.5">
            {[
              "Unlimited resumes and cover letters",
              "Every language version, every time",
              "Cancel whenever you like",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 text-small">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {line}
              </li>
            ))}
          </ul>

          {data.billing_enabled ? (
            <>
              <Button
                size="lg"
                className="mt-5"
                onClick={upgrade}
                disabled={upgrading}
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                Upgrade for {plan.price}/{plan.period}
              </Button>

              <p className="mt-3 text-[0.75rem] text-faint">
                Secure payment through Stripe. You will see the exact amount and
                currency before confirming.
              </p>
            </>
          ) : (
            /* Billing not configured on this deployment — say so plainly
               rather than showing a button that cannot work. */
            <div className="mt-5">
              <Button size="lg" disabled>
                <Sparkles className="h-4 w-4" aria-hidden />
                Upgrade for {plan.price}/{plan.period}
              </Button>
              <Alert tone="info" className="mt-3">
                Payments are not switched on yet. Your free generations still
                work, and upgrading will be available shortly.
              </Alert>
            </div>
          )}
        </section>
      )}

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-lg font-semibold tracking-[-0.01em]">Your account</h1>
        <p className="hint mt-1">Usage and billing.</p>

        <div className="mt-6">
          <Suspense fallback={<div className="card h-56 animate-pulse" />}>
            <AccountBody />
          </Suspense>
        </div>
      </main>
    </>
  );
}
