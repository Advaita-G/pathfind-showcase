import { track } from "@vercel/analytics";

export const ANALYTICS_EVENTS = {
  homepageViewed: "homepage_viewed",
  buildMyPathClicked: "build_my_path_clicked",
  signupStarted: "signup_started",
  signupCompleted: "signup_completed",
  profileCompleted: "profile_completed",
  pathGenerated: "path_generated",
  recommendationOpened: "recommendation_opened",
  participationActionTaken: "participation_action_taken",
  /** "Did you find at least one useful recommendation?" — properties: { useful: "yes" | "no" }. */
  pathFeedback: "path_feedback",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type AnalyticsProperties = Record<string, string | number | boolean>;
const inMemoryTracked = new Set<string>();

function sessionKey(event: AnalyticsEvent, key: string): string {
  return `pathfind:analytics:${event}:${key}`;
}

/**
 * Sends a custom event without allowing analytics failures to affect the product flow.
 * No profile contents are accepted here; callers should use aggregate context or IDs only.
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (typeof window === "undefined") return;

  try {
    void Promise.resolve(track(event, properties)).catch(() => {
      // Network/provider errors are intentionally ignored.
    });
  } catch {
    // Analytics is optional product telemetry and must never break the student experience.
  }
}

/**
 * Sends a milestone once per browser session. This also protects effects from React StrictMode
 * and prevents duplicate desktop/mobile controls from double-counting the same funnel step.
 */
export function hasTracked(event: AnalyticsEvent, key = "session"): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(sessionKey(event, key)) === "1";
  } catch {
    return false;
  }
}

export function trackOnce(
  event: AnalyticsEvent,
  key = "session",
  properties?: AnalyticsProperties,
): boolean {
  if (typeof window === "undefined") return false;

  const storageKey = sessionKey(event, key);
  if (inMemoryTracked.has(storageKey)) return false;

  try {
    if (sessionStorage.getItem(storageKey) === "1") {
      inMemoryTracked.add(storageKey);
      return false;
    }
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // In-memory deduplication still protects this page if storage is unavailable.
  }
  inMemoryTracked.add(storageKey);

  trackEvent(event, properties);
  return true;
}

export function trackOpportunityAction(opportunityId: string): void {
  trackEvent(ANALYTICS_EVENTS.participationActionTaken, {
    opportunity_id: opportunityId,
  });
}
