import { describe, expect, test } from "vitest";
import { IMPORTED_OPPORTUNITIES, OPPORTUNITIES } from "./opportunities";

/**
 * Integrity checks for the verified `participation` field (src/data/types.ts). These guard
 * against the two ways this data could quietly go wrong: internally contradictory fields,
 * or a regression on the flagship example (California Mock Trial) that motivated adding
 * this field in the first place.
 */
describe("Opportunity.participation integrity", () => {
  const withParticipation = OPPORTUNITIES.filter((o) => o.participation);

  test("at least one opportunity has verified participation data", () => {
    expect(withParticipation.length).toBeGreaterThan(0);
  });

  test.each(withParticipation)("$id: participation fields are internally consistent", (opportunity) => {
    const p = opportunity.participation!;

    if (p.participationType === "individual") {
      expect(p.canJoinIndividually).toBe(true);
      expect(p.requiresTeam).not.toBe(true);
      expect(p.requiresClubOrSchool).not.toBe(true);
    }

    if (p.participationType === "team" || p.participationType === "club" || p.participationType === "school") {
      expect(p.canJoinIndividually).toBe(false);
    }

    // canJoinIndividually and requiresTeam are never both confirmed true — a program
    // can't simultaneously be a solo application and mandate a team.
    expect(p.canJoinIndividually === true && p.requiresTeam === true).toBe(false);

    // howToJoin, when present, is a short verified sentence, not a placeholder.
    if (p.howToJoin) {
      expect(p.howToJoin.length).toBeGreaterThan(0);
      expect(p.howToJoin.length).toBeLessThan(140);
    }
  });

  test("California Mock Trial is verified as requiring a school/team, not an individual application", () => {
    const mockTrial = OPPORTUNITIES.find((o) => o.id === "california-mock-trial");
    expect(mockTrial?.participation).toBeDefined();
    expect(mockTrial?.participation?.canJoinIndividually).toBe(false);
    expect(mockTrial?.participation?.requiresTeam).toBe(true);
    expect(mockTrial?.participation?.participationType).toBe("team");
  });

  test("every hand-curated Competition-type opportunity has verified participation data", () => {
    // All hand-curated competitions were researched against official sources. Imported records
    // carry participation only when their evidence quotes include it, so they are exempt here.
    const imported = new Set(IMPORTED_OPPORTUNITIES.map((o) => o.id));
    const competitions = OPPORTUNITIES.filter((o) => o.type === "Competition" && !imported.has(o.id));
    const unverified = competitions.filter((o) => !o.participation);
    expect(unverified.map((o) => o.id)).toEqual([]);
  });

  test("opportunities without verified participation data are left unset, not guessed", () => {
    // Programs/Research/Internships haven't been researched for this field yet (only
    // competitions were, this pass) and must stay unset rather than assumed — an
    // "individual application" default would be a guess, not a verified fact.
    const unverifiedSample = ["cosmos", "rsi", "stanford-csi"];
    for (const id of unverifiedSample) {
      const opportunity = OPPORTUNITIES.find((o) => o.id === id);
      expect(opportunity).toBeDefined();
      expect(opportunity?.participation).toBeUndefined();
    }
  });
});
