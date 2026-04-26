import fs from "fs";
import path from "path";
import type { Initiative, Epic } from "@/lib/initiatives";

/* ── Types ── */

export type GateCheck = {
  item: string;
  why: string;
  how?: string;
  passCriteria?: string;
};

export type GateSection = {
  title: string;
  checks: GateCheck[];
  isMobile?: boolean;
};

export type Gate = {
  number: number;
  id: string;
  title: string;
  question: string;
  linearTransition: string;
  owner: string;
  skill?: string;
  failedAdvice: string;
  sections: GateSection[];
};

/* ── Gate definitions (parsed from quality-gates.md) ── */

const GATES_MD_PATH = path.join(
  process.cwd(),
  "content/ways-of-working/7.spec-driven-development/10-quality-gates.md"
);

/**
 * Parse a markdown table into an array of row objects.
 * Supports 2-column (What's Checked | Why) and 3-column (What's Checked | How | Pass Criteria) tables.
 */
function parseTable(
  lines: string[],
  startIdx: number
): { checks: GateCheck[]; endIdx: number } {
  const checks: GateCheck[] = [];
  let i = startIdx;

  // Find the header row
  while (i < lines.length && !lines[i].startsWith("|")) i++;
  if (i >= lines.length) return { checks, endIdx: i };

  const headerLine = lines[i];
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip separator row
  i++;
  if (i < lines.length && lines[i].startsWith("|")) i++;

  // Parse data rows
  while (i < lines.length && lines[i].startsWith("|")) {
    const cells = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cells.length >= 2) {
      const check: GateCheck = {
        item: cells[0],
        why: cells[1],
      };

      // 3-column table (Gate 4 Code Quality has How + Pass Criteria)
      if (headers.length >= 3 && cells.length >= 3) {
        check.how = cells[1];
        check.passCriteria = cells[2];
        check.why = cells[0]; // In 3-col tables, first col is the item description
      }

      checks.push(check);
    }
    i++;
  }

  return { checks, endIdx: i };
}

/**
 * Parse the quality-gates.md file and return structured gate data.
 */
export function getGates(): Gate[] {
  if (!fs.existsSync(GATES_MD_PATH)) return [];

  const content = fs.readFileSync(GATES_MD_PATH, "utf-8");
  const lines = content.split("\n");

  const gates: Gate[] = [];

  // Gate metadata — extracted from the markdown
  const gateMeta: Array<{
    number: number;
    id: string;
    title: string;
    heading: string;
  }> = [
    { number: 0, id: "idea", title: "Idea", heading: "## Gate 0: Idea" },
    { number: 1, id: "spec", title: "Spec", heading: "## Gate 1: Spec" },
    { number: 2, id: "design", title: "Design", heading: "## Gate 2: Design" },
    {
      number: 3,
      id: "architecture",
      title: "Architecture",
      heading: "## Gate 3: Architecture",
    },
    {
      number: 4,
      id: "code-quality",
      title: "Code Quality",
      heading: "## Gate 4: Code Quality",
    },
    { number: 5, id: "qa", title: "QA", heading: "## Gate 5: QA" },
    {
      number: 6,
      id: "release",
      title: "Release",
      heading: "## Gate 6: Release",
    },
  ];

  for (const meta of gateMeta) {
    const gateStartIdx = lines.findIndex((l) => l.startsWith(meta.heading));
    if (gateStartIdx === -1) continue;

    // Find the end of this gate section (next ## heading or end of file)
    let gateEndIdx = lines.findIndex(
      (l, idx) =>
        idx > gateStartIdx && l.startsWith("## ") && !l.startsWith("###")
    );
    if (gateEndIdx === -1) gateEndIdx = lines.length;

    const gateLines = lines.slice(gateStartIdx, gateEndIdx);
    const gateText = gateLines.join("\n");

    // Extract question
    const questionMatch = gateText.match(
      /\*\*Question\*\*:\s*"([^"]+)"/
    );
    const question = questionMatch ? questionMatch[1] : "";

    // Extract Linear transition
    const linearMatch = gateText.match(
      /\*\*Linear\*\*:\s*(.+?)(?:\s*\||\n)/
    );
    const linearTransition = linearMatch
      ? linearMatch[1].trim()
      : "";

    // Extract owner
    const ownerMatch = gateText.match(/\*\*Owner\*\*:\s*(.+)/);
    const owner = ownerMatch ? ownerMatch[1].trim() : "";

    // Extract skill(s)
    const skillMatch = gateText.match(
      /\*\*Skills?\*\*:\s*`([^`]+)`/
    );
    const skillLineMatch = gateText.match(
      /\*\*Skill\*\*:\s*`([^`]+)`/
    );
    const skill = skillMatch
      ? skillMatch[1]
      : skillLineMatch
        ? skillLineMatch[1]
        : undefined;

    // Extract failed advice
    const failedMatch = gateText.match(/\*\*Failed\?\*\*\s*(.+)/);
    const failedAdvice = failedMatch ? failedMatch[1].trim() : "";

    // Extract sections (### headings within this gate)
    const sections: GateSection[] = [];
    let i = 0;

    while (i < gateLines.length) {
      if (gateLines[i].startsWith("### ")) {
        const sectionTitle = gateLines[i].replace("### ", "").trim();
        const isMobile = sectionTitle.toLowerCase().includes("mobile");
        i++;

        // Find the table for this section
        const tableResult = parseTable(gateLines, i);
        if (tableResult.checks.length > 0) {
          sections.push({
            title: sectionTitle,
            checks: tableResult.checks,
            isMobile: isMobile || undefined,
          });
          i = tableResult.endIdx;
        }
      } else {
        // Check for a table directly under the gate heading (no ### subsection)
        // e.g., Gate 2 Design has a table right after the description paragraph
        if (
          gateLines[i].startsWith("| ") &&
          sections.length === 0 &&
          !gateLines[i].includes("---")
        ) {
          // Check if previous non-empty line is NOT a ### heading
          let prevIdx = i - 1;
          while (prevIdx >= 0 && gateLines[prevIdx].trim() === "") prevIdx--;
          if (prevIdx >= 0 && !gateLines[prevIdx].startsWith("###")) {
            const tableResult = parseTable(gateLines, i);
            if (tableResult.checks.length > 0) {
              sections.push({
                title: "Checklist",
                checks: tableResult.checks,
              });
              i = tableResult.endIdx;
              continue;
            }
          }
        }
        i++;
      }
    }

    gates.push({
      number: meta.number,
      id: meta.id,
      title: meta.title,
      question,
      linearTransition,
      owner,
      skill,
      failedAdvice,
      sections,
    });
  }

  return gates;
}

/* ── Epic distribution across gates ── */

const GATE_ORDER = ["idea", "spec", "design", "dev", "qa"] as const;


function getLatestGateColumn(epic: Epic): string {
  const isReleased = [
    "release",
    "active",
    "completed",
    "ready for implementation",
  ].includes(epic.status.toLowerCase());
  if (isReleased) return "release";

  // Walk gates in reverse to find the latest passed gate
  for (let i = GATE_ORDER.length - 1; i >= 0; i--) {
    if (epic.gates[GATE_ORDER[i]]?.passed) return GATE_ORDER[i];
  }

  return "backlog";
}

/**
 * Map the column identifier to a gate ID used in the Gates Explorer.
 */
function columnToGateId(col: string): string {
  switch (col) {
    case "backlog":
      return "backlog";
    case "idea":
      return "idea";
    case "spec":
      return "spec";
    case "design":
      return "design";
    case "dev":
      return "code-quality";
    case "qa":
      return "qa";
    case "release":
      return "release";
    default:
      return "backlog";
  }
}

export type FlatEpic = Epic & {
  initiativeTitle: string;
  initiativeSlug: string;
};

/**
 * Distribute epics across gates based on their latest passed gate.
 * Returns a Record keyed by gate ID (idea, spec, design, architecture, code-quality, qa, release)
 * plus "backlog" for epics that haven't passed any gate.
 */
export function getEpicsByGate(
  initiatives: Initiative[]
): Record<string, FlatEpic[]> {
  const result: Record<string, FlatEpic[]> = {
    backlog: [],
    idea: [],
    spec: [],
    design: [],
    architecture: [],
    "code-quality": [],
    qa: [],
    release: [],
  };

  for (const init of initiatives) {
    for (const epic of init.epics) {
      const col = getLatestGateColumn(epic);
      const gateId = columnToGateId(col);
      const flatEpic: FlatEpic = {
        ...epic,
        initiativeTitle: init.title,
        initiativeSlug: init.slug,
      };
      if (result[gateId]) {
        result[gateId].push(flatEpic);
      } else {
        result.backlog.push(flatEpic);
      }
    }
  }

  return result;
}
