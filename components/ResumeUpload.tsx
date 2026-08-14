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
 */

interface Props {
  onImported: (profile: MasterProfile, warnings: string[]) => void;
  /** Set while the parent is busy, so two uploads cannot overlap. */
  disabled?: boolean;
}

/** Mirrors MAX_FILE_BYTES on the server, to fail before uploading 40 MB. */
const MAX_BYTES = 5 * 1024 * 1024;

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function ResumeUpload({ onImported, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

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

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/profile/import", {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not read that file.");
        return;
      }

      onImported(data.profile, data.warnings ?? []);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const blocked = busy || disabled;

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
              Reading {filename}
            </p>
            <p className="hint">This takes a few seconds.</p>
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
