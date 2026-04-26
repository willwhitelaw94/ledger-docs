import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "Editing is only available in development" },
      { status: 403 }
    );
  }

  const { filePath, content } = await request.json();

  if (
    typeof filePath !== "string" ||
    typeof content !== "string" ||
    !filePath.startsWith("content/")
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const absolutePath = path.join(process.cwd(), filePath);

  // Prevent path traversal
  if (!absolutePath.startsWith(path.join(process.cwd(), "content"))) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(absolutePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  fs.writeFileSync(absolutePath, content, "utf-8");

  return Response.json({ ok: true });
}
