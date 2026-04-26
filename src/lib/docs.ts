import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DocPage = {
  /** URL slug segments: e.g. ["architecture", "overview"] */
  slugParts: string[];
  title: string;
  description: string;
  content: string;
  order: number;
  /** Relative path from project root, e.g. "content/architecture/0.overview.md" */
  filePath: string;
  /** Frontmatter status (initiatives) */
  status?: string;
};

export type NavNode = {
  slug: string;
  title: string;
  order: number;
  /** If this node is a leaf page */
  page?: DocPage;
  /** Child nodes (subdirectories / sub-sections) */
  children: NavNode[];
  /** meta.yaml data if present */
  meta?: Record<string, unknown>;
};

/** Flat category used by sidebar for grouping top-level sections */
export type DocCategory = {
  slug: string;
  title: string;
  sections: DocSection[];
};

export type DocSection = {
  slug: string;
  title: string;
  pages: DocPage[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const CONTENT_ROOT = path.join(process.cwd(), "content");

function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  content: string;
} {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w[\w_-]*)\s*:\s*(.+)/);
    if (m) {
      data[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }

  return { data, content: match[2].trim() };
}

/** Strip numeric prefix and extension from filename → URL slug */
function fileToSlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/^\d+[.\-]?/, "");
}

function titleFromFilename(filename: string): string {
  return fileToSlug(filename)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function orderFromFilename(filename: string): number {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

/** Strip numeric prefix from directory name → URL slug */
function dirToSlug(dirname: string): string {
  return dirname.replace(/^\d+[.\-]?/, "");
}

function loadMetaYaml(dirPath: string): Record<string, unknown> | undefined {
  const metaPath = path.join(dirPath, "meta.yaml");
  if (!fs.existsSync(metaPath)) return undefined;
  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return yaml.load(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/*  Recursive tree builder                                            */
/* ------------------------------------------------------------------ */

/**
 * Recursively build a navigation tree from the filesystem.
 * - `.md` files become leaf pages
 * - Subdirectories become branch nodes
 * - `meta.yaml` provides directory-level metadata
 * - `index.md` or files starting with `0.`/`00.` are treated as directory index
 */
function buildNavTree(
  dirPath: string,
  slugPrefix: string[] = [],
): NavNode[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: NavNode[] = [];

  // Process .md files in this directory
  const mdFiles = entries.filter(
    (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md"
  );

  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(dirPath, file.name), "utf-8");
    const { data, content } = parseFrontmatter(raw);
    const slug = fileToSlug(file.name);
    const slugParts = [...slugPrefix, slug];
    const order = data.order
      ? parseInt(data.order, 10)
      : (data.sidebar_order ? parseInt(data.sidebar_order, 10) : orderFromFilename(file.name));

    nodes.push({
      slug,
      title: data.sidebar_label || data.title || titleFromFilename(file.name),
      order,
      page: {
        slugParts,
        title: data.title || titleFromFilename(file.name),
        description: data.description || "",
        content,
        order,
        filePath: path.relative(process.cwd(), path.join(dirPath, file.name)),
        status: data.status,
      },
      children: [],
    });
  }

  // Directories excluded from the sidebar at the top level of content/
  const SIDEBAR_EXCLUDED = new Set(["initiatives"]);

  // Process subdirectories
  const subDirs = entries.filter(
    (e) =>
      e.isDirectory() &&
      !e.name.startsWith(".") &&
      e.name !== "node_modules" &&
      !(slugPrefix.length === 0 && SIDEBAR_EXCLUDED.has(e.name))
  );

  for (const dir of subDirs) {
    const dirSlug = dirToSlug(dir.name);
    const subDirPath = path.join(dirPath, dir.name);
    const subMeta = loadMetaYaml(subDirPath);
    const children = buildNavTree(subDirPath, [...slugPrefix, dirSlug]);

    // Check for index page in subdirectory
    const subIndexPath = path.join(subDirPath, "index.md");
    let indexPage: DocPage | undefined;
    if (fs.existsSync(subIndexPath)) {
      const raw = fs.readFileSync(subIndexPath, "utf-8");
      const { data, content } = parseFrontmatter(raw);
      indexPage = {
        slugParts: [...slugPrefix, dirSlug],
        title: data.title || (subMeta?.title as string) || titleFromFilename(dir.name),
        description: data.description || "",
        content,
        order: 0,
        filePath: path.relative(process.cwd(), subIndexPath),
        status: data.status,
      };
    }

    const dirTitle = (subMeta?.title as string) || titleFromFilename(dir.name);
    const dirOrder = orderFromFilename(dir.name);

    nodes.push({
      slug: dirSlug,
      title: dirTitle,
      order: dirOrder,
      page: indexPage,
      children: children.sort((a, b) => a.order - b.order),
      meta: subMeta,
    });
  }

  // If current dir has an index.md, we note it but don't add it as a separate node
  // (it becomes the parent directory's page)

  return nodes.sort((a, b) => a.order - b.order);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

let _navTreeCache: NavNode[] | null = null;

/** Get the full navigation tree (cached per process) */
export function getNavTree(): NavNode[] {
  if (_navTreeCache) return _navTreeCache;
  _navTreeCache = buildNavTree(CONTENT_ROOT);
  return _navTreeCache;
}

/** Clear the cached nav tree (useful for dev mode) */
export function clearNavTreeCache(): void {
  _navTreeCache = null;
}

/** Find a page by its slug parts */
export function findPageBySlug(slugParts: string[]): {
  page: DocPage;
  node: NavNode;
  breadcrumb: NavNode[];
} | undefined {
  const tree = getNavTree();
  const breadcrumb: NavNode[] = [];

  let current: NavNode[] = tree;
  let foundNode: NavNode | undefined;

  for (let i = 0; i < slugParts.length; i++) {
    const slug = slugParts[i];
    const node = current.find((n) => n.slug === slug);
    if (!node) return undefined;

    breadcrumb.push(node);

    if (i === slugParts.length - 1) {
      // Last segment — must be a page or a directory with an index page
      if (node.page) {
        foundNode = node;
      } else if (node.children.length > 0) {
        // Directory without index — find first child page
        const firstChild = node.children.find((c) => c.page);
        if (firstChild) {
          foundNode = firstChild;
          breadcrumb.push(firstChild);
        }
      }
    } else {
      current = node.children;
    }
  }

  if (!foundNode?.page) return undefined;
  return { page: foundNode.page, node: foundNode, breadcrumb };
}

/** Get all pages as a flat list (for generateStaticParams) */
export function getAllPages(): DocPage[] {
  const pages: DocPage[] = [];

  function collect(nodes: NavNode[]): void {
    for (const node of nodes) {
      if (node.page) pages.push(node.page);
      collect(node.children);
    }
  }

  collect(getNavTree());
  return pages;
}

/** Get prev/next pages relative to the given slug parts */
export function getPrevNextPages(slugParts: string[]): {
  prev?: DocPage;
  next?: DocPage;
} {
  const allPages = getAllPages();
  const slugStr = slugParts.join("/");
  const index = allPages.findIndex((p) => p.slugParts.join("/") === slugStr);

  return {
    prev: index > 0 ? allPages[index - 1] : undefined,
    next: index < allPages.length - 1 ? allPages[index + 1] : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Table of Contents extraction                                      */
/* ------------------------------------------------------------------ */

export type TocHeading = {
  level: number;
  text: string;
  slug: string;
};

export function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const usedSlugs = new Set<string>();
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      let slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      // Deduplicate slugs to avoid React duplicate key warnings
      let suffix = 1;
      const baseSlug = slug;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix++}`;
      }
      usedSlugs.add(slug);
      headings.push({ level, text, slug });
    }
  }

  return headings;
}

/* ------------------------------------------------------------------ */
/*  Legacy API (backward compatibility)                               */
/* ------------------------------------------------------------------ */

/**
 * Convert the recursive nav tree into the flat DocCategory structure
 * used by the existing sidebar component.
 */
export function getDocCategories(): DocCategory[] {
  const tree = getNavTree();

  // Map top-level nodes to categories
  // Group into logical categories similar to the old hardcoded structure
  const categories: DocCategory[] = [];

  for (const node of tree) {
    const sections: DocSection[] = [];

    if (node.children.length > 0) {
      for (const child of node.children) {
        const pages = collectPagesFlat(child);
        if (pages.length > 0) {
          sections.push({
            slug: child.slug,
            title: child.title,
            pages,
          });
        }
      }

      // Also include top-level pages of this node as a section
      const topPages = node.children
        .filter((c) => c.page && c.children.length === 0)
        .map((c) => c.page!);
      if (topPages.length > 0 && sections.length === 0) {
        sections.push({
          slug: node.slug,
          title: node.title,
          pages: topPages,
        });
      }
    }

    if (sections.length > 0) {
      categories.push({
        slug: node.slug,
        title: node.title,
        sections,
      });
    }
  }

  return categories;
}

function collectPagesFlat(node: NavNode): DocPage[] {
  const pages: DocPage[] = [];
  if (node.page) pages.push(node.page);
  for (const child of node.children) {
    pages.push(...collectPagesFlat(child));
  }
  return pages;
}

/**
 * Flat list of all sections across every category.
 */
export function getDocSections(): DocSection[] {
  return getDocCategories().flatMap((c) => c.sections);
}

/* ------------------------------------------------------------------ */
/*  Backward-compatible getDocPage                                    */
/* ------------------------------------------------------------------ */

export function getDocPage(
  sectionSlug: string,
  pageSlug: string
): { section: DocSection; page: DocPage; category: DocCategory } | undefined {
  const categories = getDocCategories();

  for (const category of categories) {
    const section = category.sections.find((s) => s.slug === sectionSlug);
    if (!section) continue;

    const page = section.pages.find(
      (p) => p.slugParts[p.slugParts.length - 1] === pageSlug
    );
    if (!page) continue;

    return { section, page, category };
  }

  return undefined;
}
