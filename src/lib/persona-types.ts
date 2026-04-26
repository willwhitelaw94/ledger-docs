// ---------------------------------------------------------------------------
// Types & constants shared between server loader and client components
// ---------------------------------------------------------------------------

export type PersonaGroup = "primary" | "secondary" | "operations";

export type DiscoverySession = {
  slug: string;
  title: string;
  date: string;
  participant: string;
  role: string;
  observer: string;
  duration: string;
  status: string;
  content: string;
  isPlaceholder: boolean;
};

export type Persona = {
  slug: string;
  title: string;
  description: string;
  group: PersonaGroup;
  goals: string[];
  painPoints: string[];
  relatedSlugs: string[];
  content: string;
  sessions: DiscoverySession[];
};

export const GROUP_META: Record<
  PersonaGroup,
  { label: string; order: number }
> = {
  primary: { label: "Primary Personas", order: 0 },
  secondary: { label: "Secondary Personas", order: 1 },
  operations: { label: "Operations Personas", order: 2 },
};
