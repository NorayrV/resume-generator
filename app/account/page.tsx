"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PRO_GENERATIONS_PER_MONTH, type PlanPricing } from "@/lib/plan";

/** A union of one for now; a second payment method slots back in here. */
type Method = "card";

interface AccountData {
  user: { email: string | null; name: string | null; avatar_url: string | null };
  usage: {
    used: number;
    limit: number;
    unlimited: boolean;
    remaining: number | null;
    tier: "free" | "pro" | "comp";
  };
  billing: { card: boolean };
  plan: PlanPricing;
  access: {
    provider: "polar" | "comp";
    until: string | null;
  } | null;
}

/** Endpoint that starts each kind of payment. */
const CHECKOUT: Record<Method, string> = {
  card: "/api/polar/checkout",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AccountBody() {
  const params = useSearchParams();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<Method | null>(null);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const justPaid = params.get("paid");

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load your account."))
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout(method: Method) {
    setStarting(method);
    setError(null);

    try {
      const response = await fetch(CHECKOUT[method], { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not start the payment.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Could not reach the server.");
    } finally {
      setStarting(null);
    }
  }

  /** Hand a card subscriber over to Polar to cancel or update their card. */
  async function manageBilling() {
    setManaging(true);
    setError(null);

    try {
      const response = await fetch("/api/polar/portal", { method: "POST" });
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
  if (!data) {
    return <Alert tone="error">{error ?? "Could not load your account."}</Alert>;
  }

  const { usage, plan, billing, access } = data;
  const pct = usage.unlimited
    ? 100
    : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  const anyMethod = billing.card;

  return (
    <div className="space-y-4">
      {justPaid && (
        <Alert tone="info">
          Payment received. If your plan still shows as free, give it a few
          seconds and reload.
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
            {usage.tier === "comp"
              ? "Unlimited"
              : usage.tier === "pro"
                ? "Pro"
                : "Free plan"}
          </span>
        </div>

        {usage.tier === "comp" ? (
          <>
            {/*
              Comped access has no billing date worth showing — the stored one
              is a placeholder decades out, and printing "Renews on 31 December
              2099" would just look broken.
            */}
            <p className="hint mt-3">
              You have unlimited access. Generate as many packs as you need —
              there is nothing to pay and nothing to renew.
            </p>

            {access?.provider === "polar" && billing.card && (
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
                  Cancel, update your card or download invoices.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-body tnum">
              <span className="font-semibold">{usage.used}</span>
              <span className="text-muted">
                {" "}
                of {usage.limit} application packs used
              </span>
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
                ? usage.tier === "pro"
                  ? "You have used this month's packs. They free up 30 days after each one."
                  : "You have used your free packs for this month."
                : `${usage.remaining} left. Each frees up 30 days after you use it.`}
            </p>

            {/* A Pro subscriber still needs a way to cancel or change card. */}
            {usage.tier === "pro" && access?.provider === "polar" && billing.card && (
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
                  Cancel, update your card or download invoices.
                  {access?.until && ` Renews on ${formatDate(access.until)}.`}
                </p>
              </>
            )}
          </>
        )}
      </section>

      {/*
        Always rendered when the user is not already on the paid plan. Hiding
        it when payments are unconfigured left a dead end: the generator tells
        you to upgrade, and the page it sends you to shows nothing at all.
      */}
      {usage.tier === "free" && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-body font-semibold tracking-[-0.01em]">
            Upgrade to Pro
          </h2>

          {/* Never show an unpriced buy button. */}
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-[-0.02em]">
              {plan.price}
            </span>
            <span className="text-small text-muted">per {plan.period}</span>
          </p>

          <ul className="mt-4 space-y-1.5">
            {[
              `${PRO_GENERATIONS_PER_MONTH} application packs a month`,
              "Every language version, every time",
              "Cancel whenever you like",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 text-small">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {line}
              </li>
            ))}
          </ul>

          {anyMethod ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {billing.card && (
                  <Button
                    size="lg"
                    onClick={() => startCheckout("card")}
                    disabled={starting !== null}
                  >
                    {starting === "card" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CreditCard className="h-4 w-4" aria-hidden />
                    )}
                    Pay by card
                  </Button>
                )}
              </div>

              <p className="mt-3 text-[0.75rem] leading-relaxed text-faint">
                Renews monthly. Cancel any time.
              </p>
            </>
          ) : (
            <div className="mt-5">
              <Button size="lg" disabled>
                <CreditCard className="h-4 w-4" aria-hidden />
                Upgrade
              </Button>
              <Alert tone="info" className="mt-3">
                Payments are not switched on yet. Your free packs still
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
