// Hand-rolled YouTube transcript extraction (no dependency): load the watch
// page, read the embedded `ytInitialPlayerResponse` for the title and caption
// track, then fetch and parse the timedtext track. Inherently brittle — it
// relies on YouTube's page shape — so failures surface clear messages and the
// source can be retried.

const UA = "Mozilla/5.0 (compatible; MyNodebook/0.1)";

type PlayerResponse = {
  videoDetails?: { title?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: { baseUrl: string; languageCode?: string }[];
    };
  };
};

/** Extract an 11-char video id from common YouTube URL shapes, else null. */
export function parseYoutubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = /^\/(?:shorts|embed|v)\/([^/?#]+)/.exec(url.pathname);
      if (m) id = m[1];
    }
  }

  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

// Slice the balanced JSON object assigned to `ytInitialPlayerResponse`.
function extractPlayerResponse(html: string): PlayerResponse | null {
  const at = html.indexOf("ytInitialPlayerResponse");
  if (at === -1) return null;
  const start = html.indexOf("{", html.indexOf("=", at));
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  let quote = "";
  let i = start;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === quote) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }

  try {
    return JSON.parse(html.slice(start, i)) as PlayerResponse;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseTimedText(xml: string): string {
  const parts: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) parts.push(decodeEntities(m[1]));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export async function extractYoutubeTranscript(
  url: string
): Promise<{ title: string; text: string }> {
  const id = parseYoutubeId(url);
  if (!id) throw new Error("Not a valid YouTube video URL");

  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Could not load the video page: ${res.status}`);
  }

  const player = extractPlayerResponse(await res.text());
  if (!player) {
    throw new Error("Could not read video data (YouTube may have changed its page).");
  }

  const title = player.videoDetails?.title?.trim() || `YouTube video ${id}`;
  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks?.length) {
    throw new Error("This video has no transcript/captions available.");
  }

  const track =
    tracks.find((t) => (t.languageCode ?? "").startsWith("en")) ?? tracks[0];
  const capRes = await fetch(track.baseUrl, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!capRes.ok) {
    throw new Error("Could not download the transcript track.");
  }

  const text = parseTimedText(await capRes.text());
  if (!text) throw new Error("The transcript track was empty.");
  return { title, text };
}
