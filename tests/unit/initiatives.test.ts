import { describe, it, expect } from "vitest";
import { getInitiatives } from "@/lib/initiatives";

describe("initiatives", () => {
  it("returns initiatives", () => {
    const initiatives = getInitiatives();
    expect(initiatives.length).toBeGreaterThan(0);
  });

  it("every initiative has required fields", () => {
    const initiatives = getInitiatives();
    for (const init of initiatives) {
      expect(init.slug).toBeTruthy();
      expect(init.title).toBeTruthy();
      expect(Array.isArray(init.epics)).toBe(true);
      expect(init.epics.length).toBeGreaterThan(0);
    }
  });

  it("every epic has required fields", () => {
    const initiatives = getInitiatives();
    for (const init of initiatives) {
      for (const epic of init.epics) {
        expect(epic.slug).toBeTruthy();
        expect(epic.title).toBeTruthy();
        expect(epic.status).toBeTruthy();
        expect(epic.initiative).toBe(init.slug);
        expect(Array.isArray(epic.artifacts)).toBe(true);
        expect(typeof epic.gates).toBe("object");
      }
    }
  });

  it("gate dates are valid ISO format when present", () => {
    const initiatives = getInitiatives();
    for (const init of initiatives) {
      for (const epic of init.epics) {
        for (const [, gate] of Object.entries(epic.gates)) {
          if (gate.date) {
            expect(gate.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
          }
        }
      }
    }
  });

  it("bounty values are positive numbers when present", () => {
    const initiatives = getInitiatives();
    let hasBounty = false;
    for (const init of initiatives) {
      for (const epic of init.epics) {
        if (epic.bountyValue != null) {
          expect(epic.bountyValue).toBeGreaterThan(0);
          hasBounty = true;
        }
      }
    }
    expect(hasBounty).toBe(true);
  });

  it("epics are sorted alphabetically within initiative", () => {
    const initiatives = getInitiatives();
    for (const init of initiatives) {
      for (let i = 1; i < init.epics.length; i++) {
        expect(
          init.epics[i].title.localeCompare(init.epics[i - 1].title)
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
