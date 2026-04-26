import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const CONTENT_DIR = path.join(process.cwd(), "content/initiatives");

const KNOWN_FILES: Record<string, string> = {
  "idea-brief": "IDEA-BRIEF.md",
  spec: "spec.md",
  design: "design.md",
  plan: "plan.md",
  tasks: "tasks.md",
  index: "index.md",
};

export async function GET(request: NextRequest) {
  const initiative = request.nextUrl.searchParams.get("initiative");
  const epic = request.nextUrl.searchParams.get("epic");
  const artifact = request.nextUrl.searchParams.get("artifact");

  if (!initiative || !epic || !artifact) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Sanitize
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

  const epicDir = path.join(CONTENT_DIR, safe(initiative), safe(epic));
  if (!fs.existsSync(epicDir)) {
    return Response.json({ error: "Epic not found" }, { status: 404 });
  }

  // Try known file mapping first, then fallback to artifact.md
  const filename =
    KNOWN_FILES[artifact.toLowerCase()] || `${artifact}.md`;

  // Also try the uppercase variant for IDEA-BRIEF
  const candidates = [
    path.join(epicDir, filename),
    path.join(epicDir, filename.toLowerCase()),
    path.join(epicDir, `${artifact.toLowerCase()}.md`),
  ];

  let content: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, "utf-8");
      content = raw.replace(/^---[\s\S]*?---\s*/, "");
      break;
    }
  }

  if (content === null) {
    return Response.json({ error: "Artifact not found" }, { status: 404 });
  }

  return Response.json({ content });
}
