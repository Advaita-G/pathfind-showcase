// Streaming Gemini call. Models and generation params are fixed here, never taken from the
// client or env, so callers can't pick an expensive model or huge outputs.

// Fastest stable free-tier model first; the second model has its own separate free quota,
// so a 429/503 on the first usually still succeeds.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
const TIMEOUT_MS = 20_000;

export interface Turn {
  role: "user" | "model";
  text: string;
}

export class ProviderError extends Error {}

/** Yields answer text chunks as they arrive. Thought parts are dropped. */
export async function* streamAnswer(
  apiKey: string,
  system: string,
  turns: Turn[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      maxOutputTokens: 700,
      temperature: 0.4,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  });

  let response: Response | null = null;
  for (const model of MODELS) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
      },
    );
    if (response.ok) break;
    // Log only status + a short body slice server-side; never forwarded to the client.
    console.error(`gemini ${model} ${response.status}: ${(await response.text()).slice(0, 300)}`);
    if (response.status !== 429 && response.status < 500) break;
  }
  if (!response?.ok || !response.body) throw new ProviderError(`gemini failed: ${response?.status}`);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let answered = false;
  while (true) {
    const { value, done } = await reader.read();
    buffer += done ? "\n" : value;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const chunk = JSON.parse(line.slice(5));
      if (chunk.error) throw new ProviderError("gemini stream failed");
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        if (!part.thought && typeof part.text === "string" && part.text) {
          answered = true;
          yield part.text;
        }
      }
    }
    if (done) break;
  }
  if (!answered) throw new ProviderError("gemini returned no answer");
}
