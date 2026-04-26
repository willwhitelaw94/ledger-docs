import fs from "fs";
import path from "path";
import { CATEGORY_META } from "./integration-types";
import type { Integration, IntegrationCategory } from "./integration-types";

export type { Integration, IntegrationCategory };
export { CATEGORY_META };

// ---------------------------------------------------------------------------
// Category assignments
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, IntegrationCategory> = {
  "zoho-crm": "crm",
  klaviyo: "crm",
  "myob-acumatica": "finance",
  myob: "finance",
  "ezy-collect": "finance",
  "nab-connect": "finance",
  twilio: "communication",
  intercom: "communication",
  workos: "auth",
  proda: "auth",
  "services-australia-api": "government",
  databricks: "data",
  "booking-system": "booking",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTEGRATIONS_DIR = path.join(
  process.cwd(),
  "content/context/integrations",
);

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

function extractBlockquote(content: string): string {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("> ")) {
      return trimmed.slice(2).replace(/^\*\*|^\*|\*\*$|\*$/g, "").trim();
    }
  }
  return "";
}

function extractTldrField(content: string, field: string): string {
  const pattern = new RegExp(
    `^\\s*-\\s*\\*\\*${field}\\*\\*:\\s*(.+)`,
    "m",
  );
  const match = pattern.exec(content);
  return match ? match[1].trim() : "";
}

function extractRelatedDomainSlugs(content: string): string[] {
  const slugs = new Set<string>();
  // Match links like [Name](/features/domains/slug) or [Name](../domains/slug.md)
  const linkRegex =
    /\[.*?\]\((?:\/features\/domains\/|\.\.\/domains\/)([\w-]+?)(?:\.md)?\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    slugs.add(match[1]);
  }
  return Array.from(slugs);
}

function extractStatusField(content: string, field: string): string {
  const statusMatch = content.match(/^##\s+Status\s*$/m);
  if (!statusMatch) return "";

  const afterStatus = content.slice(statusMatch.index! + statusMatch[0].length);
  const pattern = new RegExp(
    `^\\s*\\*\\*${field}\\*\\*:\\s*(.+)`,
    "m",
  );
  const match = pattern.exec(afterStatus);
  return match ? match[1].trim() : "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getIntegrations(): Integration[] {
  if (!fs.existsSync(INTEGRATIONS_DIR)) return [];

  const files = fs
    .readdirSync(INTEGRATIONS_DIR)
    .filter((f) => f.endsWith(".md") && f !== "index.md");

  return files
    .map((file): Integration | null => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(
        path.join(INTEGRATIONS_DIR, file),
        "utf-8",
      );
      const { data, content } = parseFrontmatter(raw);

      const title = data.title || slug.replace(/-/g, " ");
      const description =
        extractBlockquote(content) || data.description || "";

      return {
        slug,
        title,
        description,
        category: CATEGORY_MAP[slug] ?? "data",
        what: extractTldrField(content, "What"),
        who: extractTldrField(content, "Who"),
        keyFlow: extractTldrField(content, "Key flow"),
        maturity: extractStatusField(content, "Maturity"),
        pod: extractStatusField(content, "Pod"),
        relatedDomains: extractRelatedDomainSlugs(content),
      };
    })
    .filter((i): i is Integration => i !== null)
    .sort((a, b) => {
      const catDiff =
        CATEGORY_META[a.category].order - CATEGORY_META[b.category].order;
      if (catDiff !== 0) return catDiff;
      return a.title.localeCompare(b.title);
    });
}
