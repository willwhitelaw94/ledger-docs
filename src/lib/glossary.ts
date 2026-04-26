import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlossaryTerm = {
  term: string;
  acronym?: string;
  definition: string;
  section: string;
  category: string;
};

export type GlossaryCategory = {
  id: string;
  label: string;
  terms: GlossaryTerm[];
};

// ---------------------------------------------------------------------------
// File metadata
// ---------------------------------------------------------------------------

const FILES: { file: string; id: string; label: string }[] = [
  { file: "01-support-at-home.md", id: "support-at-home", label: "Support at Home" },
  { file: "02-internal-development.md", id: "internal-dev", label: "Internal Dev" },
  { file: "03-self-made-development.md", id: "self-made", label: "Self-Made" },
  { file: "04-trilogy-terminology.md", id: "trilogy", label: "Trilogy" },
  { file: "05-product-technical.md", id: "product-technical", label: "Product & Technical" },
];

const GLOSSARY_DIR = path.join(process.cwd(), "content/strategy/glossary");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) return raw;
  return raw.slice(endIndex + 4).trim();
}

/**
 * Parse a single glossary markdown file into GlossaryTerm[].
 *
 * Format per file:
 *   ## Section Heading
 *   **TERM** — Acronym expansion or short label
 *   Longer definition paragraph(s).
 *
 * Some entries are single-line:
 *   **TERM** — Full definition on one line.
 *
 * Some entries have an acronym pattern:
 *   **SAH** — Support at Home
 *   The Australian government's aged care program...
 */
function parseFile(raw: string, categoryLabel: string): GlossaryTerm[] {
  const body = stripFrontmatter(raw);
  const lines = body.split("\n");
  const terms: GlossaryTerm[] = [];

  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Detect term entries: **TERM** — ...
    // Also handles **TERM** (Parenthetical) — ...
    const termMatch = line.match(
      /^\*\*(.+?)\*\*\s*(?:\(([^)]+)\)\s*)?[—–-]\s*(.+)/,
    );
    if (!termMatch) continue;

    const termName = termMatch[1].trim();
    const parenthetical = termMatch[2]?.trim();
    const afterDash = termMatch[3].trim();

    // Collect continuation lines (non-empty, non-header, non-term, non-hr)
    const continuationLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const trimmed = next.trim();

      // Stop at next term, section, horizontal rule, or blank line followed by non-continuation
      if (trimmed === "" || trimmed === "---" || trimmed.startsWith("##") || trimmed.match(/^\*\*(.+?)\*\*\s*[—–-]/)) {
        break;
      }

      // Sub-items (e.g. "- **SERG-0001** — ...") are continuation
      continuationLines.push(trimmed);
      j++;
    }

    // Determine if the afterDash portion is an acronym expansion or inline definition.
    //
    // Heuristic: if there are continuation lines AND afterDash is short (< 60 chars),
    // doesn't end with a period or colon, treat afterDash as an acronym/short label.
    // Text ending with ":" introduces a list and is NOT an acronym.
    let acronym: string | undefined;
    let definition: string;

    const looksLikeAcronymExpansion =
      continuationLines.length > 0 &&
      afterDash.length < 60 &&
      !afterDash.endsWith(".") &&
      !afterDash.endsWith(":");

    if (looksLikeAcronymExpansion) {
      acronym = afterDash;
      definition = continuationLines.join("\n");
    } else if (continuationLines.length > 0) {
      definition = [afterDash, ...continuationLines].join("\n");
    } else {
      definition = afterDash;
    }

    // If parenthetical was present (e.g. "Self-Managed Plus"), use it as the acronym hint
    if (parenthetical) {
      acronym = parenthetical;
    }

    // If the term itself looks like an acronym (all caps, 2-6 chars),
    // set acronym = termName and merge expansion into definition.
    if (/^[A-Z][A-Z0-9+&/]{1,10}$/.test(termName) && looksLikeAcronymExpansion) {
      acronym = termName;
      definition = [afterDash, ...continuationLines].join("\n");
    }

    terms.push({
      term: termName,
      acronym: acronym || undefined,
      definition,
      section: currentSection,
      category: categoryLabel,
    });
  }

  return terms;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getGlossaryTerms(): GlossaryCategory[] {
  return FILES.map(({ file, id, label }) => {
    const filePath = path.join(GLOSSARY_DIR, file);
    if (!fs.existsSync(filePath)) {
      return { id, label, terms: [] };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const terms = parseFile(raw, label);

    // Sort alphabetically by term name
    terms.sort((a, b) => a.term.localeCompare(b.term));

    return { id, label, terms };
  });
}
