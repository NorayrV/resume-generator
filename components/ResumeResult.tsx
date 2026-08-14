"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { ResumePreview } from "./ResumePreview";
import type { PersonalInformation, TailoredResume } from "@/lib/types";

type Format = "docx" | "pdf";

interface Props {
  resume: TailoredResume;
  person: PersonalInformation;
  /** Roles the model wrote bullets for, because the profile had none. */
  draftedRoles: string[];
}

export function ResumeResult({ resume, person, draftedRoles }: Props) {
  const [pending, setPending] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: Format) {
    setPending(format);
    setError(null);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, person, format }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "The file could not be built.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";

      /*
       * filename* first. It is the only one that can carry a name written in
       * Armenian, Cyrillic or any other non-Latin script; the plain filename=
       * beside it is a stripped-back ASCII fallback. Reading the fallback
       * first would throw the real name away on exactly the accounts that
       * most need it.
       */
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plain = disposition.match(/filename="(.+?)"/)?.[1];

      let suggested = plain;
      if (encoded) {
        try {
          suggested = decodeURIComponent(encoded);
        } catch {
          // Malformed encoding — the ASCII fallback is still fine.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = suggested ?? `resume.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-small font-semibold">Resume</h2>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => download("docx")}
            disabled={pending !== null}
          >
            {pending === "docx" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Word
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => download("pdf")}
            disabled={pending !== null}
          >
            {pending === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-4 w-4" aria-hidden />
            )}
            PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {error && <Alert tone="error">{error}</Alert>}

        {/*
          These bullets came from the job title and the skills list, not from
          anything the candidate wrote. Worth saying plainly and above the
          document, rather than leaving it to be discovered in an interview.
        */}
        {draftedRoles.length > 0 && (
          <Alert tone="info">
            <strong className="font-medium">
              Written for you, so check {draftedRoles.length === 1 ? "it" : "them"}:
            </strong>{" "}
            {draftedRoles.join(", ")}. You left {draftedRoles.length === 1 ? "this role" : "these roles"}{" "}
            blank, so the bullets describe the usual duties of the job title
            rather than what you actually did.
          </Alert>
        )}

        <ResumePreview resume={resume} person={person} />

      </div>
    </section>
  );
}
