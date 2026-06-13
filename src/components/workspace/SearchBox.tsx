"use client";

import { useEffect, useRef, useState } from "react";
// Type-only import: a value import would pull @/lib/db (better-sqlite3)
// into the client bundle.
import type { SearchResult } from "@/lib/search";

const DEBOUNCE_MS = 200;

// Snippet match markers — must mirror char(1)/char(2) in searchNodes' SQL
// (src/lib/search.ts). Control chars, so node text can never collide.
const MARK_START = "\u0001";
const MARK_END = "\u0002";

export function SearchBox({
  workspaceId,
  onSelect,
}: {
  workspaceId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQuery = useRef("");

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const run = async (q: string) => {
    latestQuery.current = q;
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(q)}`
      );
      const data = (await res.json()) as { results?: SearchResult[] };
      // Ignore responses for queries the user has already typed past.
      if (latestQuery.current === q) setResults(data.results ?? []);
    } catch {
      if (latestQuery.current === q) setResults([]);
    }
  };

  const onChange = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(q), DEBOUNCE_MS);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    latestQuery.current = "";
    setQuery("");
    setResults([]);
  };

  return (
    <div className="px-2 pt-2">
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") clear();
        }}
        placeholder="Search nodes…"
        className="input-field px-3 py-1.5 text-xs"
      />
      {query.trim() !== "" && (
        <ul className="mt-1 space-y-0.5">
          {results.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-muted">No matches.</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    onSelect(r.id);
                    clear();
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas"
                >
                  <span className="block truncate">{r.title}</span>
                  <span className="block truncate text-xs text-muted">
                    <Snippet text={r.snippet} />
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// Snippets arrive with control-char markers around matches; render them as
// <mark> by splitting — never via HTML, so node content can't inject markup.
function Snippet({ text }: { text: string }) {
  const parts = text.split(MARK_START);
  return (
    <>
      {parts.map((part, i) => {
        if (i === 0) return part;
        const [marked, rest] = part.split(MARK_END);
        return (
          <span key={i}>
            <mark className="rounded-sm bg-accent/20 text-ink">{marked}</mark>
            {rest}
          </span>
        );
      })}
    </>
  );
}
