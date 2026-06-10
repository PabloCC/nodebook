import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function extractUrlText(
  url: string
): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; MyNodebook/0.1)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  // Silence jsdom's noisy CSS/script parse errors.
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { url, virtualConsole });
  const article = new Readability(dom.window.document).parse();

  const text = article?.textContent?.trim();
  if (!article || !text) {
    throw new Error("Could not extract readable content from this page");
  }
  return {
    title: article.title?.trim() || new URL(url).hostname,
    text,
  };
}
