export type Skill = {
  name: string;
  description: string;
  phase: string;
  prefix: "speckit" | "trilogy" | "hod" | "dev" | "other";
  type: "core" | "support" | "contextual";
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  avatar: string;
};

export type Phase = {
  id: string;
  title: string;
  gate?: string;
  gateNumber?: number;
  color: string;
  skills: Skill[];
  agents?: string[];
};

export const AGENTS: Record<string, Agent> = {
  "research-agent": {
    id: "research-agent",
    name: "Research Agent",
    role: "Cross-stage autonomous researcher",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=research&backgroundColor=b6e3f4",
    description: "Gathers context from Fireflies, Teams, Linear, web, codebase, and TC Docs. Synthesizes findings into structured research documentation. Can be spawned by any stage agent when context-building is needed.",
    responsibilities: [
      "Multi-source research (Fireflies, Linear, Teams, web)",
      "Codebase exploration and analysis",
      "Structured research.md documentation",
      "Cross-reference sources for confidence validation",
    ],
    skills: ["trilogy-research", "trilogy-learn", "trilogy-teams-chat"],
  },
  "planning-agent": {
    id: "planning-agent",
    name: "Planning Agent",
    role: "Autonomous planning stage orchestrator",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=planning&backgroundColor=c0aede",
    description: "Produces idea-brief.md, spec.md with user stories and Given/When/Then acceptance criteria, and business.md with measurable outcomes. Validates Gate 0 (Idea) and Gate 1 (Business/Spec).",
    responsibilities: [
      "Produce idea-brief.md with problem statement and RACI",
      "Produce spec.md with user stories and acceptance criteria",
      "Produce business.md with measurable outcomes",
      "Validate Gate 0 (Idea) and Gate 1 (Business/Spec)",
    ],
    skills: ["trilogy-idea", "speckit-specify", "trilogy-clarify", "speckit-checklist"],
  },
  "design-agent": {
    id: "design-agent",
    name: "Design Agent",
    role: "Autonomous design stage orchestrator",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=design&backgroundColor=ffd5dc",
    description: "Produces design.md (design brief with user context, principles, patterns), creates HTML mockups, and validates Gate 2 (Design) checklist. Coordinates responsive, accessibility, and edge case design.",
    responsibilities: [
      "Produce design.md with UX decisions and UI patterns",
      "Create HTML mockups in mockups/ subdirectory",
      "Validate Gate 2 (Design) checklist",
      "Coordinate responsive and accessibility design",
    ],
    skills: ["trilogy-design-kickoff", "trilogy-mockup", "trilogy-image", "trilogy-flow"],
  },
  "dev-agent": {
    id: "dev-agent",
    name: "Dev Agent",
    role: "Development stage team lead",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=devlead&backgroundColor=d1f4d1",
    description: "Plans architecture, breaks down tasks, and orchestrates parallel backend, frontend, and testing agents. Validates Gate 3 (Architecture) and Gate 4 (Code Quality). Handles migration approvals and feature flag coordination.",
    responsibilities: [
      "Plan architecture and produce plan.md",
      "Break down tasks into tasks.md",
      "Spawn and coordinate backend, frontend, and testing agents",
      "Validate Gate 3 and Gate 4",
    ],
    skills: ["speckit-plan", "speckit-tasks", "speckit-implement"],
  },
  "backend-agent": {
    id: "backend-agent",
    name: "Backend Agent",
    role: "Backend implementation teammate",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=backend&backgroundColor=ffdfba",
    description: "Builds Laravel PHP controllers, models, actions, data classes, routes, and migrations. Works exclusively in domain/, app/, database/, tests/ directories. Writes Pest feature and unit tests.",
    responsibilities: [
      "Build Laravel controllers, models, actions, routes",
      "Write database migrations",
      "Write Pest feature and unit tests",
      "Enforce architecture and code quality gates",
    ],
    skills: ["speckit-implement", "pest-testing"],
  },
  "frontend-agent": {
    id: "frontend-agent",
    name: "Frontend Agent",
    role: "Frontend implementation teammate",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=frontend&backgroundColor=bae1ff",
    description: "Builds Vue 3 pages, components, and styling. Works exclusively in resources/js/ directory. Consumes props from backend controllers via Inertia with full TypeScript.",
    responsibilities: [
      "Build Vue 3 pages and components",
      "Implement responsive styling with Tailwind",
      "Consume Inertia props from backend",
      "Reuse common components",
    ],
    skills: ["speckit-implement", "inertia-vue-development", "tailwindcss-development"],
  },
  "testing-agent": {
    id: "testing-agent",
    name: "Testing Agent",
    role: "Testing teammate (parallel to backend/frontend)",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=testing&backgroundColor=ffffba",
    description: "Writes Pest feature tests as backend features complete. Performs browser smoke tests via Chrome DevTools when frontend pages are ready. Tests incrementally — does not wait for all implementation to finish.",
    responsibilities: [
      "Write Pest tests as features complete",
      "Browser smoke tests via Chrome DevTools",
      "Test authorization, validation, edge cases",
      "Report failures to teammates immediately",
    ],
    skills: ["pest-testing", "playwright-browser"],
  },
  "qa-agent": {
    id: "qa-agent",
    name: "QA Agent",
    role: "Autonomous QA stage orchestrator",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=quality&backgroundColor=e8d5f5",
    description: "Produces test-report.md with acceptance criteria verification. Runs Pest automated tests and Playwright E2E tests. Performs browser walkthroughs at 3 breakpoints (desktop, tablet, mobile). Validates Gate 5 (QA).",
    responsibilities: [
      "Produce test-report.md with AC verification",
      "Run Pest and Playwright E2E tests",
      "Browser walkthroughs at 3 breakpoints",
      "Validate Gate 5 (QA) and fix failures",
    ],
    skills: ["trilogy-qa", "trilogy-qa-test-agent", "trilogy-qa-test-codify", "trilogy-qa-handover"],
  },
  "release-agent": {
    id: "release-agent",
    name: "Release Agent",
    role: "Autonomous release stage orchestrator",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=release&backgroundColor=c1f0c1",
    description: "Validates all prior artifacts exist and are complete. Generates multi-audience release notes (technical, user-facing, stakeholder). Validates Gate 6 (Release) and transitions epic to Completed in Linear.",
    responsibilities: [
      "Validate all prior artifacts are complete",
      "Generate multi-audience release notes",
      "Update feature documentation",
      "Validate Gate 6 and transition Linear status",
    ],
    skills: ["trilogy-ship", "trilogy-release-notes"],
  },
  "will-agent": {
    id: "will-agent",
    name: "Will Agent",
    role: "Full pipeline autonomous orchestrator",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=will&backgroundColor=ffc9de",
    description: "Guides features from raw idea through release without user input. Runs all stage agents sequentially: Planning → Design → Dev → QA → Release. Makes autonomous decisions on scope, design, architecture, and testing. Validates all 6 gates internally.",
    responsibilities: [
      "Run full pipeline: Planning → Design → Dev → QA → Release",
      "Make autonomous decisions at every stage",
      "Validate all 6 gates internally",
      "Fix issues without asking — fully autonomous",
    ],
    skills: [],
  },
};

export const PHASES: Phase[] = [
  {
    id: "research",
    title: "Research",
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    agents: ["research-agent"],
    skills: [
      { name: "trilogy-research", description: "Spawn parallel agents to gather context from Linear, Teams, Fireflies, and codebase", phase: "research", prefix: "trilogy", type: "core" },
      { name: "trilogy-learn", description: "Interactive context loading — ask what you want to learn from Features, Code, Teams, Linear, Fireflies", phase: "research", prefix: "trilogy", type: "core" },
      { name: "trilogy-teams-chat", description: "Fetch and analyze Teams chat by URL — extracts decisions, action items, discussions", phase: "research", prefix: "trilogy", type: "support" },
      { name: "teams-chat-summarizer", description: "Structured analysis of Teams chat history to extract key decisions and progress updates", phase: "research", prefix: "other", type: "support" },
      { name: "trilogy-brp", description: "Plan and prepare Big Room Planning sessions with context from last BRP and roadmap", phase: "research", prefix: "trilogy", type: "support" },
      { name: "trilogy-design-research", description: "Deep design research — competitive analysis, user research, audits, emotional design", phase: "research", prefix: "trilogy", type: "contextual" },
    ],
  },
  {
    id: "ideation",
    title: "Ideation",
    gate: "Idea Gate",
    gateNumber: 0,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    agents: ["planning-agent"],
    skills: [
      { name: "trilogy-idea", description: "Create publication-ready idea briefs for new features or epics", phase: "ideation", prefix: "trilogy", type: "core" },
      { name: "trilogy-idea-spawn", description: "Generate an interactive ideas board from an idea brief and meeting transcript", phase: "ideation", prefix: "trilogy", type: "support" },
      { name: "trilogy-idea-handover", description: "Gate 0: Validate idea brief completeness, create epic in Linear as Planned, update meta.yaml", phase: "ideation", prefix: "trilogy", type: "core" },
      { name: "hod-problem-statement", description: "Transform messy context into clear, solution-agnostic problem statements", phase: "ideation", prefix: "hod", type: "core" },
      { name: "hod-hmw", description: "Generate 'How Might We' prompts that reframe problems as creative opportunities", phase: "ideation", prefix: "hod", type: "support" },
      { name: "hod-humanise", description: "Transform technical PRDs into designer-friendly documentation using plain language", phase: "ideation", prefix: "hod", type: "support" },
      { name: "trilogy-raci", description: "Create RACI matrices to define roles, decision authority, and responsibilities", phase: "ideation", prefix: "trilogy", type: "support" },
    ],
  },
  {
    id: "spec",
    title: "Specification",
    gate: "Business Gate",
    gateNumber: 1,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    agents: ["planning-agent"],
    skills: [
      { name: "speckit-specify", description: "Generate publication-ready feature specifications from user descriptions", phase: "spec", prefix: "speckit", type: "core" },
      { name: "trilogy-clarify", description: "Run specs through stakeholder lenses (spec, business, development, db) to catch blind spots", phase: "spec", prefix: "trilogy", type: "core" },
      { name: "trilogy-clarify-spec", description: "Reduce ambiguity in functional and technical requirements through 10-category specification review", phase: "spec", prefix: "trilogy", type: "core" },
      { name: "trilogy-clarify-business", description: "Clarify business outcomes, success metrics, ROI, and stakeholder alignment for a feature", phase: "spec", prefix: "trilogy", type: "core" },
      { name: "trilogy-spec-handover", description: "Gate 1: Validate specification completeness, story quality, and business alignment", phase: "spec", prefix: "trilogy", type: "core" },
      { name: "speckit-checklist", description: "Generate requirements quality checklists — unit tests for English specifications", phase: "spec", prefix: "speckit", type: "support" },
      { name: "trilogy-spec-explorer", description: "Generate interactive canvas-based spec explorer with story maps", phase: "spec", prefix: "trilogy", type: "contextual" },
      { name: "trilogy-spec-index", description: "Generate interactive HTML index cataloguing all spec.md files across initiatives", phase: "spec", prefix: "trilogy", type: "contextual" },
    ],
  },
  {
    id: "design",
    title: "Design",
    gate: "Design Gate",
    gateNumber: 2,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    agents: ["design-agent"],
    skills: [
      { name: "trilogy-design-kickoff", description: "Kick off design phase and create design.md — UX decisions, UI patterns, components, accessibility", phase: "design", prefix: "trilogy", type: "core" },
      { name: "trilogy-design-handover", description: "Gate 2: Validate design completeness and facilitate handover from Design to Dev", phase: "design", prefix: "trilogy", type: "core" },
      { name: "trilogy-clarify-design", description: "Refine UX/UI decisions in an existing design specification through designer lens questioning", phase: "design", prefix: "trilogy", type: "core" },
      { name: "trilogy-design-gap", description: "Cross-check Figma design against spec.md, optionally with designer walkthrough transcript", phase: "design", prefix: "trilogy", type: "core" },
      { name: "trilogy-mockup", description: "Generate 5-10 ASCII UI mockup variations to explore design options", phase: "design", prefix: "trilogy", type: "support" },
      { name: "trilogy-mockup-deploy", description: "Deploy HTML mockups to unique public Vercel URL for team sharing and Figma capture", phase: "design", prefix: "trilogy", type: "contextual" },
      { name: "trilogy-image", description: "Create visual assets for epics — hero images, storyboards, prompts", phase: "design", prefix: "trilogy", type: "support" },
      { name: "trilogy-illustrate", description: "Select the right icon or illustration for TC Portal — Monicon system, undraw.co", phase: "design", prefix: "trilogy", type: "support" },
      { name: "trilogy-ux", description: "Create interactive stakeholder journey maps — phases, touchpoints, emotions", phase: "design", prefix: "trilogy", type: "contextual" },
      { name: "trilogy-design-sync", description: "Push HTML or Vue mockups into Figma via MCP; translates mockups to Figma-native designs", phase: "design", prefix: "trilogy", type: "contextual" },
      { name: "trilogy-figma-capture", description: "Capture live Portal page and push to Figma as editable design", phase: "design", prefix: "trilogy", type: "contextual" },
      { name: "speckit-erd", description: "Generate Entity-Relationship Diagrams (ASCII and Mermaid) from db-spec", phase: "design", prefix: "speckit", type: "support" },
      { name: "trilogy-flow", description: "Generate user flow diagrams showing paths, decision points, and error handling", phase: "design", prefix: "trilogy", type: "support" },
      { name: "hod-ux-writing", description: "Write clear, concise, user-centered interface copy — microcopy, buttons, error messages", phase: "design", prefix: "hod", type: "support" },
    ],
  },
  {
    id: "planning",
    title: "Planning",
    gate: "Architecture Gate",
    gateNumber: 3,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    agents: ["dev-agent"],
    skills: [
      { name: "speckit-plan", description: "Create technical implementation plans with architecture, phases, and constraints", phase: "planning", prefix: "speckit", type: "core" },
      { name: "speckit-tasks", description: "Generate implementation tasks organized by user story with dependencies", phase: "planning", prefix: "speckit", type: "core" },
      { name: "trilogy-clarify-dev", description: "Clarify technical strategy, architecture, and implementation approach through engineer lens", phase: "planning", prefix: "trilogy", type: "core" },
      { name: "trilogy-estimate", description: "Estimate effort at any level — idea briefs (T-shirt), stories (days), tasks (points)", phase: "planning", prefix: "trilogy", type: "support" },
      { name: "speckit-analyze", description: "Identify inconsistencies, duplications, and gaps across spec artifacts", phase: "planning", prefix: "speckit", type: "support" },
      { name: "trilogy-db-visualiser", description: "Generate interactive canvas-based database schema visualiser scoped to current epic", phase: "planning", prefix: "trilogy", type: "contextual" },
      { name: "trilogy-raci", description: "Create RACI matrices to define roles, decision authority, and responsibilities", phase: "planning", prefix: "trilogy", type: "support" },
    ],
  },
  {
    id: "dev",
    title: "Implementation",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    agents: ["dev-agent", "backend-agent", "frontend-agent", "testing-agent"],
    skills: [
      { name: "speckit-implement", description: "Execute implementation following tasks.md — interactive or autonomous Ralph mode", phase: "dev", prefix: "speckit", type: "core" },
      { name: "trilogy-dev-anvil", description: "Gate-aware coding for ad-hoc work using Gate 3 & 4 rules as context", phase: "dev", prefix: "trilogy", type: "support" },
      { name: "pest-testing", description: "PHP testing — write tests, debug failures, architecture testing, mocking", phase: "dev", prefix: "dev", type: "contextual" },
      { name: "inertia-vue-development", description: "Vue pages, forms, navigation, Inertia.js patterns", phase: "dev", prefix: "dev", type: "contextual" },
      { name: "tailwindcss-development", description: "CSS, responsive design, dark mode, Tailwind utilities", phase: "dev", prefix: "dev", type: "contextual" },
      { name: "pennant-development", description: "Feature toggles, A/B testing, conditional features", phase: "dev", prefix: "dev", type: "contextual" },
      { name: "playwright-browser", description: "Browser automation — UI testing, debugging frontend, web automation", phase: "dev", prefix: "dev", type: "contextual" },
    ],
  },
  {
    id: "review",
    title: "Code Review",
    gate: "Code Gate",
    gateNumber: 4,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    agents: ["dev-agent"],
    skills: [
      { name: "trilogy-dev-pr", description: "Lint, format, simplify, type-check, test, run dev review, and create PR", phase: "review", prefix: "trilogy", type: "core" },
      { name: "trilogy-dev-handover", description: "Full Gate 4 validation with Linear transition (Dev → QA) and meta.yaml update", phase: "review", prefix: "trilogy", type: "core" },
      { name: "trilogy-dev-review", description: "Review changed files against Gate 3 and Gate 4 checklists", phase: "review", prefix: "trilogy", type: "support" },
      { name: "trilogy-pixel-perfect", description: "Compare built implementation against Figma design for pixel-perfect accuracy", phase: "review", prefix: "trilogy", type: "contextual" },
      { name: "laravel-simplifier", description: "Simplify and refine PHP/Laravel code for clarity", phase: "review", prefix: "other", type: "support" },
    ],
  },
  {
    id: "qa",
    title: "QA",
    gate: "QA Gate",
    gateNumber: 5,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    agents: ["qa-agent"],
    skills: [
      { name: "trilogy-qa", description: "Generate QA test plan from spec.md acceptance criteria — no browser needed", phase: "qa", prefix: "trilogy", type: "core" },
      { name: "trilogy-qa-test-agent", description: "Execute the test plan in the browser, fix failures, generate test-report.md with evidence", phase: "qa", prefix: "trilogy", type: "core" },
      { name: "trilogy-qa-test-codify", description: "Convert passing browser tests into deterministic Playwright E2E tests for CI", phase: "qa", prefix: "trilogy", type: "support" },
      { name: "trilogy-qa-handover", description: "Run Gate 5 checks, confirm no open Sev 1-3 issues, transition Linear to Release", phase: "qa", prefix: "trilogy", type: "core" },
    ],
  },
  {
    id: "release",
    title: "Release",
    gate: "Release Gate",
    gateNumber: 6,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
    agents: ["release-agent"],
    skills: [
      { name: "trilogy-ship", description: "Ship to production — analyze changes, Linear ticket, branch, commit, PR, changelog, tags", phase: "release", prefix: "trilogy", type: "core" },
      { name: "trilogy-release-notes", description: "Generate stakeholder-friendly release notes from spec and git history", phase: "release", prefix: "trilogy", type: "support" },
    ],
  },
  {
    id: "docs",
    title: "Documentation",
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    skills: [
      { name: "trilogy-docs-build", description: "Build and preview the docs site", phase: "docs", prefix: "trilogy", type: "support" },
      { name: "trilogy-docs-write", description: "Structure guide for where to put docs — file conventions and placement", phase: "docs", prefix: "trilogy", type: "support" },
      { name: "trilogy-docs-feature", description: "Document feature domains by exploring codebase and synthesizing knowledge", phase: "docs", prefix: "trilogy", type: "support" },
    ],
  },
  {
    id: "tooling",
    title: "Tooling & Utilities",
    color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
    skills: [
      { name: "trilogy-linear-sync", description: "Sync epics, stories, tasks, and documents between local docs and Linear", phase: "tooling", prefix: "trilogy", type: "support" },
      { name: "trilogy-setup-mcp", description: "Configure MCP servers and Claude plugins — Linear, Figma, Fireflies, PostHog, Chrome DevTools", phase: "tooling", prefix: "trilogy", type: "support" },
      { name: "trilogy-train", description: "Analyze workflow effectiveness and identify process optimizations", phase: "tooling", prefix: "trilogy", type: "support" },
      { name: "tc-wow", description: "Initialize or update TC-WoW git submodules and symlink agents in target repository", phase: "tooling", prefix: "trilogy", type: "support" },
      { name: "video-to-code-skill", description: "Analyze video feedback by extracting key frames and audio transcription", phase: "tooling", prefix: "other", type: "support" },
      { name: "pdf-to-text", description: "Convert PDF documents to searchable text files", phase: "tooling", prefix: "other", type: "support" },
    ],
  },
];

export function getAllSkills(): Skill[] {
  return PHASES.flatMap((p) => p.skills);
}

export function getSkillsByPrefix(prefix: string): Skill[] {
  return getAllSkills().filter((s) => s.prefix === prefix);
}

export const PREFIX_LABELS: Record<string, string> = {
  speckit: "SpecKit — Workflow",
  trilogy: "Trilogy — TC Portal",
  hod: "HOD — Design Thinking",
  dev: "Development — Contextual",
  other: "Other",
};
