import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError, streamAnswer } from "../../supabase/functions/assistant/provider.ts";

const event = (text: string) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}`;
const read = async () => {
  let text = "";
  for await (const part of streamAnswer("test-key", "test rules", [{ role: "user", text: "test" }], new AbortController().signal)) text += part;
  return text;
};
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("assistant provider failures (no network)", () => {
  it("preserves the last text event when the stream ends without a newline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(event("Check the official page."))));
    expect(await read()).toBe("Check the official page.");
  });
  it("rejects a successful HTTP response with no generated answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n')));
    await expect(read()).rejects.toBeInstanceOf(ProviderError);
  });
  it("rejects an upstream error event instead of silently finishing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('data: {"error":{"code":503}}\n\n')));
    await expect(read()).rejects.toBeInstanceOf(ProviderError);
  });
  it("uses the existing fallback model after a temporary HTTP failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi.fn().mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(event("Results remain grounded.") + "\n\n"));
    vi.stubGlobal("fetch", fetch);
    expect(await read()).toBe("Results remain grounded.");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).not.toBe(fetch.mock.calls[1][0]);
  });
});
