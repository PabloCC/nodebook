import { describe, it, expect } from "vitest";
import { friendlyAiError } from "@/lib/ai/errors";

describe("friendlyAiError", () => {
  it("returns Ollama hint when message contains ECONNREFUSED", () => {
    const err = new Error("connect ECONNREFUSED 127.0.0.1:11434");
    expect(friendlyAiError(err)).toBe(
      "Could not reach the AI provider. If you are using Ollama, make sure it is running."
    );
  });

  it("returns Ollama hint when message contains fetch failed", () => {
    const err = new Error("fetch failed");
    expect(friendlyAiError(err)).toBe(
      "Could not reach the AI provider. If you are using Ollama, make sure it is running."
    );
  });

  it("returns Ollama hint when Error cause contains ECONNREFUSED", () => {
    const cause = new Error("connect ECONNREFUSED 127.0.0.1:11434");
    const err = new Error("fetch failed");
    (err as Error & { cause: unknown }).cause = cause;
    expect(friendlyAiError(err)).toBe(
      "Could not reach the AI provider. If you are using Ollama, make sure it is running."
    );
  });

  it("returns API key hint when message contains 401", () => {
    const err = new Error("Request failed with status 401");
    expect(friendlyAiError(err)).toBe(
      "The AI provider rejected your API key. Check it in Settings."
    );
  });

  it("returns API key hint when message contains unauthorized", () => {
    const err = new Error("Unauthorized access");
    expect(friendlyAiError(err)).toBe(
      "The AI provider rejected your API key. Check it in Settings."
    );
  });

  it("returns model hint when message contains model not found", () => {
    const err = new Error("model not found: gpt-99");
    expect(friendlyAiError(err)).toBe(
      "The configured model was not found. Check the model name in Settings."
    );
  });

  it("returns model hint when message contains 404", () => {
    const err = new Error("404 not found");
    expect(friendlyAiError(err)).toBe(
      "The configured model was not found. Check the model name in Settings."
    );
  });

  it("returns rate-limit hint when message contains 429", () => {
    const err = new Error("429 Too Many Requests");
    expect(friendlyAiError(err)).toBe(
      "The AI provider rate-limited the request. Try again in a moment."
    );
  });

  it("returns rate-limit hint when message contains rate limit", () => {
    const err = new Error("Rate limit exceeded");
    expect(friendlyAiError(err)).toBe(
      "The AI provider rate-limited the request. Try again in a moment."
    );
  });

  it("returns generic fallback for unknown error", () => {
    const err = new Error("Something unexpected happened");
    expect(friendlyAiError(err)).toBe(
      "AI request failed: Something unexpected happened"
    );
  });

  it("stringifies a non-Error input in the fallback", () => {
    expect(friendlyAiError("plain string error")).toBe(
      "AI request failed: plain string error"
    );
  });

  it("stringifies a non-Error object in the fallback", () => {
    expect(friendlyAiError(42)).toBe("AI request failed: 42");
  });
});
