"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Alert } from "./ui/alert";
import type { MasterProfile } from "@/lib/types";

/**
 * Upload an existing resume instead of typing one out.
 *
 * The file is read on the server and comes back as a filled-in profile that
 * the editor below shows for checking. Nothing is saved by this component —
 * the user reviews the result and presses Save themselves.
 *
 * A PDF with no text in it is not refused. The server says so with a code, and
 * we read the pages here by looking at them — see lib/ocr.ts. That takes tens
 * of seconds and several megabytes of WebAssembly, so it happens only when a
 * file turns out to need it, and it says what it is doing while it works.
 */

interface Props {
  onImported: (
    profile: MasterProfile,
    warnings: string[],
    source: "file" | "ocr",
  ) => void;
  /** Set while the parent is busy, so two uploads cannot overlap. */
  disabled?: boolean;
}

/** Mirrors MAX_FILE_BYTES on the server, to fail before uploading 40 MB. */
const MAX_BYTES = 5 * 1024 * 1024;

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Reading {
  label: string;
  /** 0 to 1, or null while the server has it and there is nothing to measure. */
  fraction: number | null;
}

export function ResumeUpload({ onImported, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);

  /** Posts to the import route and hands the result up. Returns any failure. */
  async function submit(body: FormData, source: "file" | "ocr") {
    const response = await fetch("/api/profile/import", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) return data as { error?: string; code?: string };
    onImported(data.profile, data.warnings ?? [], source);
    return null;
  }

  async function upload(file: File) {
    setError(null);

    // Cheap client-side checks first. The server repeats both — it has to,
    // since anyone can post to the endpoint directly — but catching it here
    // saves the user waiting on an upload that was always going to fail.
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("Upload a PDF or a Word .docx file.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Upload a resume under 5 MB.`,
      );
      return;
    }

    setBusy(true);
    setFilename(file.name);
    setReading({ label: `Reading ${file.name}`, fraction: null });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = new FormData();
      body.append("file", file);

      const failure = await submit(body, "file");
      if (!failure) return;

      /*
       * Not a failure so much as a different job. The file is a picture of a
       * resume, so it gets read the only way a picture can be.
       */
      if (failure.code === "needs_ocr") {
        const { readPdfByOcr, OcrError } = await import("@/lib/ocr");

        let text: string;
        try {
          text = await readPdfByOcr(
            file,
            (progress) =>
              setReading({ label: progress.label, fraction: progress.fraction }),
            controller.signal,
          );
        } catch (ocrFailure) {
          if (controller.signal.aborted) return;
          // Falling back to the server's own sentence: it names the problem and
          // the way round it, which is more use than "OCR failed".
          setError(
            ocrFailure instanceof OcrError && ocrFailure.message
              ? ocrFailure.message
              : (failure.error ?? "Could not read that file."),
          );
          return;
        }

        setReading({ label: "Building your profile", fraction: 1 });

        const ocrBody = new FormData();
        ocrBody.append("text", text);
        const ocrFailure = await submit(ocrBody, "ocr");
        if (ocrFailure) setError(ocrFailure.error ?? "Could not read that file.");
        return;
      }

      setError(failure.error ?? "Could not read that file.");
    } catch {
      if (controller.signal.aborted) return;
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      abortRef.current = null;
      setBusy(false);
      setReading(null);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const blocked = busy || disabled;
  const percent =
    reading?.fraction != null ? Math.round(reading.fraction * 100) : null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!blocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (blocked) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={[
          "rounded-md border border-dashed px-5 py-8 text-center transition-colors",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line bg-surface",
          blocked ? "opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={blocked}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        {busy ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2
              className="h-5 w-5 animate-spin text-accent-text"
              aria-hidden
            />
            <p className="text-small font-medium text-ink" role="status">
              {reading?.label ?? `Reading ${filename}`}
              {percent != null && percent < 100 ? ` — ${percent}%` : ""}
            </p>

            {percent == null ? (
              <p className="hint">This takes a few seconds.</p>
            ) : (
              <>
                {/* Only drawn once there is something real to draw. Reading a
                    picture takes long enough that a spinner alone reads as a
                    hang. */}
                <div
                  className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-line-soft"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Reading your resume"
                >
                  <div
                    className="h-full bg-accent transition-[width] duration-300"
                    style={{ width: `${Math.max(percent, 3)}%` }}
                  />
                </div>
                <p className="hint">
                  There is no text in this PDF, so we are reading the pages.
                  This happens on your device.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileUp className="h-5 w-5 text-faint" aria-hidden />

            <p className="text-small text-muted">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={blocked}
                className="font-medium text-accent-text underline-offset-2 hover:underline disabled:cursor-not-allowed"
              >
                Choose a file
              </button>{" "}
              or drag it here
            </p>

            <p className="hint">PDF or Word .docx, up to 5 MB</p>
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
