"use server";

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content/initiatives");

export async function claimBounty(
  initiativeSlug: string,
  epicSlug: string,
  claimedBy: string
): Promise<{ success: boolean; error?: string }> {
  throw new Error("Dashboard disabled in v1");
  try {
    const metaPath = path.join(
      CONTENT_DIR,
      initiativeSlug,
      epicSlug,
      "meta.yaml"
    );

    if (!fs.existsSync(metaPath)) {
      return { success: false, error: "Epic not found" };
    }

    let content = fs.readFileSync(metaPath, "utf-8");

    // Remove existing claim fields if present
    content = content.replace(/^bounty_claimed_by:.*\n?/m, "");
    content = content.replace(/^bounty_claimed_date:.*\n?/m, "");

    // Add claim fields before the first blank line or at the end
    const today = new Date().toISOString().split("T")[0];
    const claimLines = `bounty_claimed_by: ${claimedBy}\nbounty_claimed_date: ${today}\n`;

    // Insert after the last simple key-value line before gates/phases/stories
    const insertBefore = content.search(/\n(gates|phases|stories|$)/m);
    if (insertBefore > 0) {
      content =
        content.slice(0, insertBefore) +
        "\n" +
        claimLines +
        content.slice(insertBefore);
    } else {
      content = content.trimEnd() + "\n" + claimLines;
    }

    fs.writeFileSync(metaPath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function unclaimBounty(
  initiativeSlug: string,
  epicSlug: string
): Promise<{ success: boolean; error?: string }> {
  throw new Error("Dashboard disabled in v1");
  try {
    const metaPath = path.join(
      CONTENT_DIR,
      initiativeSlug,
      epicSlug,
      "meta.yaml"
    );

    if (!fs.existsSync(metaPath)) {
      return { success: false, error: "Epic not found" };
    }

    let content = fs.readFileSync(metaPath, "utf-8");
    content = content.replace(/^bounty_claimed_by:.*\n?/m, "");
    content = content.replace(/^bounty_claimed_date:.*\n?/m, "");

    fs.writeFileSync(metaPath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

const VALID_PRIORITIES = ["P0", "P1", "P2", "P3", ""] as const;

export async function updateEpicPriority(
  initiativeSlug: string,
  epicSlug: string,
  priority: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])) {
      return { success: false, error: `Invalid priority: ${priority}` };
    }

    const metaPath = path.join(CONTENT_DIR, initiativeSlug, epicSlug, "meta.yaml");

    if (!fs.existsSync(metaPath)) {
      return { success: false, error: "Epic not found" };
    }

    let content = fs.readFileSync(metaPath, "utf-8");

    if (/^priority\s*:.*/m.test(content)) {
      content = content.replace(/^priority\s*:.*/m, `priority: ${priority}`);
    } else {
      // Insert after status line, or append
      const statusMatch = content.match(/^status\s*:.*$/m);
      if (statusMatch) {
        const idx = content.indexOf(statusMatch[0]) + statusMatch[0].length;
        content = content.slice(0, idx) + `\npriority: ${priority}` + content.slice(idx);
      } else {
        content = content.trimEnd() + `\npriority: ${priority}\n`;
      }
    }

    fs.writeFileSync(metaPath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function generateEpicSummary(
  _initiativeSlug: string,
  _epicTitle: string,
  _epicStatus: string,
  _artifactContent: Record<string, string>
): Promise<{ success: boolean; summary?: string; error?: string }> {
  return { success: false, error: "Dashboard disabled in v1" };
}
