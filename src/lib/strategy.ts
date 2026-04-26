import fs from "fs";
import path from "path";

export type DepartmentObjective = {
  department: string;
  owner: string;
  focus: string;
  targets: string;
};

export type CrossFunctionalPriority = {
  initiative: string;
  lead: string;
  supporting: string;
};

export type StrategicContext = {
  theme: string;
  departments: DepartmentObjective[];
  crossFunctional: CrossFunctionalPriority[];
};

const STRATEGY_PATH = path.join(
  process.cwd(),
  "content/strategy/5.Strategy/index.md"
);

function parseMarkdownTable<T extends Record<string, string>>(
  block: string,
  keys: (keyof T)[]
): T[] {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  // Need at least header + separator + 1 data row
  if (lines.length < 3) return [];

  // Skip header (index 0) and separator (index 1)
  return lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1) // drop leading/trailing empty from split
      .map((c) => c.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim()); // strip markdown links

    const obj = {} as Record<string, string>;
    keys.forEach((key, i) => {
      obj[key as string] = cells[i] ?? "";
    });
    return obj as T;
  });
}

export function getStrategicContext(): StrategicContext {
  if (!fs.existsSync(STRATEGY_PATH)) {
    return { theme: "", departments: [], crossFunctional: [] };
  }

  const raw = fs.readFileSync(STRATEGY_PATH, "utf-8");
  // Strip frontmatter
  const content = raw.replace(/^---[\s\S]*?---\s*/, "");

  // Extract theme: the bold text after "## FY26 Strategic Theme"
  const themeMatch = content.match(
    /## FY26 Strategic Theme\s+\*\*([^*]+)\*\*/
  );
  const theme = themeMatch ? themeMatch[1].trim() : "";

  // Extract department objectives table
  const deptSection = content.match(
    /## Department Objectives\s+([\s\S]*?)(?=\n---|\n## )/
  );
  const departments = deptSection
    ? parseMarkdownTable<DepartmentObjective>(deptSection[1], [
        "department",
        "owner",
        "focus",
        "targets",
      ])
    : [];

  // Extract cross-functional priorities table
  const crossSection = content.match(
    /## Cross-functional Priorities\s+([\s\S]*?)(?=\n---|\n## |$)/
  );

  let crossFunctional: CrossFunctionalPriority[] = [];
  if (crossSection) {
    crossFunctional = parseMarkdownTable<CrossFunctionalPriority>(
      crossSection[1],
      ["initiative", "lead", "supporting"]
    );
    // Clean bold markers from initiative names
    crossFunctional = crossFunctional.map((cf) => ({
      ...cf,
      initiative: cf.initiative.replace(/\*\*/g, ""),
    }));
  }

  return { theme, departments, crossFunctional };
}
