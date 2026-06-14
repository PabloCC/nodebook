"use client";

import { useRef, useTransition } from "react";
import { importWorkspace } from "@/lib/actions/workspaces";

/** Imports an exported workspace zip via a hidden file input. */
export function ImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        className="btn-secondary"
      >
        {pending ? "Importing…" : "Import"}
      </button>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const formData = new FormData();
          formData.set("file", file);
          startTransition(() => importWorkspace(formData));
        }}
      />
    </>
  );
}
