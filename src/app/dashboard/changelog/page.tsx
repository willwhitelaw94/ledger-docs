import { getChangelog } from "@/lib/changelog";
import { ChangelogClient } from "./changelog-client";

export default function ChangelogPage() {
  const entries = getChangelog();
  return <ChangelogClient entries={entries} />;
}
