import test from "node:test";
import assert from "node:assert/strict";
import { activePhase, hasRequiredSections, serializePlan } from "./plan.mjs";

test("serializePlan produces required sections", () => {
  const markdown = serializePlan({
    mission: "Keep trajectory.",
    phases: ["Bootstrap", "Harden"],
    activePhase: "Bootstrap",
    recentDecisions: ["Use JSONL"]
  });
  assert.equal(hasRequiredSections(markdown), true);
  assert.equal(activePhase(markdown), "Bootstrap");
});

test("hasRequiredSections rejects incomplete plans", () => {
  assert.equal(hasRequiredSections("## Mission\n\nOnly one section"), false);
});
