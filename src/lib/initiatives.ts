import fs from "fs";
import path from "path";

export type Gate = {
  passed: boolean;
  date?: string;
  notes?: string;
  pr?: string;
};

export type Epic = {
  slug: string;
  title: string;
  status: string;
  initiative: string;
  artifacts: string[];
  artifactContent: Record<string, string>;
  gates: Record<string, Gate>;
  summary?: string;
  prefix?: string;
  linearUrl?: string;
  bountyValue?: number;
  bountyClaimedBy?: string;
  bountyClaimedDate?: string;
  mockupUrl?: string;
  priority?: string;
  grade?: "A" | "AA" | "AAA";
  /** Local mockup HTML files in the mockups/ directory */
  mockups: { name: string; path: string; group?: string }[];
};

export type Initiative = {
  slug: string;
  title: string;
  status: string;
  description: string;
  owner?: string;
  epics: Epic[];
};

const CONTENT_DIR = path.join(process.cwd(), "content/initiatives");

function parseYamlSimple(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)/);
    if (match) {
      result[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }
  return result;
}

function parseGates(content: string): Record<string, Gate> {
  const gates: Record<string, Gate> = {};
  const gatesStart = content.indexOf("\ngates:");
  if (gatesStart === -1) return gates;

  const afterGates = content.slice(gatesStart + 7);
  const lines = afterGates.split("\n");

  let currentGate: string | null = null;
  let currentProps: Record<string, string> = {};

  for (const line of lines) {
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) break;

    const gateNameMatch = line.match(/^  (\w[\w-]*):\s*$/);
    if (gateNameMatch) {
      if (currentGate) {
        gates[currentGate] = {
          passed: currentProps.passed === "true",
          date: currentProps.date,
          notes: currentProps.notes,
          pr: currentProps.pr,
        };
      }
      currentGate = gateNameMatch[1];
      currentProps = {};
      continue;
    }

    const propMatch = line.match(/^    (\w[\w_-]*)\s*:\s*(.+)/);
    if (propMatch && currentGate) {
      currentProps[propMatch[1]] = propMatch[2]
        .replace(/^['"]|['"]$/g, "")
        .trim();
    }
  }

  if (currentGate) {
    gates[currentGate] = {
      passed: currentProps.passed === "true",
      date: currentProps.date,
      notes: currentProps.notes,
      pr: currentProps.pr,
    };
  }

  return gates;
}

function getArtifactsWithContent(epicDir: string): {
  artifacts: string[];
  artifactContent: Record<string, string>;
} {
  const artifacts: string[] = [];
  const artifactContent: Record<string, string> = {};
  const knownFiles = [
    "idea-brief.md",
    "IDEA-BRIEF.md",
    "spec.md",
    "design.md",
    "plan.md",
    "tasks.md",
    "index.md",
  ];
  const seen = new Set<string>();
  for (const file of knownFiles) {
    const filePath = path.join(epicDir, file);
    if (fs.existsSync(filePath)) {
      const normalized = file
        .replace(".md", "")
        .toLowerCase()
        .replace("idea-brief", "idea-brief");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        artifacts.push(normalized);
        const raw = fs.readFileSync(filePath, "utf-8");
        const stripped = raw.replace(/^---[\s\S]*?---\s*/, "");
        artifactContent[normalized] = stripped;
      }
    }
  }
  return { artifacts, artifactContent };
}

export function getInitiatives(): Initiative[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const dirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  return dirs
    .map((dir) => {
      const initDir = path.join(CONTENT_DIR, dir.name);
      const metaPath = path.join(initDir, "meta.yaml");

      let title = dir.name.replace(/-/g, " ");
      let initStatus = "";
      let description = "";
      let owner = "";

      if (fs.existsSync(metaPath)) {
        const meta = parseYamlSimple(fs.readFileSync(metaPath, "utf-8"));
        title = meta.title || title;
        initStatus = meta.status || "";
        description = meta.description || "";
        owner = meta.owner || "";
      }

      const epicDirs = fs
        .readdirSync(initDir, { withFileTypes: true })
        .filter(
          (d) =>
            d.isDirectory() &&
            !d.name.startsWith(".") &&
            !d.name.startsWith("_")
        );

      const epics: Epic[] = epicDirs
        .map((epicDir) => {
          const epicPath = path.join(initDir, epicDir.name);
          const epicMetaPath = path.join(epicPath, "meta.yaml");

          let epicTitle = epicDir.name.replace(/-/g, " ");
          let epicStatus = "backlog";
          let rawMeta = "";
          let meta: Record<string, string> = {};

          if (fs.existsSync(epicMetaPath)) {
            rawMeta = fs.readFileSync(epicMetaPath, "utf-8");
            meta = parseYamlSimple(rawMeta);
            epicTitle = meta.title || epicTitle;
            epicStatus = meta.status || epicStatus;
          }

          const { artifacts, artifactContent } =
            getArtifactsWithContent(epicPath);
          const gates = parseGates(rawMeta);

          // Detect local mockup HTML files (top-level + one level of subdirs)
          const mockupsDir = path.join(epicPath, "mockups");
          const mockups: { name: string; path: string; group?: string }[] = [];
          if (fs.existsSync(mockupsDir)) {
            // Top-level HTML files
            const topFiles = fs
              .readdirSync(mockupsDir)
              .filter((f) => f.endsWith(".html") && f !== "index.html")
              .sort();
            for (const file of topFiles) {
              const name = file
                .replace(/\.html$/, "")
                .replace(/^\d+-/, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              mockups.push({
                name,
                path: `${dir.name}/${epicDir.name}/${file}`,
              });
            }

            // Subdirectory HTML files (design/, challenge/student-*/, etc.)
            const subDirs = fs
              .readdirSync(mockupsDir, { withFileTypes: true })
              .filter((d) => d.isDirectory());
            for (const sub of subDirs) {
              const subPath = path.join(mockupsDir, sub.name);
              // Check for HTML files directly in this subdir
              const subFiles = fs
                .readdirSync(subPath)
                .filter((f) => f.endsWith(".html") && f !== "index.html")
                .sort();
              const groupName = sub.name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              for (const file of subFiles) {
                const name = file
                  .replace(/\.html$/, "")
                  .replace(/^\d+-/, "")
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                mockups.push({
                  name,
                  path: `${dir.name}/${epicDir.name}/${sub.name}/${file}`,
                  group: groupName,
                });
              }

              // One more level deep (e.g. challenge/student-1-linear/*.html)
              const deepDirs = fs
                .readdirSync(subPath, { withFileTypes: true })
                .filter((d) => d.isDirectory());
              for (const deep of deepDirs) {
                const deepPath = path.join(subPath, deep.name);
                const deepFiles = fs
                  .readdirSync(deepPath)
                  .filter((f) => f.endsWith(".html") && f !== "index.html")
                  .sort();
                const deepGroup = `${groupName} / ${deep.name
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}`;
                for (const file of deepFiles) {
                  const name = file
                    .replace(/\.html$/, "")
                    .replace(/^\d+-/, "")
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                  mockups.push({
                    name,
                    path: `${dir.name}/${epicDir.name}/${sub.name}/${deep.name}/${file}`,
                    group: deepGroup,
                  });
                }
              }
            }
          }

          return {
            slug: epicDir.name,
            title: epicTitle,
            status: epicStatus.toLowerCase(),
            initiative: dir.name,
            artifacts,
            artifactContent,
            gates,
            summary: meta.summary,
            prefix: meta.prefix,
            linearUrl: meta.linear_url,
            bountyValue: meta.bounty_value
              ? parseInt(meta.bounty_value, 10)
              : undefined,
            bountyClaimedBy: meta.bounty_claimed_by,
            bountyClaimedDate: meta.bounty_claimed_date,
            mockupUrl: meta.mockup_url,
            priority: meta.priority,
            grade: (["A", "AA", "AAA"].includes(meta.grade) ? meta.grade : undefined) as Epic["grade"],
            mockups,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));

      return {
        slug: dir.name,
        title,
        status: initStatus,
        description,
        owner: owner || undefined,
        epics,
      };
    })
    .filter((i) => i.epics.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}
