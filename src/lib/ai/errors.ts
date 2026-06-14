export function friendlyAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? err.cause : undefined;
  const causeMessage = cause instanceof Error ? cause.message : "";

  if (/ECONNREFUSED|fetch failed|Failed to fetch/i.test(message + causeMessage)) {
    return "Could not reach the AI provider. If you are using Ollama, make sure it is running.";
  }
  if (
    /\b401\b|unauthorized|incorrect api key|invalid[\s_-]?api[\s_-]?key|x-api-key|authentication[_\s]?error/i.test(
      message
    )
  ) {
    return "The AI provider rejected your API key. Check it in Settings.";
  }
  if (/404|not.*found.*model|model.*not/i.test(message)) {
    return "The configured model was not found. Check the model name in Settings.";
  }
  if (/429|rate.?limit|quota/i.test(message)) {
    return "The AI provider rate-limited the request. Try again in a moment.";
  }
  return `AI request failed: ${message}`;
}
