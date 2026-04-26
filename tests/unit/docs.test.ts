import { describe, it, expect } from "vitest";
import { getDocCategories, getDocSections, getDocPage } from "@/lib/docs";

describe("docs", () => {
  it("returns categories", () => {
    const categories = getDocCategories();
    expect(categories.length).toBeGreaterThan(0);
    for (const cat of categories) {
      expect(cat.slug).toBeTruthy();
      expect(cat.title).toBeTruthy();
      expect(cat.sections.length).toBeGreaterThan(0);
    }
  });

  it("returns flat sections", () => {
    const sections = getDocSections();
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.slug).toBeTruthy();
      expect(section.pages.length).toBeGreaterThan(0);
    }
  });

  it("every page has required fields", () => {
    const sections = getDocSections();
    for (const section of sections) {
      for (const page of section.pages) {
        expect(page.slugParts.length).toBeGreaterThan(0);
        expect(page.title).toBeTruthy();
        expect(typeof page.content).toBe("string");
        expect(typeof page.filePath).toBe("string");
        expect(page.filePath).toMatch(/\.md$/);
      }
    }
  });

  it("getDocPage resolves a known page", () => {
    const sections = getDocSections();
    const first = sections[0];
    const page = first.pages[0];

    const pageSlug = page.slugParts[page.slugParts.length - 1];
    const result = getDocPage(first.slug, pageSlug);
    expect(result).toBeDefined();
    expect(result!.page.slugParts).toEqual(page.slugParts);
    expect(result!.section.slug).toBe(first.slug);
    expect(result!.category).toBeDefined();
  });

  it("getDocPage returns undefined for missing page", () => {
    const result = getDocPage("nonexistent", "nope");
    expect(result).toBeUndefined();
  });

  it("pages are sorted by order", () => {
    const sections = getDocSections();
    for (const section of sections) {
      for (let i = 1; i < section.pages.length; i++) {
        expect(section.pages[i].order).toBeGreaterThanOrEqual(
          section.pages[i - 1].order
        );
      }
    }
  });
});
