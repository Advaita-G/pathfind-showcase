import { describe, expect, it } from "vitest";
import { parseIntent } from "../../supabase/functions/assistant/intent.ts";

describe("parseIntent", () => {
  it("treats keyboard mashing as unclear, never as a search", () => {
    for (const text of ["elrkgmrjkegn", "asdfasdf", "qwerty", "???", "zzzzzz", "hmm"]) {
      expect(parseIntent(text).kind, text).toBe("unclear");
    }
  });

  it("does not mistake short real words for gibberish", () => {
    for (const text of ["strengths", "html", "nasa", "stanford", "rhythm"]) {
      expect(parseIntent(text).kind, text).not.toBe("unclear");
    }
  });

  it("answers greetings without searching", () => {
    expect(parseIntent("whats up").kind).toBe("greeting");
    expect(parseIntent("Hey there!").kind).toBe("greeting");
  });

  it("routes a named school to entity, not the catalog", () => {
    const intent = parseIntent("Monte Vista High School pressure");
    expect(intent.kind).toBe("entity");
    expect(intent.entity).toBe("Monte Vista High School");
  });

  it("keeps generic school questions general", () => {
    expect(parseIntent("how do I handle pressure in high school").kind).toBe("general");
    expect(parseIntent("how do I balance AP classes and research").kind).toBe("general");
    expect(parseIntent("should I take AP calc or stats").kind).toBe("general");
  });

  it("searches the catalog for explicit requests", () => {
    const intent = parseIntent("find me free AI programs for 9th graders");
    expect(intent).toMatchObject({ kind: "search", target: "opportunities", interests: ["ai"], freeOnly: true, grade: 9 });
    expect(intent.terms).toEqual([]);
  });

  it("maps topic words to interest ids and types", () => {
    const intent = parseIntent("free robotics competitions for a sophomore");
    expect(intent).toMatchObject({ kind: "search", interests: ["engineering"], types: ["Competition"], grade: 10 });
  });

  it("routes personal questions to profile-based advice", () => {
    expect(parseIntent("what should I work on this semester?")).toMatchObject({ kind: "advice", target: "plan" });
    expect(parseIntent("compare the opportunities I saved")).toMatchObject({ kind: "advice", target: "saved" });
    expect(parseIntent("what colleges fit me?")).toMatchObject({ kind: "advice", target: "colleges" });
    expect(parseIntent("What should I apply to next?")).toMatchObject({ kind: "advice", target: "opportunities" });
  });

  it("keeps drawer suggestions routed to the catalog", () => {
    expect(parseIntent("Free research programs").kind).toBe("search");
    expect(parseIntent("What's closing soon?")).toMatchObject({ kind: "search", closingWithinDays: 45 });
    expect(parseIntent("Coding competitions for 10th grade").kind).toBe("search");
  });

  it("keeps named searches as terms", () => {
    expect(parseIntent("stanford")).toMatchObject({ kind: "search", terms: ["stanford"] });
    expect(parseIntent("Tell me about Stanford University")).toMatchObject({
      kind: "search",
      target: "colleges",
      terms: ["stanford"],
    });
    expect(parseIntent("university summer programs in biology").target).toBe("opportunities");
  });

  it("only emits safe search tokens", () => {
    const intent = parseIntent("100% ai_research%' or 1=1 --");
    for (const term of intent.terms) expect(term).toMatch(/^[a-z0-9]+$/);
  });
});
