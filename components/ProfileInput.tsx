"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Alert } from "./ui/alert";
import type { MasterProfile, ProfileSummary } from "@/lib/types";

/**
 * One box. Paste everything from your resume and save.
 *
 * The text is read into a structured profile on save, once — not on every
 * generation. If the reading gets something wrong, the detailed editor sits
 * behind a toggle for corrections.
 */

interface Props {
  initialText: string;
  onSaved: (summary: ProfileSummary, profile: MasterProfile) => void;
}

const PLACEHOLDER = `Jane Doe
Berlin, Germany | +49 30 1234567 | you@example.com
LinkedIn: linkedin.com/in/your-handle
Telegram: @your_handle

WORK EXPERIENCE

Data Analyst — Acme Analytics, Remote
Apr 2024 – Present
Managed PostgreSQL databases supporting analytics workflows and reporting
Built Tableau dashboards tracking operational KPIs for leadership
Optimised pricing strategy, contributing to a 30% increase in gross revenue

SKILLS
SQL, PostgreSQL, Python, pandas, Tableau, Power BI, Excel, financial modeling

EDUCATION
University of Example — BSc, Economics and Business, 2020–2024

LANGUAGES
English (native), German (fluent)`;

export function ProfileInput({ initialText, onSaved }: Props) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<{
    message: string;
    profile: MasterProfile;
  } | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    setManual(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      if (data.persisted === false) {
        setManual({ message: data.message, profile: data.profile });
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }

      onSaved(data.summary, data.profile);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        aria-label="Your resume text"
        className="text-[0.8125rem] leading-[1.7]"
        disabled={saving}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {manual && (
        <div className="space-y-3">
          <Alert tone="info">{manual.message}</Alert>
          <pre className="max-h-72 overflow-auto rounded-md border border-line bg-surface p-4 text-micro leading-relaxed">
            {JSON.stringify(manual.profile, null, 2)}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(manual.profile, null, 2))
            }
          >
            Copy JSON
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={saving || text.trim().length < 120}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {saved && <Check className="h-4 w-4" aria-hidden />}
          {saving ? "Reading" : saved ? "Saved" : "Save profile"}
        </Button>
        <p className="text-small text-muted">
          {text.trim().length < 120
            ? "Paste your resume to continue"
            : "Formatting does not matter"}
        </p>
      </div>
    </div>
  );
}
