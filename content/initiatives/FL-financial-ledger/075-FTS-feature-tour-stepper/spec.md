---
title: "Feature Specification: Feature Tour & Onboarding Stepper"
---

# Feature Specification: Feature Tour & Onboarding Stepper

**Feature Branch**: `075-feature-tour-stepper`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 075-FTS
**Initiative**: FL -- Financial Ledger Platform
**Effort**: S (1--2 sprints)
**Depends On**: None (standalone UI system)

### Out of Scope

- **Analytics tracking of tour completion** -- deferred to PostHog integration pass.
- **A/B testing different tour flows** -- deferred to experiment infrastructure.
- **Server-side tour state** -- V1 persists completion state in localStorage. Server-sync (so tours don't re-appear on new devices) is a future enhancement.
- **Tour builder UI** -- V1 tours are defined in code. A visual tour editor is not planned.
- **Mobile-optimised tours** -- V1 tours are suppressed on viewports below `sm` (640px). Mobile onboarding is deferred to a future mobile-first pass.

### Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| **react-joyride** | Adds ~45kB gzipped, has complex theming overrides that fight shadcn/ui design tokens, and doesn't integrate with our Zustand persistence pattern. Building with native DOM APIs + Radix Portal keeps us dependency-free and fully in control. |
| **driver.js** | Lighter than joyride but still an external dependency. Its imperative API doesn't compose well with React's declarative model. Our SVG mask approach achieves the same visual result with ~200 lines of code. |
| **Shepherd.js** | jQuery-era API surface, large bundle, poor TypeScript support. Not aligned with the stack. |

---

## Overview

MoneyQuest has multiple product surfaces -- the workspace ledger, practice management portal, admin dashboard -- each with distinct onboarding needs. When a user enters the practice portal for the first time (or when we ship major UI changes like the new Partner Hub navigation), they need a guided walkthrough that highlights key areas of the interface.

**Competitor context**: Xero Practice Manager (XPM) recently shipped a "Welcome to your new Xero Partner Hub" tour -- a 4-step spotlight overlay that walks users through navigation changes, customisable homepage, and AI-powered insights (JAX). This is the pattern we're replicating. Linear, Notion, and Figma all use similar tooltip-anchored feature tours for onboarding and feature announcements.

This epic introduces two reusable primitives:

1. **`<FeatureTour>`** -- a declarative component that renders a multi-step spotlight overlay anchored to specific DOM elements. Each step highlights a target element with a backdrop dimmer, shows a tooltip card with title/description/media, and provides Next/Back/Done navigation. Tours are defined as configuration arrays and can be triggered programmatically or on first visit.

2. **`<Stepper>`** -- a low-level stepper UI component (progress indicator) that can be used independently in wizards, setup flows, and multi-step forms. Replaces the bespoke `StepIndicator` in `/practice/setup` and can be composed into any multi-step flow.

**Practice branding context**: The practice portal header currently uses the same `bg-background` as the workspace. To make it "stand out" (like XPM's distinctive dark navy header), the practice shell will get a branded header variant. The feature tour is the mechanism that introduces users to this new branding when they first visit.

---

## Terminology

Throughout this spec:
- **Workspace** (also called "entity") = a single business ledger (the `/w/[slug]/*` routes). The terms are interchangeable; workspace is the model name, entity is the business concept.
- **Portal** = a top-level product surface (workspace portal, practice portal, admin/provider portal).
- **Tour** = a multi-step spotlight walkthrough anchored to DOM elements.
- **Step** = a single highlight + tooltip within a tour.

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Bundle size** | Tour system adds < 5kB gzipped to the JS bundle (no external dependencies) |
| **Render performance** | Backdrop + tooltip render in < 16ms (single frame). Transition between steps < 150ms. |
| **Accessibility** | WCAG 2.1 AA. Full keyboard navigation. Screen reader announcements on step change. Focus trapped within tooltip during tour. |
| **Browser support** | All browsers supporting ResizeObserver + IntersectionObserver (all evergreen browsers, no IE11) |

---

## User Scenarios & Testing

### User Story 1 -- Feature Tour Component (Priority: P1)

A developer defines a tour as an array of step configs (target selector, title, description, placement). The tour renders as a spotlight overlay -- dimming everything except the highlighted element -- with a floating tooltip card anchored to each target. Users navigate with Next/Back/Done buttons or keyboard (Escape to dismiss, arrow keys to navigate).

**Why this priority**: The tour component is the core primitive. Without it, we can't build any onboarding flows.

**Acceptance Scenarios**:

1. **Given** a tour is defined with 4 steps targeting `[data-tour="nav"]`, `[data-tour="clients"]`, `[data-tour="jobs"]`, `[data-tour="ai"]`, **When** the tour starts, **Then** a semi-transparent backdrop appears, the first target element is highlighted (cut out from the backdrop), and a tooltip card appears anchored to the target with title, description, step counter ("1 of 4"), and a "Next" button.

2. **Given** the tour is on step 2, **When** I click "Next", **Then** the spotlight smoothly transitions to the step 3 target element with a brief animation (150ms ease), the tooltip repositions, and the counter updates to "3 of 4".

3. **Given** the tour is on step 2, **When** I click "Back", **Then** the spotlight returns to step 1.

4. **Given** the tour is on the last step, **When** I click "Done", **Then** the backdrop fades out, the tour closes, and a completion callback fires. The tour ID is stored in localStorage so it doesn't re-appear.

5. **Given** the tour is active, **When** I press Escape, **Then** the tour dismisses immediately. It is NOT marked as completed (so it can re-appear next visit until the user finishes or explicitly skips).

6. **Given** the tour is active, **When** I click the backdrop (outside the tooltip and target), **Then** the tour dismisses (same as Escape -- skipped, not completed).

7. **Given** a target element is not visible in the viewport, **When** that step becomes active, **Then** the page scrolls smoothly to bring the target into view before showing the spotlight.

8. **Given** a target selector doesn't match any element (e.g. feature flag hides the nav item), **When** that step would activate, **Then** the step is silently skipped and the next valid step is shown. If ALL steps are invalid, the tour does not start and no error is thrown.

9. **Given** I have completed a tour (localStorage flag set), **When** I visit the page again, **Then** the tour does NOT auto-start. I can manually trigger it from the "?" help overlay via a "Take a tour" link or from a dedicated "Take a tour" button.

10. **Given** the tour tooltip would overflow the viewport edge, **When** the step activates, **Then** the tooltip auto-repositions (e.g. from right to left, or bottom to top) to stay within bounds.

11. **Given** the tour is active, **When** I use Tab / Shift+Tab, **Then** focus is trapped within the tooltip card (cycling between Back, Next/Done, and the close button). Focus does not escape to elements behind the backdrop.

12. **Given** the tour is active and a step transitions, **When** the new tooltip renders, **Then** a screen reader announcement is made via `aria-live="polite"` region with the step title and position (e.g. "Step 2 of 4: Navigation").

13. **Given** the tour is active, **When** I press the Right Arrow key, **Then** the tour advances to the next step. Left Arrow goes to the previous step. This mirrors the Next/Back button behaviour.

14. **Given** the tour is active, **When** I navigate away from the page (via link click or browser back), **Then** the tour dismisses as skipped (not completed). The tour will re-appear on next visit to the same page.

15. **Given** the target element changes size or position (e.g. window resize, sidebar collapse), **When** the tour is active on that step, **Then** the spotlight cutout and tooltip reposition to track the target. This uses ResizeObserver and recalculates on window resize.

16. **Given** the viewport is below `sm` (640px), **When** a first-visit tour would auto-start, **Then** the tour is suppressed and does not start. Tours can still be triggered manually at small viewports but display in a simplified bottom-sheet layout.

---

### User Story 2 -- Stepper Component (Priority: P1)

A reusable `<Stepper>` component that displays step progress -- numbered circles connected by lines, with completed/active/upcoming states. Used inside the feature tour tooltip AND independently in wizard flows.

**Why this priority**: The stepper is used by both the feature tour and existing wizard flows (practice setup, year-end close, workspace creation).

**Acceptance Scenarios**:

1. **Given** a stepper with 4 steps where step 2 is active, **When** rendered, **Then** step 1 shows a green checkmark (completed), step 2 shows a highlighted ring (active), steps 3-4 show muted circles (upcoming). Lines between steps are coloured green up to the active step.

2. **Given** a stepper in "compact" variant, **When** rendered, **Then** it shows dots instead of numbered circles (like XPM's "1 of 4" with three dots at the bottom of the tour tooltip).

3. **Given** a stepper in "labeled" variant, **When** rendered, **Then** each step shows its label below the circle (used in wizard flows like practice setup).

4. **Given** a stepper with `clickable` prop, **When** I click a completed step, **Then** it fires an `onStepClick(stepIndex)` callback. Upcoming (not-yet-reached) steps are not clickable.

5. **Given** a stepper in vertical orientation, **When** rendered, **Then** steps stack vertically with connecting lines between them (useful for sidebar wizards or long forms).

---

### User Story 3 -- Tour Persistence & Management (Priority: P1)

Tours need a lifecycle: when to show, when to suppress, and how to reset. This is managed through a lightweight store (Zustand) that wraps localStorage.

**Acceptance Scenarios**:

1. **Given** a tour with `id: "practice-welcome-v1"`, **When** the user completes it, **Then** `{ "practice-welcome-v1": { completedAt: "2026-04-01T..." } }` is stored in localStorage under the `moneyquest-tours` key.

2. **Given** a tour has `trigger: "first-visit"`, **When** the user visits the page and hasn't completed the tour, **Then** the tour auto-starts after a 500ms delay (to let the page render).

3. **Given** a tour has `trigger: "manual"`, **When** the user visits the page, **Then** the tour does NOT auto-start. It only starts when called via `tourStore.startTour("tour-id")`.

4. **Given** a user wants to re-take a tour, **When** they click "Take a tour" from the help overlay, **Then** the tour starts regardless of completion state.

5. **Given** a new version of a tour ships (e.g. `"practice-welcome-v2"`), **When** the user visits, **Then** the new tour auto-starts because the new ID has no completion record. The old `v1` record is cleaned up automatically.

6. **Given** multiple tours are registered for the same page, **When** the user visits, **Then** only the highest-priority uncompleted tour starts. Priority is determined by the `priority` field on the tour definition (lower number = higher priority, default 10). Tours do not stack or queue.

7. **Given** a user clears their browser localStorage, **When** they next visit a page with a first-visit tour, **Then** the tour re-appears. This is acceptable for V1 (server-sync is out of scope).

---

### User Story 4 -- Practice Portal Welcome Tour (Priority: P2)

The first concrete tour: a 4-step walkthrough for the practice portal, inspired by XPM's Partner Hub tour.

**Acceptance Scenarios**:

1. **Step 1 -- "Welcome to Practice"**: Spotlight targets the practice identity area (firm name + icon, `[data-tour="practice-identity"]`). Title: "Welcome to your Practice Hub". Description: "Manage all your client workspaces, staff, and jobs from one place."

2. **Step 2 -- "Navigation"**: Spotlight targets the horizontal nav bar (`[data-tour="practice-nav"]`). Title: "One simplified navigation". Description: "Find everything you need to move seamlessly between tasks and streamline your workflow."

3. **Step 3 -- "Dashboard overview"**: Spotlight targets the main content area (`[data-tour="practice-dashboard"]`). Title: "Customisable homepage". Description: "Your homepage puts key information at your fingertips. See client status, pending actions, and time summaries at a glance."

4. **Step 4 -- "AI insights"**: Spotlight targets the AI chatbot button (`[data-tour="ai-assistant"]`). Title: "AI-powered insights". Description: "Use the AI assistant to get actionable insights across your client base. Press Cmd+/ to start."

---

### User Story 5 -- Workspace Welcome Tour (Priority: P2)

A tour for individual workspace users -- business owners, sole traders, bookkeepers entering their ledger for the first time.

**Acceptance Scenarios**:

1. **Step 1 -- "Welcome to your ledger"**: Spotlight targets the sidebar navigation (`[data-tour="sidebar-nav"]`). Title: "Your financial hub". Description: "Everything about your business finances lives here -- invoices, bank feeds, journal entries, and reports."

2. **Step 2 -- "Banking"**: Spotlight targets the Banking nav item (`[data-tour="nav-banking"]`). Title: "Connect your bank". Description: "Import bank transactions automatically and reconcile them against your ledger in seconds."

3. **Step 3 -- "Invoicing"**: Spotlight targets the Invoices nav item (`[data-tour="nav-invoices"]`). Title: "Get paid faster". Description: "Create and send professional invoices. Track who owes you and when."

4. **Step 4 -- "AI assistant"**: Spotlight targets the AI chatbot trigger (`[data-tour="ai-assistant"]`). Title: "Ask anything". Description: "Your AI financial assistant can answer questions about your books, run reports, and explain transactions. Press Cmd+/ to start."

5. **Step 5 -- "Keyboard shortcuts"**: Spotlight targets the `?` help overlay trigger (`[data-tour="shortcuts-help"]`). Title: "Power user shortcuts". Description: "Press ? anytime to see keyboard shortcuts. Navigate with G then D (dashboard), G then I (invoices), and more."

---

### User Story 6 -- Provider Portal Tour (Priority: P2)

A tour for the admin/provider portal -- platform operators who manage organisations, workspaces, and practices across the MoneyQuest platform.

**Acceptance Scenarios**:

1. **Step 1 -- "Platform overview"**: Spotlight targets the admin identity badge (`[data-tour="admin-identity"]`). Title: "Welcome to the Provider Portal". Description: "Monitor and manage all organisations, entities, users, and practices across the platform."

2. **Step 2 -- "Navigation"**: Spotlight targets the admin nav bar (`[data-tour="admin-nav"]`). Title: "Quick navigation". Description: "Jump between Groups, Users, Entities, and Practices to manage platform-wide resources."

3. **Step 3 -- "Practice masquerade"**: Spotlight targets the Practices nav item (`[data-tour="admin-practices"]`). Title: "View as any practice". Description: "Masquerade into any practice to see what they see -- debug issues, verify setup, and provide hands-on support."

---

### User Story 7 -- Portal Header Branding (Priority: P2)

Each portal surface gets a distinctive branded header so users can instantly tell which "mode" they're in. Three visual identities for three portals.

**Acceptance Scenarios**:

1. **Given** I navigate to `/practice/*`, **When** the page loads, **Then** the header bar uses a dark-themed style (`bg-slate-900 text-white` in light mode, `bg-slate-950` in dark mode) that is visually distinct from the workspace sidebar layout. This mirrors XPM's dark navy header approach.

2. **Given** I am in the practice portal, **When** I look at the header, **Then** the practice name is displayed prominently with a dropdown indicator (like XPM's "Hailstone Advisory Pty Ltd" dropdown), and nav items (Home, Clients, Jobs, Staff, etc.) use white/light text against the dark background.

3. **Given** I am in the admin/provider portal, **When** the page loads, **Then** the header uses a teal/dark-teal theme (`bg-teal-900`) with the Shield icon and "Super Admin" badge, visually distinct from both the workspace and practice portals.

4. **Given** I am in the workspace (entity) view, **When** I compare it to the practice and admin views, **Then** all three are clearly visually distinct. The workspace uses a sidebar with light background, the practice uses a dark navy top-nav, and the admin uses a teal top-nav. A user can instantly tell which mode they're in.

5. **Given** I am in dark mode in any portal, **When** I view the header, **Then** it still reads as distinct from the others -- each portal uses a different tonal shift against the dark background.

6. **Given** the practice header is updated to the dark theme, **When** existing interactive elements (dropdowns, buttons, links) are used, **Then** they remain fully functional with correct contrast ratios (minimum 4.5:1 for normal text per WCAG AA).

---

### User Story 8 -- Last Login Display (Priority: P3)

XPM shows "Last login: 24 seconds ago from Australia" in the dashboard header. This is a trust/security signal and orientation cue.

**Acceptance Scenarios**:

1. **Given** the API returns `last_login_at` and `last_login_location` on the user object, **When** I view the practice or workspace dashboard, **Then** I see "Last login: {relative time} from {location}" in the top-right area below the header, styled as subtle muted text.

2. **Given** this is the user's first login, **When** the dashboard loads, **Then** the last login line is hidden (no "Last login: never" -- just omit it).

3. **Given** the location is not available (geo-IP lookup failed), **When** displayed, **Then** it shows "Last login: {relative time}" without the location.

4. **Backend**: The `last_login_at` timestamp and `last_login_ip` are already available via Fortify's login event. Add `last_login_at`, `last_login_ip`, and `last_login_location` columns to the `users` table. Listen for `Illuminate\Auth\Events\Login` in the EventServiceProvider and update the previous login data before overwriting with current values. Use MaxMind GeoLite2 (free tier, country-level only) via the `geoip2/geoip2` Composer package for IP-to-country resolution. Store the resolved country name (e.g. "Australia") in `last_login_location`.

5. **Given** the application is running in local/testing environment, **When** the login IP is `127.0.0.1` or a private IP, **Then** the location lookup is skipped and `last_login_location` is set to null (no "from Unknown" display).

---

### User Story 9 -- Help Overlay Tour Integration (Priority: P2)

The existing keyboard shortcuts overlay (`?`) is extended with a "Take a tour" action so users can re-trigger tours after initial completion.

**Acceptance Scenarios**:

1. **Given** the `?` help overlay is open, **When** I look at the bottom of the overlay, **Then** I see a "Take a tour" link/button that triggers the relevant tour for the current portal (practice tour on practice pages, workspace tour on workspace pages, admin tour on admin pages).

2. **Given** no tour is registered for the current page, **When** the help overlay renders, **Then** the "Take a tour" link is not shown.

3. **Given** I click "Take a tour" from the help overlay, **When** the tour starts, **Then** the help overlay closes first, then the tour begins after a 300ms delay (so the overlay close animation doesn't collide with the tour backdrop).

---

## Technical Design

### Component API

#### `<FeatureTour>`

```tsx
type TourStep = {
  target: string;           // CSS selector (e.g. '[data-tour="nav"]')
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  media?: React.ReactNode;  // optional image/video in tooltip
};

type TourDefinition = {
  id: string;                      // unique tour identifier (for persistence)
  steps: TourStep[];
  trigger?: 'first-visit' | 'manual';
  priority?: number;               // lower = higher priority, default 10
  onComplete?: () => void;
  onSkip?: () => void;
};

type FeatureTourProps = {
  tour: TourDefinition;
  backdropOpacity?: number;        // default 0.5
  spotlightPadding?: number;       // px around target, default 8
  delay?: number;                  // ms before auto-start, default 500
};
```

#### `<Stepper>`

```tsx
type StepperStep = {
  id: string;
  label?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type StepperProps = {
  steps: StepperStep[];
  currentStep: number;
  completedSteps?: Set<number>;
  variant?: 'default' | 'compact' | 'labeled';
  orientation?: 'horizontal' | 'vertical';
  clickable?: boolean;
  onStepClick?: (index: number) => void;
  className?: string;
};
```

#### Tour Store (Zustand)

```tsx
type TourState = {
  completedTours: Record<string, { completedAt: string }>;
  activeTourId: string | null;
  currentStep: number;

  startTour: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: (id: string) => void;
  skipTour: () => void;
  resetTour: (id: string) => void;
  isTourCompleted: (id: string) => boolean;
};
```

The store uses `zustand/middleware/persist` with key `"moneyquest-tours"` (matching the existing `"moneyquest-workspace"` and `"moneyquest-search"` naming convention).

#### Tour Registry

Tours are registered via a simple registry pattern -- each portal layout imports and renders its own `<FeatureTour>` component with the relevant tour definition. No global registry is needed; the Zustand store handles deduplication and priority.

```tsx
// In practice layout:
import { practiceWelcomeTour } from '@/components/tour/tours/practice-welcome';
// ...
<FeatureTour tour={practiceWelcomeTour} />

// In workspace layout:
import { workspaceWelcomeTour } from '@/components/tour/tours/workspace-welcome';
// ...
<FeatureTour tour={workspaceWelcomeTour} />
```

To add a new tour, a developer creates a tour definition file in `components/tour/tours/` and renders `<FeatureTour>` in the appropriate layout. No central config file to maintain.

### File Structure

```
frontend/src/
├── components/
│   ├── tour/
│   │   ├── feature-tour.tsx          # Main FeatureTour component
│   │   ├── tour-tooltip.tsx          # Tooltip card (title, desc, nav)
│   │   ├── tour-backdrop.tsx         # SVG backdrop with spotlight cutout
│   │   └── tours/                    # Tour definitions per portal
│   │       ├── practice-welcome.ts   # Practice portal welcome tour (4 steps)
│   │       ├── workspace-welcome.ts  # Workspace welcome tour (5 steps)
│   │       └── provider-welcome.ts   # Admin/provider portal tour (3 steps)
│   └── ui/
│       └── stepper.tsx               # Reusable Stepper component
├── stores/
│   └── tour.ts                       # Zustand tour state store
```

### Backdrop Implementation

The spotlight backdrop uses an SVG overlay with a `<mask>` element. The mask contains a white rectangle (showing backdrop) with a black rounded-rectangle cutout positioned over the target element. This approach:
- Works with any element shape/size
- Supports smooth CSS transitions when moving between targets
- Doesn't interfere with the target element's click events (cutout is transparent)
- Handles scroll position changes via ResizeObserver/IntersectionObserver

The backdrop renders via `createPortal` into `document.body` (using React's built-in `createPortal`, not Radix Portal) at `z-[60]` -- above the sticky headers (`z-50`) but below any existing modals/dialogs.

### Accessibility Implementation

- **Focus trap**: When tour is active, focus is trapped within the tooltip card using a lightweight focus-trap (manual implementation with `tabIndex` management, no external library). On tour start, focus moves to the tooltip. On tour end, focus returns to the element that was focused before the tour started.
- **ARIA**: The tooltip has `role="dialog"` and `aria-label="Feature tour step {n} of {total}: {title}"`. A visually-hidden `aria-live="polite"` region announces step changes.
- **Keyboard**: Escape dismisses. Left/Right arrows navigate. Tab cycles within tooltip.
- **Reduced motion**: When `prefers-reduced-motion: reduce` is active, all transitions are instant (no 150ms ease).

### Portal Header Theming

Each portal shell already has its own component. The branding update changes each header's background to create visual distinctiveness:

**Practice Portal** ([practice-shell.tsx](/initiatives/FL-financial-ledger/075-FTS-feature-tour-stepper/spec)):
```tsx
// Before
<header className="sticky top-0 z-50 border-b bg-background">
// After -- dark navy (like XPM)
<header className="sticky top-0 z-50 border-b bg-slate-900 text-slate-100 dark:bg-slate-950 dark:border-slate-800">
```

**Admin/Provider Portal** ([admin-shell.tsx](/initiatives/FL-financial-ledger/075-FTS-feature-tour-stepper/spec)):
```tsx
// Before
<header className="sticky top-0 z-50 border-b bg-background">
// After -- dark teal
<header className="sticky top-0 z-50 border-b bg-teal-900 text-teal-50 dark:bg-teal-950 dark:border-teal-800">
```

**Entity/Workspace** -- retains existing sidebar layout with `bg-background`. No header change needed -- the sidebar IS the brand differentiator.

Nav items, icons, and dropdown menus update their color tokens accordingly. `data-tour="*"` attributes are added to key elements in all three shells for tour targeting.

### Last Login Backend Implementation

**Migration**: Add three columns to `users` table:
```php
$table->timestamp('last_login_at')->nullable();
$table->string('last_login_ip', 45)->nullable(); // 45 chars for IPv6
$table->string('last_login_location', 100)->nullable();
```

**Listener**: Register `Illuminate\Auth\Events\Login` in EventServiceProvider with a `RecordLastLogin` listener that:
1. Copies current `last_login_at` / `last_login_ip` / `last_login_location` to `previous_login_*` -- not needed for V1, we only show the last login (which is the login BEFORE the current session, captured at the moment of the current login).
2. Updates `last_login_at = now()`, `last_login_ip = request()->ip()`.
3. Resolves country from IP via MaxMind GeoLite2 (`geoip2/geoip2` Composer package, free GeoLite2-Country database). Skips resolution for `127.0.0.1`, `::1`, and RFC 1918 private IPs.

**API**: The existing `/api/v1/user` endpoint includes `last_login_at` and `last_login_location` in its response. No new endpoint needed.

---

## Migration Path

### Replacing Existing Steppers

The existing `StepIndicator` in `/practice/setup` ([setup/page.tsx:160-192](/initiatives/FL-financial-ledger/075-FTS-feature-tour-stepper/spec)) is replaced by the new `<Stepper>` component:

```tsx
// Before (bespoke)
<StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

// After (reusable)
<Stepper
  steps={STEPS.map(s => ({ id: String(s.id), label: s.label, icon: s.icon }))}
  currentStep={currentStep - 1}
  completedSteps={completedSteps}
  variant="labeled"
/>
```

The `@stepperize/react` dependency (used in `form-layout-09`) can be retained for complex wizard state management, but the visual stepper component is our own.

---

## Dependencies

- **No new npm packages** -- built with existing primitives (React `createPortal`, Tailwind, Zustand, lucide-react)
- Uses `ResizeObserver` and `IntersectionObserver` (browser-native, no polyfill needed)
- Tour definitions reference `data-tour` attributes that must be added to target elements
- **Backend (User Story 8 only)**: `geoip2/geoip2` Composer package + MaxMind GeoLite2-Country database download (free, requires MaxMind account for license key)

---

## Clarifications

### Session 2026-04-01 (autonomous)

- Q: What happens when the user navigates away mid-tour (e.g. clicks a link, browser back)? --> A: The tour dismisses as "skipped" (not completed). It will re-appear on the next visit to the originating page. We listen for Next.js router events (`routeChangeStart` / `popstate`) to detect navigation and call `skipTour()`. Added as acceptance scenario 14 in User Story 1.

- Q: What happens when the target element resizes or moves mid-tour (e.g. window resize, sidebar toggle)? --> A: The spotlight cutout and tooltip reposition to track the target via ResizeObserver on the target element plus a window resize listener. This is a debounced recalculation (100ms). Added as acceptance scenario 15 in User Story 1.

- Q: What is the mobile behaviour for tours? --> A: V1 tours are suppressed on viewports below the `sm` breakpoint (640px), matching the practice-shell's existing `hidden sm:inline` pattern. Mobile onboarding is deferred. Added to Out of Scope and as acceptance scenario 16 in User Story 1.

- Q: What accessibility requirements apply (screen reader, focus management, reduced motion)? --> A: WCAG 2.1 AA. Focus is trapped within the tooltip during the tour. Screen reader announcements via `aria-live="polite"` on step change. Tooltip has `role="dialog"`. Reduced motion users get instant transitions. Added Non-Functional Requirements section and acceptance scenarios 11-13 in User Story 1. Detailed in Accessibility Implementation subsection.

- Q: What are the performance targets? --> A: < 5kB gzipped bundle addition. Backdrop + tooltip render within a single frame (16ms). Step transitions under 150ms. Added to Non-Functional Requirements section.

- Q: How is tour priority determined when multiple tours target the same page? --> A: A `priority` field on the tour definition (numeric, lower = higher priority, default 10). The Zustand store filters to uncompleted tours, sorts by priority, and starts only the highest-priority one. Added to TourDefinition type and acceptance scenario 6 in User Story 3.

- Q: What are the migration details for last_login columns? --> A: Three new nullable columns on the `users` table: `last_login_at` (timestamp), `last_login_ip` (string, 45 chars for IPv6), `last_login_location` (string, 100 chars). The listener fires on Laravel's `Illuminate\Auth\Events\Login` event. Detailed in the Last Login Backend Implementation subsection and acceptance scenarios 4-5 in User Story 8.

- Q: Why not use react-joyride or another existing library? --> A: react-joyride adds ~45kB gzipped, has theming that fights shadcn/ui, and uses an imperative API that doesn't fit our declarative React + Zustand patterns. driver.js and Shepherd.js were also considered and rejected. Our SVG mask approach is ~200 lines of code with full control. Added Rejected Alternatives table.

- Q: The spec uses "entity" and "workspace" inconsistently -- which is canonical? --> A: Both are valid. "Workspace" is the model/code name, "entity" is the business concept. They are interchangeable. Added Terminology section to clarify. User Story 5 title updated from "Entity (Workspace)" to just "Workspace" for consistency.

- Q: Which geo-IP service should be used for last login location? --> A: MaxMind GeoLite2-Country (free tier). Country-level resolution only (not city). Use the `geoip2/geoip2` Composer package. The GeoLite2-Country database file is downloaded during deployment/setup (requires a free MaxMind license key). Private/local IPs skip the lookup entirely. Detailed in acceptance scenario 4-5 of User Story 8 and Last Login Backend Implementation.

- Q: How does the "?" help menu integrate with tours for re-triggering? --> A: The existing `KeyboardShortcutsOverlay` component gets a "Take a tour" link at the bottom. It determines which tour to offer based on the current route (practice pages offer practice tour, workspace pages offer workspace tour, admin pages offer admin tour). If no tour is registered for the current page, the link is hidden. Added as User Story 9.

- Q: How do developers register new tours (modular pattern)? --> A: No global registry. Each tour is a plain TypeScript object exported from a file in `components/tour/tours/`. The portal layout that owns the tour renders `<FeatureTour tour={tourDef} />`. To add a tour, create a definition file and render the component in the appropriate layout. The Zustand store handles completion state and deduplication. Documented in Tour Registry subsection.

- Q: What z-index does the tour backdrop use relative to existing UI layers? --> A: `z-[60]` -- above sticky headers (`z-50`) but below modals/dialogs which use shadcn's default z-indexing. This prevents the tour from blocking critical error dialogs while still overlaying navigation. Documented in Backdrop Implementation.

- Q: What happens if ALL tour steps target elements that don't exist? --> A: The tour silently does not start and no error is thrown. This handles cases where feature flags hide all targeted elements. Clarified in acceptance scenario 8 of User Story 1.

- Q: What is the localStorage key naming convention for tour state? --> A: `"moneyquest-tours"`, following the existing pattern of `"moneyquest-workspace"`, `"moneyquest-search"`, and `"moneyquest-practice-masquerade"`. Documented in Tour Store section.

- Q: Should the tour version cleanup (v1 -> v2) happen automatically or manually? --> A: Automatically. When the store initialises, it can detect tour IDs that share a base prefix (e.g. `practice-welcome-v1` vs `practice-welcome-v2`) and remove old versions. This is a best-effort cleanup -- stale keys in localStorage are harmless. The tour ID convention is `{portal}-{name}-v{n}`.

- Q: How does the practice header dark theme affect existing interactive elements (dropdowns, badges, buttons)? --> A: All interactive child elements in the practice header must switch to light-on-dark colour tokens. Dropdown menus (which render in a portal) retain their standard theming. The header's nav links, avatar, and notification bell get updated text/hover classes. A contrast audit is required (4.5:1 minimum). Added acceptance scenario 6 in User Story 7.

- Q: What rendering approach for the backdrop -- DOM overlay or SVG mask? --> A: SVG mask via `createPortal` into `document.body`. React's built-in `createPortal` (not Radix Portal) is used to avoid an unnecessary dependency. The SVG mask approach is already documented in the Backdrop Implementation section. Clarified the portal mechanism.
