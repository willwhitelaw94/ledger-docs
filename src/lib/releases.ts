import fs from "fs";
import path from "path";

export type Release = {
  slug: string;
  title: string;
  description: string;
  date: string;
  releaseDate: string;
  version: string;
  impact: string;
  githubUrl: string;
  content: string;
};

const RELEASES_DIR = path.join(process.cwd(), "content/release/2.releases");

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

export function getReleases(): Release[] {
  if (!fs.existsSync(RELEASES_DIR)) return [];

  const files = fs
    .readdirSync(RELEASES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "index.md");

  const releases = files.map((file) => {
    const raw = fs.readFileSync(path.join(RELEASES_DIR, file), "utf-8");
    const { data, content } = parseFrontmatter(raw);

    // Strip the redundant inline HTML impact badge and extract the GitHub release URL.
    // The badge line looks like: <span ...>High Impact</span>&ensp;**GitHub Release:** [v2.0.151](https://...)
    // The impact badge is already rendered in the page header by ReleaseDetail.
    const badgeLineMatch = content.match(
      /^<span[^>]*>.*?<\/span>&ensp;\*\*GitHub Release:\*\*\s*\[.*?\]\((https?:\/\/[^)]+)\)/m
    );
    const githubUrl = badgeLineMatch ? badgeLineMatch[1] : "";
    const cleanContent = content.replace(
      /^<span[^>]*>.*?<\/span>&ensp;\*\*GitHub Release:\*\*.*$/m,
      ""
    ).trimStart();

    return {
      slug: file.replace(/\.md$/, ""),
      title: data.title || file,
      description: data.description || "",
      date: data.date || "",
      releaseDate: data.releaseDate || "",
      version: data.version || "",
      impact: data.impact || "low",
      githubUrl,
      content: cleanContent,
    };
  });

  // Sort by date descending (newest first), then by version as tiebreaker
  releases.sort((a, b) => {
    const dateA = a.date || "0000-00-00";
    const dateB = b.date || "0000-00-00";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.version.localeCompare(a.version);
  });

  return releases;
}
