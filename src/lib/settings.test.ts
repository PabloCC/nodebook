import { describe, it, expect } from "vitest";
import { maskKey } from "@/lib/settings";

describe("maskKey", () => {
  it("returns empty string for an empty key", () => {
    expect(maskKey("")).toBe("");
  });

  it("returns bullets for a key of 8 characters or fewer", () => {
    expect(maskKey("12345678")).toBe("••••");
  });

  it("returns bullets for a key shorter than 8 characters", () => {
    expect(maskKey("abc")).toBe("••••");
  });

  it("masks a long key with first 5, ellipsis, last 4", () => {
    const key = "sk-ant-abcdef123456";
    const result = maskKey(key);
    expect(result.startsWith("sk-an")).toBe(true);
    expect(result.endsWith("3456")).toBe(true);
    expect(result).toContain("…");
  });

  it("mask format: first 5 + ellipsis + last 4 for a 9-char key", () => {
    const key = "123456789";
    expect(maskKey(key)).toBe("12345…6789");
  });
});
