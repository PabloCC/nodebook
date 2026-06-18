import { describe, it, expect } from "vitest";
import { parseYoutubeId } from "./youtube";

describe("parseYoutubeId", () => {
  it("reads the id from common URL shapes", () => {
    expect(parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(parseYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(parseYoutubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("ignores extra query params and surrounding whitespace", () => {
    expect(
      parseYoutubeId("  https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=x ")
    ).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("returns null for non-YouTube, malformed, or id-less URLs", () => {
    expect(parseYoutubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/")).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/watch?v=tooShort")).toBeNull();
    expect(parseYoutubeId("not a url")).toBeNull();
  });
});
