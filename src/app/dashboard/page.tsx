import { Suspense } from "react";
import { getInitiatives } from "@/lib/initiatives";
import { DashboardOrchestrator } from "./dashboard-orchestrator";

export default function DashboardPage() {
  // Strip artifactContent to avoid sending ~3.7MB to the client.
  // Content is loaded on-demand via /api/artifact when the user opens a document.
  const initiatives = getInitiatives().map((init) => ({
    ...init,
    epics: init.epics.map((epic) => ({
      ...epic,
      artifactContent: {},
    })),
  }));

  const readOnly = process.env.NODE_ENV === "production";

  return (
    <Suspense>
      <DashboardOrchestrator initiatives={initiatives} readOnly={readOnly} />
    </Suspense>
  );
}
