import fs from "fs";
import path from "path";

export type MockupPage = {
  name: string;
  path: string; // relative URL for serving from public or API
  label: string;
};

export type MockupGroup = {
  id: string;
  label: string;
  pages: MockupPage[];
};

const INITIATIVES_DIR = path.join(process.cwd(), "content/initiatives");

function labelFromFilename(filename: string): string {
  return filename
    .replace(/\.html$/, "")
    .replace(/^\d+-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelFromDirname(dirname: string): string {
  return dirname
    .replace(/^student-\d+-/, "Student: ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scanDir(
  dirPath: string,
  urlPrefix: string
): MockupPage[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .sort()
    .map((f) => ({
      name: f.replace(/\.html$/, ""),
      path: `${urlPrefix}/${f}`,
      label: labelFromFilename(f),
    }));
}

export function getEpicMockups(
  initiativeSlug: string,
  epicSlug: string
): MockupGroup[] {
  const mockupsDir = path.join(INITIATIVES_DIR, initiativeSlug, epicSlug, "mockups");
  if (!fs.existsSync(mockupsDir)) return [];

  const groups: MockupGroup[] = [];
  const urlBase = `/api/mockup?i=${initiativeSlug}&e=${epicSlug}`;

  // Check for index.html at root (the multi-page mockup)
  const hasIndex = fs.existsSync(path.join(mockupsDir, "index.html"));

  // Scan top-level HTML files (excluding index)
  const topPages = scanDir(mockupsDir, `${urlBase}&dir=.`);
  if (hasIndex || topPages.length > 0) {
    const pages: MockupPage[] = [];
    if (hasIndex) {
      pages.push({
        name: "index",
        path: `${urlBase}&dir=.&file=index.html`,
        label: "Overview",
      });
    }
    pages.push(...topPages);
    if (pages.length > 0) {
      groups.push({ id: "main", label: "Mockups", pages });
    }
  }

  // Scan subdirectories
  const subdirs = fs
    .readdirSync(mockupsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  for (const subdir of subdirs) {
    const subdirPath = path.join(mockupsDir, subdir.name);

    if (subdir.name === "challenge") {
      // Challenge directory — scan each student subdirectory
      const students = fs
        .readdirSync(subdirPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .sort();

      // Also check for a unified directory
      for (const student of students) {
        const studentPath = path.join(subdirPath, student.name);
        const studentPages = scanDir(
          studentPath,
          `${urlBase}&dir=challenge/${student.name}`
        );
        const studentHasIndex = fs.existsSync(
          path.join(studentPath, "index.html")
        );
        const pages: MockupPage[] = [];
        if (studentHasIndex) {
          pages.push({
            name: "index",
            path: `${urlBase}&dir=challenge/${student.name}&file=index.html`,
            label: "Overview",
          });
        }
        pages.push(...studentPages);
        if (pages.length > 0) {
          groups.push({
            id: `challenge-${student.name}`,
            label: labelFromDirname(student.name),
            pages,
          });
        }
      }
    } else {
      // Regular subdirectory (e.g. "design")
      const subPages = scanDir(subdirPath, `${urlBase}&dir=${subdir.name}`);
      const subHasIndex = fs.existsSync(
        path.join(subdirPath, "index.html")
      );
      const pages: MockupPage[] = [];
      if (subHasIndex) {
        pages.push({
          name: "index",
          path: `${urlBase}&dir=${subdir.name}&file=index.html`,
          label: "Overview",
        });
      }
      pages.push(...subPages);
      if (pages.length > 0) {
        groups.push({
          id: subdir.name,
          label: labelFromDirname(subdir.name),
          pages,
        });
      }
    }
  }

  return groups;
}
