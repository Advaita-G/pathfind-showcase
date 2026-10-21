import { beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn(() => Promise.resolve()) }));

vi.mock("@vercel/analytics", () => ({ track }));

import { ANALYTICS_EVENTS, trackEvent, trackOnce } from "./analytics";

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("analytics", () => {
  beforeEach(() => {
    track.mockClear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", createSessionStorage());
  });

  it("uses simple, stable funnel event names", () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual([
      "homepage_viewed",
      "build_my_path_clicked",
      "signup_started",
      "signup_completed",
      "profile_completed",
      "path_generated",
      "recommendation_opened",
      "participation_action_taken",
      "path_feedback",
    ]);
  });

  it("tracks a milestone once per session", () => {
    expect(trackOnce(ANALYTICS_EVENTS.homepageViewed)).toBe(true);
    expect(trackOnce(ANALYTICS_EVENTS.homepageViewed)).toBe(false);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("homepage_viewed", undefined);
  });

  it("allows recommendation interactions while keeping payloads non-sensitive", () => {
    trackEvent(ANALYTICS_EVENTS.recommendationOpened, { opportunity_id: "example-id" });
    expect(track).toHaveBeenCalledWith("recommendation_opened", { opportunity_id: "example-id" });
  });
});
