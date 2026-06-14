"use client";

import Link from "next/link";
import { SettingsIcon } from "@/components/ui/icons";

/** Gear icon linking to Settings — used where a corner icon is wanted. */
export function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      title="Settings"
      className="-mr-2 shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-soft hover:text-ink"
    >
      <SettingsIcon className="h-5 w-5" weight="bold" />
    </Link>
  );
}
