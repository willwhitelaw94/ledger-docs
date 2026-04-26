import fs from "fs";
import path from "path";
import { marked } from "marked";
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

/* ── Helpers ── */

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

function parseMetaYaml(
  epicDir: string
): Record<string, string> {
  const metaPath = path.join(epicDir, "meta.yaml");
  if (!fs.existsSync(metaPath)) return {};
  const raw = fs.readFileSync(metaPath, "utf-8");
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)/);
    if (match) {
      result[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }
  return result;
}

function resolveArtifactContent(
  epicDir: string,
  artifact: string
): string | null {
  const filename =
    KNOWN_FILES[artifact.toLowerCase()] || `${artifact}.md`;

  const candidates = [
    path.join(epicDir, filename),
    path.join(epicDir, filename.toLowerCase()),
    path.join(epicDir, `${artifact.toLowerCase()}.md`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, "utf-8");
      // Strip YAML frontmatter
      return raw.replace(/^---[\s\S]*?---\s*/, "");
    }
  }
  return null;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/* ── HTML Templates ── */

function buildIdeaBriefHtml(
  html: string,
  meta: { prefix: string; title: string; initiative: string; created: string }
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.prefix} — ${meta.title} — Idea Brief</title>
<style>
  @page {
    margin: 1.5cm;
    size: A4;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1a1a2e;
    background: #fff;
    max-width: 210mm;
    margin: 0 auto;
    padding: 1.5cm;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e2e8f0;
  }
  .prefix-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #e0e7ff;
    color: #3730a3;
    font-weight: 700;
    font-size: 11pt;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .header-text { flex: 1; }
  .header-text h1 {
    font-size: 14pt;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
    line-height: 1.2;
  }
  .header-meta {
    font-size: 9pt;
    color: #64748b;
    margin-top: 2px;
  }

  /* ── Content ── */
  h2 {
    font-size: 11pt;
    font-weight: 700;
    color: #1e293b;
    margin: 14px 0 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #f1f5f9;
  }
  h3 {
    font-size: 10pt;
    font-weight: 600;
    color: #334155;
    margin: 10px 0 4px;
  }
  p {
    margin: 4px 0;
    color: #334155;
  }
  ul, ol {
    margin: 4px 0 4px 18px;
    color: #334155;
  }
  li { margin: 2px 0; }
  strong { color: #1a1a2e; }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 10px 0;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin: 6px 0;
  }
  th, td {
    padding: 4px 8px;
    text-align: left;
    border: 1px solid #e2e8f0;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #1e293b;
  }
  tr:nth-child(even) td { background: #fafbfc; }

  /* ── Code blocks ── */
  code {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 8px 10px;
    overflow-x: auto;
    margin: 6px 0;
    font-size: 8.5pt;
    line-height: 1.4;
  }
  pre code {
    background: none;
    padding: 0;
  }

  /* ── Checkboxes ── */
  input[type="checkbox"] {
    margin-right: 4px;
  }

  /* ── Two-column layout for compact sections ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 8px 0;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 8pt;
    color: #94a3b8;
  }

  /* ── Print ── */
  @media print {
    body {
      padding: 0;
      font-size: 10pt;
    }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; }
  }
</style>
</head>
<body>

<div class="header">
  <span class="prefix-badge">${meta.prefix}</span>
  <div class="header-text">
    <h1>${meta.title}</h1>
    <div class="header-meta">${meta.initiative.replace(/-/g, " ")} &middot; Created: ${meta.created}</div>
  </div>
</div>

<div class="content">
${html}
</div>

<div class="footer">
  Generated from SDD &mdash; ${today()}
</div>

</body>
</html>`;
}

function buildStandardHtml(
  html: string,
  meta: {
    prefix: string;
    title: string;
    initiative: string;
    artifact: string;
    created: string;
  }
): string {
  const artifactLabel = meta.artifact.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.prefix} — ${meta.title} — ${artifactLabel}</title>
<style>
  @page {
    margin: 2cm;
    size: A4;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a2e;
    background: #fff;
    max-width: 210mm;
    margin: 0 auto;
    padding: 2cm;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e2e8f0;
  }
  .prefix-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #e0e7ff;
    color: #3730a3;
    font-weight: 700;
    font-size: 12pt;
    padding: 5px 12px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .header-text { flex: 1; }
  .header-text h1 {
    font-size: 18pt;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
    line-height: 1.2;
  }
  .header-meta {
    font-size: 10pt;
    color: #64748b;
    margin-top: 3px;
  }
  .artifact-label {
    display: inline-block;
    background: #f1f5f9;
    color: #475569;
    font-size: 9pt;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }

  /* ── Content ── */
  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #1e293b;
    margin: 28px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f1f5f9;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #334155;
    margin: 18px 0 6px;
    page-break-after: avoid;
  }
  h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #475569;
    margin: 14px 0 4px;
  }
  p {
    margin: 6px 0;
    color: #334155;
  }
  ul, ol {
    margin: 6px 0 6px 22px;
    color: #334155;
  }
  li { margin: 3px 0; }
  strong { color: #1a1a2e; }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin: 10px 0;
  }
  th, td {
    padding: 6px 10px;
    text-align: left;
    border: 1px solid #e2e8f0;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #1e293b;
  }
  tr:nth-child(even) td { background: #fafbfc; }

  /* ── Code blocks ── */
  code {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 9pt;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    overflow-x: auto;
    margin: 10px 0;
    font-size: 9pt;
    line-height: 1.5;
  }
  pre code {
    background: none;
    padding: 0;
  }

  /* ── Checkboxes ── */
  input[type="checkbox"] {
    margin-right: 4px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9pt;
    color: #94a3b8;
  }

  /* ── Print ── */
  @media print {
    body { padding: 0; }
    h2 { page-break-before: auto; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; }
  }
</style>
</head>
<body>

<div class="header">
  <span class="prefix-badge">${meta.prefix}</span>
  <div class="header-text">
    <h1>${meta.title}</h1>
    <div class="header-meta">${meta.initiative.replace(/-/g, " ")} &middot; Created: ${meta.created}</div>
    <span class="artifact-label">${artifactLabel}</span>
  </div>
</div>

<div class="content">
${html}
</div>

<div class="footer">
  Generated from SDD &mdash; ${today()}
</div>

</body>
</html>`;
}

/* ── Route handler ── */

export async function GET(request: NextRequest) {
  const initiative = request.nextUrl.searchParams.get("initiative");
  const epic = request.nextUrl.searchParams.get("epic");
  const artifact = request.nextUrl.searchParams.get("artifact");
  const format = request.nextUrl.searchParams.get("format") || "html";

  if (!initiative || !epic || !artifact) {
    return Response.json({ error: "Missing parameters: initiative, epic, artifact required" }, { status: 400 });
  }

  const epicDir = path.join(CONTENT_DIR, safe(initiative), safe(epic));
  if (!fs.existsSync(epicDir)) {
    return Response.json({ error: "Epic not found" }, { status: 404 });
  }

  const content = resolveArtifactContent(epicDir, artifact);
  if (content === null) {
    return Response.json({ error: "Artifact not found" }, { status: 404 });
  }

  // Parse meta for prefix/title/created
  const meta = parseMetaYaml(epicDir);
  const prefix = meta.prefix || epic.replace(/^\d+-/, "").slice(0, 3).toUpperCase();
  const title = meta.title || epic.replace(/-/g, " ");
  const created = meta.created || "";

  if (format === "md") {
    const filename = `${prefix}-${artifact}.md`;
    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // HTML format
  const rendered = await marked.parse(content, { gfm: true, breaks: false });

  const isIdeaBrief = artifact.toLowerCase() === "idea-brief";
  const html = isIdeaBrief
    ? buildIdeaBriefHtml(rendered, { prefix, title, initiative, created })
    : buildStandardHtml(rendered, { prefix, title, initiative, artifact, created });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
