import fs from "fs";
import path from "path";
import type { Domain, DomainCluster, DomainData } from "./domain-types";

export type { Domain, DomainCluster, DomainData };

// ---------------------------------------------------------------------------
// Cluster assignments
// ---------------------------------------------------------------------------

const CLUSTER_MAP: Record<string, string> = {
  "care-plan": "clinical",
  assessments: "clinical",
  "clinical-domain-map": "clinical",
  "incident-management": "clinical",
  "risk-management": "clinical",
  "management-plans": "clinical",
  complaints: "clinical",

  budget: "financial",
  claims: "financial",
  collections: "financial",
  "bill-processing": "financial",
  "chart-of-accounts": "financial",
  fees: "financial",
  contributions: "financial",
  reimbursements: "financial",
  statements: "financial",
  "proda-claiming-process": "financial",
  utilisation: "financial",

  "care-management-activities": "operations",
  calls: "operations",
  "activity-log": "operations",
  "task-management": "operations",
  "coordinator-portal": "operations",
  "process-maps": "operations",
  "service-confirmation": "operations",
  notes: "operations",

  authentication: "identity",
  "teams-roles": "identity",
  onboarding: "identity",
  "package-contacts": "identity",
  "lead-management": "identity",
  termination: "identity",

  "ai-services": "ai",
  "feature-flags": "platform",
  documents: "platform",
  emails: "platform",
  notifications: "platform",
  mobile: "platform",
  "home-care-agreement": "compliance",
  ndis: "compliance",
  supplier: "operations",
};

const CLUSTER_META: Record<string, string> = {
  clinical: "Clinical",
  financial: "Financial",
  operations: "Operations",
  identity: "Identity & Access",
  ai: "AI & Intelligence",
  platform: "Platform",
  compliance: "Compliance & Regulatory",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAINS_DIR = path.join(process.cwd(), "content/context/domains");

const EXCLUDE_FILES = new Set(["index.md", "_template.md"]);

function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  content: string;
} {
  const data: Record<string, string> = {};

  if (!raw.startsWith("---")) {
    return { data, content: raw };
  }

  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { data, content: raw };
  }

  const frontmatterBlock = raw.slice(3, endIndex);
  const content = raw.slice(endIndex + 4).trim();

  for (const line of frontmatterBlock.split("\n")) {
    const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)/);
    if (match) {
      data[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }

  return { data, content };
}

function extractDescription(
  frontmatter: Record<string, string>,
  content: string,
): string {
  if (frontmatter.description) {
    return frontmatter.description;
  }
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
      trimmed.startsWith("::")
    ) {
      continue;
    }
    return trimmed.length > 200 ? trimmed.slice(0, 200) + "..." : trimmed;
  }
  return "";
}

/**
 * Extract related domain slugs from a file's content by looking at:
 * 1. "## Related" sections with markdown links containing domain slugs
 * 2. Inline links to `/features/domains/xxx` or `./xxx.md`
 */
function extractRelatedDomains(
  content: string,
  allSlugs: Set<string>,
): string[] {
  const related = new Set<string>();

  // Pattern 1: Links like [Name](/features/domains/slug) or [Name](./slug.md)
  const linkRegex =
    /\[.*?\]\((?:\/features\/domains\/|\.\/)([\w-]+?)(?:\.md)?\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const slug = match[1];
    if (allSlugs.has(slug)) {
      related.add(slug);
    }
  }

  // Pattern 2: Mentions in Related Domains section (plain text references)
  const relatedSection = content.match(
    /## Related.*?\n([\s\S]*?)(?=\n## |\n---\s*$|$)/,
  );
  if (relatedSection) {
    for (const slug of allSlugs) {
      // Check if the slug's title-like form appears in the related section
      const titleForm = slug.replace(/-/g, " ");
      if (relatedSection[1].toLowerCase().includes(titleForm)) {
        related.add(slug);
      }
    }
  }

  return Array.from(related);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDomains(): DomainData {
  if (!fs.existsSync(DOMAINS_DIR)) {
    return { domains: [], clusters: [] };
  }

  const files = fs
    .readdirSync(DOMAINS_DIR)
    .filter(
      (f) =>
        f.endsWith(".md") &&
        !f.startsWith("_") &&
        !EXCLUDE_FILES.has(f),
    );

  // First pass: collect all slugs
  const allSlugs = new Set(files.map((f) => f.replace(/\.md$/, "")));

  // Second pass: parse files
  const domains: Domain[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(DOMAINS_DIR, file), "utf-8");
    const { data, content } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, "");

    return {
      slug,
      title: data.title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: extractDescription(data, content),
      content,
      relatedDomains: extractRelatedDomains(content, allSlugs),
      cluster: CLUSTER_MAP[slug] || "operations",
    };
  });

  domains.sort((a, b) => a.title.localeCompare(b.title));

  // Build clusters
  const clusterMap: Record<string, Domain[]> = {};
  for (const d of domains) {
    if (!clusterMap[d.cluster]) clusterMap[d.cluster] = [];
    clusterMap[d.cluster].push(d);
  }

  const clusterOrder = [
    "clinical",
    "financial",
    "operations",
    "identity",
    "ai",
    "platform",
    "compliance",
  ];

  const clusters: DomainCluster[] = clusterOrder
    .filter((id) => clusterMap[id]?.length)
    .map((id) => ({
      id,
      label: CLUSTER_META[id] || id,
      domains: clusterMap[id],
    }));

  return { domains, clusters };
}
