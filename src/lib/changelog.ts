import { getInitiatives } from "./initiatives";
import { getReleases } from "./releases";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export type ChangelogEntry = {
  id: string;
  type: "gate" | "epic-created" | "release" | "commit";
  title: string;
  description: string;
  date: string; // ISO date
  initiative?: string;
  epicSlug?: string;
  epicPrefix?: string;
  gate?: string;
  prUrl?: string;
  url?: string;
  // Release-specific
  releaseVersion?: string;
  releaseImpact?: string;
  // Commit-specific
  commitHash?: string;
  commitType?: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content/initiatives");

/**
 * Parse the `created` field from an epic meta.yaml.
 * The field isn't exposed by initiatives.ts, so we read it directly.
 */
function readEpicCreatedDate(
  initiativeSlug: string,
  epicSlug: string
): string | undefined {
  const metaPath = path.join(
    CONTENT_DIR,
    initiativeSlug,
    epicSlug,
    "meta.yaml"
  );
  if (!fs.existsSync(metaPath)) return undefined;
  const raw = fs.readFileSync(metaPath, "utf-8");
  const match = raw.match(/^created\s*:\s*(.+)/m);
  if (!match) return undefined;
  return match[1].replace(/^['"]|['"]$/g, "").trim();
}

const GATE_LABELS: Record<string, string> = {
  idea: "Idea Brief",
  spec: "Spec",
  design: "Design",
  dev: "Development",
  qa: "QA",
  release: "Release",
  plan: "Plan",
  deploy: "Deploy",
};

function humanGateName(gate: string): string {
  return GATE_LABELS[gate] ?? gate.charAt(0).toUpperCase() + gate.slice(1);
}

export function getChangelog(): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const initiatives = getInitiatives();

  for (const initiative of initiatives) {
    for (const epic of initiative.epics) {
      // Gate entries
      for (const [gateName, gate] of Object.entries(epic.gates)) {
        if (gate.passed && gate.date) {
          entries.push({
            id: `gate-${epic.slug}-${gateName}`,
            type: "gate",
            title: `${humanGateName(gateName)} gate passed`,
            description: gate.notes ?? "",
            date: gate.date,
            initiative: initiative.title,
            epicSlug: epic.slug,
            epicPrefix: epic.prefix,
            gate: gateName,
            prUrl: gate.pr,
          });
        }
      }

      // Epic created entries
      const created = readEpicCreatedDate(initiative.slug, epic.slug);
      if (created) {
        entries.push({
          id: `epic-created-${epic.slug}`,
          type: "epic-created",
          title: epic.title,
          description: epic.summary ?? `New epic under ${initiative.title}`,
          date: created,
          initiative: initiative.title,
          epicSlug: epic.slug,
          epicPrefix: epic.prefix,
        });
      }
    }
  }

  // Release entries
  const releases = getReleases();
  for (const release of releases) {
    if (release.date) {
      entries.push({
        id: `release-${release.slug}`,
        type: "release",
        title: release.title,
        description: release.description,
        date: release.date,
        releaseVersion: release.version,
        releaseImpact: release.impact,
        url: `/releases`,
      });
    }
  }

  // Git commit entries (content changes only)
  const commits = getContentCommits();
  for (const commit of commits) {
    entries.push(commit);
  }

  // Sort by date descending
  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return entries;
}

/** Extract git commits touching content/ as changelog entries */
function getContentCommits(): ChangelogEntry[] {
  try {
    const output = execSync(
      'git log --format="%H|%aI|%s" -- content/',
      { cwd: process.cwd(), encoding: "utf-8", timeout: 5000 }
    ).trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const pipeIdx = line.indexOf("|");
      const hash = line.slice(0, pipeIdx);
      const rest = line.slice(pipeIdx + 1);
      const pipeIdx2 = rest.indexOf("|");
      const dateStr = rest.slice(0, pipeIdx2);
      const message = rest.slice(pipeIdx2 + 1);

      // Extract conventional commit type
      const typeMatch = message.match(/^(docs|feat|fix|chore|refactor):\s*/i);
      const cleanMessage = typeMatch
        ? message.slice(typeMatch[0].length)
        : message;
      const commitType = typeMatch ? typeMatch[1].toLowerCase() : undefined;

      return {
        id: `commit-${hash.slice(0, 8)}`,
        type: "commit" as const,
        title: cleanMessage,
        description: commitType
          ? `${commitType} commit`
          : "content change",
        date: dateStr,
        commitHash: hash,
        commitType,
      };
    });
  } catch {
    return [];
  }
}
