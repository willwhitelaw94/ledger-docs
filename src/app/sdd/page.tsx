import { getGates, getEpicsByGate } from "@/lib/gates";
import { getInitiatives } from "@/lib/initiatives";
import { PHASES, getAllSkills, AGENTS } from "@/lib/skills";
import { SddProcessClient } from "./sdd-client";

export const metadata = {
  title: "SDD Process — Story-Driven Development",
  description:
    "Quality gates, workflow skills, and agents — the complete SDD process in one view.",
};

export default function SddProcessPage() {
  const gates = getGates();
  const initiatives = getInitiatives();
  const epicsByGate = getEpicsByGate(initiatives);
  const skills = getAllSkills();

  return (
    <SddProcessClient
      gates={gates}
      epicsByGate={epicsByGate}
      phases={PHASES}
      agents={AGENTS}
      totalSkills={skills.length}
    />
  );
}
