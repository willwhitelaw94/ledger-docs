import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const CONTENT_DIR = path.join(process.cwd(), "content/initiatives");

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Support ?path=Initiative/Epic/subdir/file.html format
  const mockupPath = params.get("path");

  if (!mockupPath) {
    return new Response("Missing path parameter", { status: 400 });
  }

  // Sanitize: only allow safe characters
  const safePath = mockupPath.replace(/[^a-zA-Z0-9_./\-]/g, "");

  // Prevent path traversal
  if (safePath.includes("..")) {
    return new Response("Invalid path", { status: 400 });
  }

  // Path format: Initiative/Epic/[subdir/]file.html
  // We insert "mockups" between epic and the rest
  const parts = safePath.split("/");
  if (parts.length < 3) {
    return new Response("Invalid path format", { status: 400 });
  }

  const initiative = parts[0];
  const epic = parts[1];
  const rest = parts.slice(2).join("/");

  const fullPath = path.join(CONTENT_DIR, initiative, epic, "mockups", rest);

  if (!fs.existsSync(fullPath) || !fullPath.endsWith(".html")) {
    return new Response("Not found", { status: 404 });
  }

  const html = fs.readFileSync(fullPath, "utf-8");
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
