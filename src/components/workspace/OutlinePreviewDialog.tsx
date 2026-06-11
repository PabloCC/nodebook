"use client";

import { useState, useTransition } from "react";
import type { OutlineProposal } from "@/lib/ai/outline-schema";
import { applyOutline } from "@/lib/actions/nodes";

export function OutlinePreviewDialog({
  workspaceId,
  proposal,
  onClose,
}: {
  workspaceId: string;
  proposal: OutlineProposal;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = () =>
    startTransition(async () => {
      try {
        await applyOutline(workspaceId, proposal);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-hairline bg-canvas shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <div className="border-b border-hairline-soft px-5 py-4">
          <h2 className="text-base font-semibold">Proposed outline</h2>
          <p className="mt-1 text-sm text-muted">
            Review the structure generated from your sources. Accepting adds it
            to your outline — nothing is saved until then.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {proposal.groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              <p className="text-sm font-semibold">▾ {group.title}</p>
              <ul className="mt-1 space-y-1 pl-5">
                {group.nodes.map((node, ni) => (
                  <li key={ni} className="text-sm">
                    <span className="font-medium">{node.title}</span>
                    <span className="block text-xs text-muted">
                      {node.summary}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline-soft px-5 py-4">
          {error && (
            <p className="mb-2 text-sm text-error">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={pending}
              className="btn-secondary"
            >
              Reject
            </button>
            <button
              onClick={accept}
              disabled={pending}
              className="btn-primary"
            >
              {pending ? "Applying…" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
