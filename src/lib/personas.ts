import fs from "fs";
import path from "path";
import { GROUP_META } from "./persona-types";
import type { Persona, PersonaGroup, DiscoverySession } from "./persona-types";

export type { Persona, PersonaGroup, DiscoverySession };
export { GROUP_META };

// ---------------------------------------------------------------------------
// Group assignments (from 1.overview.md Quick Links)
// ---------------------------------------------------------------------------

const GROUP_MAP: Record<string, PersonaGroup> = {
  participant: "primary",
  "care-partner": "primary",
  "care-coordinator": "primary",
  "registered-supporter": "primary",
  supplier: "primary",
  assessor: "secondary",
  administrator: "secondary",
  "bill-processor": "operations",
  "collections-team": "operations",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERSONAS_DIR = path.join(process.cwd(), "content/context/personas");

function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  content: string;
} {
  const data: Record<string, string> = {};
  if (!raw.startsWith("---")) return { data, content: raw };

  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) return { data, content: raw };

  const block = raw.slice(3, endIndex);
  const content = raw.slice(endIndex + 4).trim();

  for (const line of block.split("\n")) {
    const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)/);
    if (match) {
      data[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }

  return { data, content };
}

/**
 * Extract bullet items under a specific `## Heading`.
 * Returns an array of trimmed strings (without the leading `- `).
 */
function extractSection(content: string, heading: string): string[] {
  const pattern = new RegExp(
    `^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "m",
  );
  const match = pattern.exec(content);
  if (!match) return [];

  const afterHeading = content.slice(match.index + match[0].length);
  const lines = afterHeading.split("\n");
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stop at next heading
    if (trimmed.startsWith("#")) break;
    // Collect bullet items
    if (trimmed.startsWith("- ")) {
      items.push(trimmed.slice(2).trim());
    }
  }

  return items;
}

/**
 * Extract related persona slugs from `## Related Personas` section.
 * Links follow pattern: `[Name](../slug-here/)`
 */
function extractRelatedSlugs(content: string): string[] {
  const sectionItems = extractSection(content, "Related Personas");
  const slugs: string[] = [];
  for (const item of sectionItems) {
    const match = item.match(/\(\.\.\/([^/)]+)\/?/);
    if (match) slugs.push(match[1]);
  }
  return slugs;
}

function extractDescription(content: string): string {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("> ")) {
      return trimmed.slice(2).replace(/^\*\*|^\*|\*\*$|\*$/g, "").trim();
    }
    if (
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed === "---" ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("::") ||
      trimmed.startsWith("- ")
    ) {
      continue;
    }
    return trimmed.length > 200 ? trimmed.slice(0, 200) + "..." : trimmed;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Session reader
// ---------------------------------------------------------------------------

function readSessions(personaSlug: string): DiscoverySession[] {
  const sessionDir = path.join(PERSONAS_DIR, personaSlug, "shadowing");
  if (!fs.existsSync(sessionDir)) return [];

  const files = fs
    .readdirSync(sessionDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  return files
    .map((file): DiscoverySession => {
      const raw = fs.readFileSync(path.join(sessionDir, file), "utf-8");
      const { data, content } = parseFrontmatter(raw);
      const slug = file.replace(/\.md$/, "");

      const isPlaceholder =
        slug.includes("placeholder") ||
        content.includes("No shadowing sessions recorded yet");

      let title = data.title || "";
      if (!title) {
        const headingMatch = content.match(/^#\s+(.+)/m);
        if (headingMatch) title = headingMatch[1].trim();
      }
      if (!title) title = slug.replace(/-/g, " ");

      return {
        slug,
        title,
        date: data.date || "",
        participant: data.participant || "",
        role: data.role || "",
        observer: data.observer || "",
        duration: data.duration || "",
        status: data.status || "",
        content: raw.startsWith("---") ? content : raw,
        isPlaceholder,
      };
    })
    .filter((s) => !s.isPlaceholder)
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return a.title.localeCompare(b.title);
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getPersonaBySlug(slug: string): Persona | null {
  const personas = getPersonas();
  return personas.find((p) => p.slug === slug) ?? null;
}

export function getPersonas(): Persona[] {
  if (!fs.existsSync(PERSONAS_DIR)) return [];

  const entries = fs
    .readdirSync(PERSONAS_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"),
    );

  return entries
    .map((dir): Persona | null => {
      const overviewPath = path.join(PERSONAS_DIR, dir.name, "1.overview.md");
      const slug = dir.name;

      if (!fs.existsSync(overviewPath)) return null;

      const raw = fs.readFileSync(overviewPath, "utf-8");
      const { data, content } = parseFrontmatter(raw);

      const bodyContent = raw.startsWith("---") ? content : raw;

      // Title from # heading or frontmatter
      let title = data.title || "";
      if (!title) {
        const headingMatch = bodyContent.match(/^#\s+(.+)/m);
        if (headingMatch) title = headingMatch[1].trim();
      }
      if (!title) title = slug.replace(/-/g, " ");

      return {
        slug,
        title,
        description: extractDescription(bodyContent),
        group: GROUP_MAP[slug] ?? "secondary",
        goals: extractSection(bodyContent, "Goals"),
        painPoints: extractSection(bodyContent, "Pain Points"),
        relatedSlugs: extractRelatedSlugs(bodyContent),
        content: bodyContent,
        sessions: readSessions(slug),
      };
    })
    .filter((p): p is Persona => p !== null)
    .sort((a, b) => {
      const groupDiff =
        GROUP_META[a.group].order - GROUP_META[b.group].order;
      if (groupDiff !== 0) return groupDiff;
      return a.title.localeCompare(b.title);
    });
}
