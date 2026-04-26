import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DomainTopic = {
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
};

export type TopicCategory = {
  id: string;
  label: string;
  icon: string;
  topics: DomainTopic[];
};

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  domains: { label: "Product Domains", icon: "Layers" },
  concepts: { label: "Foundational Concepts", icon: "Lightbulb" },
  personas: { label: "Personas", icon: "Users" },
  integrations: { label: "Integrations", icon: "Plug" },
  industry: { label: "Industry & Regulatory", icon: "Scale" },
};

const CONTEXT_DIR = path.join(process.cwd(), "content/context");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Extract a short description from either frontmatter `description` field,
 * a blockquote line (`> ...`), or the first non-empty paragraph of content.
 */
function extractDescription(
  frontmatter: Record<string, string>,
  content: string,
): string {
  if (frontmatter.description) {
    return frontmatter.description;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Blockquote (common pattern in persona overview files)
    if (trimmed.startsWith("> ")) {
      return trimmed.slice(2).replace(/^\*\*|^\*|\*\*$|\*$/g, "").trim();
    }

    // Skip headings, horizontal rules, empty lines
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

    // Use first real paragraph line as description
    return trimmed.length > 200 ? trimmed.slice(0, 200) + "..." : trimmed;
  }

  return "";
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

// ---------------------------------------------------------------------------
// Per-category readers
// ---------------------------------------------------------------------------

function readMarkdownDir(
  dirPath: string,
  category: string,
): DomainTopic[] {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs
    .readdirSync(dirPath)
    .filter(
      (f) =>
        f.endsWith(".md") &&
        !f.startsWith("_") &&
        f !== "index.md",
    );

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
    const { data, content } = parseFrontmatter(raw);
    const slug = slugFromFilename(file);

    return {
      slug,
      title: data.title || slug.replace(/-/g, " "),
      description: extractDescription(data, content),
      category,
      content,
    };
  });
}

/**
 * Personas live in subdirectories. Each persona folder contains a
 * `1.overview.md` file that typically lacks YAML frontmatter but uses
 * `# Title` and `> description` patterns.
 */
function readPersonas(): DomainTopic[] {
  const personasDir = path.join(CONTEXT_DIR, "personas");
  if (!fs.existsSync(personasDir)) return [];

  const entries = fs
    .readdirSync(personasDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"));

  return entries.map((dir) => {
    const overviewPath = path.join(personasDir, dir.name, "1.overview.md");
    const slug = dir.name;

    if (!fs.existsSync(overviewPath)) {
      return {
        slug,
        title: slug.replace(/-/g, " "),
        description: "",
        category: "personas",
        content: "",
      };
    }

    const raw = fs.readFileSync(overviewPath, "utf-8");
    const { data, content } = parseFrontmatter(raw);

    // Persona overview files often use `# Title` instead of frontmatter title
    let title = data.title || "";
    if (!title) {
      const headingMatch = content.match(/^#\s+(.+)/m);
      if (headingMatch) {
        title = headingMatch[1].trim();
      }
    }
    if (!title) {
      title = slug.replace(/-/g, " ");
    }

    // For content, use the raw body (after frontmatter if any)
    const bodyContent = raw.startsWith("---")
      ? content
      : raw;

    return {
      slug,
      title,
      description: extractDescription(data, bodyContent),
      category: "personas",
      content: bodyContent,
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDomainTopics(): TopicCategory[] {
  const categories: TopicCategory[] = [];

  // Domains
  const domainTopics = readMarkdownDir(
    path.join(CONTEXT_DIR, "domains"),
    "domains",
  );
  categories.push({
    id: "domains",
    ...CATEGORY_META.domains,
    topics: domainTopics.sort((a, b) => a.title.localeCompare(b.title)),
  });

  // Concepts
  const conceptTopics = readMarkdownDir(
    path.join(CONTEXT_DIR, "concepts"),
    "concepts",
  );
  categories.push({
    id: "concepts",
    ...CATEGORY_META.concepts,
    topics: conceptTopics.sort((a, b) => a.title.localeCompare(b.title)),
  });

  // Personas
  const personaTopics = readPersonas();
  categories.push({
    id: "personas",
    ...CATEGORY_META.personas,
    topics: personaTopics.sort((a, b) => a.title.localeCompare(b.title)),
  });

  // Integrations
  const integrationTopics = readMarkdownDir(
    path.join(CONTEXT_DIR, "integrations"),
    "integrations",
  );
  categories.push({
    id: "integrations",
    ...CATEGORY_META.integrations,
    topics: integrationTopics.sort((a, b) => a.title.localeCompare(b.title)),
  });

  // Industry
  const industryTopics = readMarkdownDir(
    path.join(CONTEXT_DIR, "industry"),
    "industry",
  );
  categories.push({
    id: "industry",
    ...CATEGORY_META.industry,
    topics: industryTopics.sort((a, b) => a.title.localeCompare(b.title)),
  });

  return categories;
}
