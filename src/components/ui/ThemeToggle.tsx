"use client";

import { useSyncExternalStore } from "react";
import {
  SystemThemeIcon,
  LightThemeIcon,
  DarkThemeIcon,
} from "@/components/ui/icons";

type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof LightThemeIcon }[] =
  [
    { value: "system", label: "System", Icon: SystemThemeIcon },
    { value: "light", label: "Light", Icon: LightThemeIcon },
    { value: "dark", label: "Dark", Icon: DarkThemeIcon },
  ];

const STORE_EVENT = "themechange";

function resolveDark(choice: ThemeChoice) {
  return (
    choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function applyDocument(choice: ThemeChoice) {
  document.documentElement.classList.toggle("dark", resolveDark(choice));
}

// Read the saved theme as an external store so the highlighted option stays in
// sync with the pre-paint script in the root layout — no setState-in-effect.
function subscribe(onChange: () => void) {
  const onMedia = () => {
    // Keep the document in sync when the OS theme flips under a "system" choice.
    if (getSnapshot() === "system") applyDocument("system");
    onChange();
  };
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(STORE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  mq.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener(STORE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onMedia);
  };
}

function getSnapshot(): ThemeChoice {
  return (localStorage.getItem("theme") as ThemeChoice | null) ?? "system";
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const select = (next: ThemeChoice) => {
    localStorage.setItem("theme", next);
    applyDocument(next);
    window.dispatchEvent(new Event(STORE_EVENT));
  };

  return (
    <div className="pill-group" role="group" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          aria-pressed={choice === value}
          className={`pill-tab inline-flex items-center gap-1.5 ${
            choice === value ? "pill-tab-active" : ""
          }`}
        >
          <Icon className="h-4 w-4" weight="bold" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
