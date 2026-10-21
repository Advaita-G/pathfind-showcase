import { describe, expect, it } from "vitest";
import {
  howToJoinCopy,
  isConfirmedIndividuallyJoinable,
  participationBadge,
  participationMatchNote,
  requiresGroupToJoin,
} from "./participation";
import type { Opportunity, ParticipationInfo } from "../data/types";

function make(participation?: ParticipationInfo): Opportunity {
  return {
    id: "test",
    title: "Test",
    org: "Test Org",
    type: "Competition",
    interests: ["math"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    participation,
  };
}

describe("participationBadge", () => {
  it("shows unknown when nothing has been verified", () => {
    expect(participationBadge(make())).toEqual({
      label: "PARTICIPATION REQUIREMENTS UNKNOWN",
      tone: "unknown",
    });
  });

  it("labels a verified individual opportunity", () => {
    const badge = participationBadge(
      make({
        participationType: "individual",
        canJoinIndividually: true,
        requiresTeam: false,
        requiresClubOrSchool: false,
      }),
    );
    expect(badge).toEqual({ label: "INDIVIDUAL", tone: "individual" });
  });

  it("labels a team-required opportunity", () => {
    const badge = participationBadge(
      make({
        participationType: "team",
        canJoinIndividually: false,
        requiresTeam: true,
        requiresClubOrSchool: "unknown",
      }),
    );
    expect(badge).toEqual({ label: "TEAM REQUIRED", tone: "team" });
  });

  it("labels school/club opportunities the same way whether type is club or school", () => {
    const club = participationBadge(
      make({
        participationType: "club",
        canJoinIndividually: false,
        requiresTeam: "unknown",
        requiresClubOrSchool: true,
      }),
    );
    const school = participationBadge(
      make({
        participationType: "school",
        canJoinIndividually: false,
        requiresTeam: "unknown",
        requiresClubOrSchool: true,
      }),
    );
    expect(club).toEqual({ label: "SCHOOL/CLUB REQUIRED", tone: "club" });
    expect(school).toEqual({ label: "SCHOOL/CLUB REQUIRED", tone: "club" });
  });

  it("labels a mixed opportunity as individual or team", () => {
    const badge = participationBadge(
      make({
        participationType: "mixed",
        canJoinIndividually: true,
        requiresTeam: false,
        requiresClubOrSchool: false,
      }),
    );
    expect(badge).toEqual({ label: "INDIVIDUAL OR TEAM", tone: "mixed" });
  });

  it("falls back to the boolean fields when participationType itself is unknown", () => {
    const badge = participationBadge(
      make({
        participationType: "unknown",
        canJoinIndividually: "unknown",
        requiresTeam: true,
        requiresClubOrSchool: "unknown",
      }),
    );
    expect(badge).toEqual({ label: "TEAM REQUIRED", tone: "team" });
  });
});

describe("howToJoinCopy", () => {
  it("returns the verified sentence when present", () => {
    expect(
      howToJoinCopy(
        make({
          participationType: "team",
          canJoinIndividually: false,
          requiresTeam: true,
          requiresClubOrSchool: "unknown",
          howToJoin: "Join through a school Mock Trial team",
        }),
      ),
    ).toBe("Join through a school Mock Trial team");
  });

  it("returns the honest fallback when unverified", () => {
    expect(howToJoinCopy(make())).toBe("Participation requirements not yet verified.");
  });
});

describe("requiresGroupToJoin / isConfirmedIndividuallyJoinable", () => {
  it("never treats unknown as a confirmed team requirement", () => {
    const opportunity = make({
      participationType: "unknown",
      canJoinIndividually: "unknown",
      requiresTeam: "unknown",
      requiresClubOrSchool: "unknown",
    });
    expect(requiresGroupToJoin(opportunity)).toBe(false);
    expect(isConfirmedIndividuallyJoinable(opportunity)).toBe(false);
  });

  it("reflects a confirmed individual opportunity", () => {
    const opportunity = make({
      participationType: "individual",
      canJoinIndividually: true,
      requiresTeam: false,
      requiresClubOrSchool: false,
    });
    expect(requiresGroupToJoin(opportunity)).toBe(false);
    expect(isConfirmedIndividuallyJoinable(opportunity)).toBe(true);
  });

  it("reflects a confirmed team-only opportunity", () => {
    const opportunity = make({
      participationType: "team",
      canJoinIndividually: false,
      requiresTeam: true,
      requiresClubOrSchool: "unknown",
    });
    expect(requiresGroupToJoin(opportunity)).toBe(true);
    expect(isConfirmedIndividuallyJoinable(opportunity)).toBe(false);
  });
});

describe("participationMatchNote", () => {
  it("stays quiet for a plain individual opportunity", () => {
    expect(
      participationMatchNote(
        make({
          participationType: "individual",
          canJoinIndividually: true,
          requiresTeam: false,
          requiresClubOrSchool: false,
        }),
      ),
    ).toBeNull();
  });

  it("stays quiet when nothing is verified", () => {
    expect(participationMatchNote(make())).toBeNull();
  });

  it("frames a team requirement positively", () => {
    expect(
      participationMatchNote(
        make({
          participationType: "team",
          canJoinIndividually: false,
          requiresTeam: true,
          requiresClubOrSchool: "unknown",
        }),
      ),
    ).toBe("Strong match — requires joining a team");
  });

  it("frames a school/club requirement positively", () => {
    expect(
      participationMatchNote(
        make({
          participationType: "club",
          canJoinIndividually: false,
          requiresTeam: false,
          requiresClubOrSchool: true,
        }),
      ),
    ).toBe("Strong match — join through a school or club");
  });

  it("notes a mixed option as flexible", () => {
    expect(
      participationMatchNote(
        make({
          participationType: "mixed",
          canJoinIndividually: true,
          requiresTeam: false,
          requiresClubOrSchool: false,
        }),
      ),
    ).toBe("Good fit — you can join on your own or with a team");
  });
});
