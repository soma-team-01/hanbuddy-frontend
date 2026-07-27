# HanBuddy Responsive Web Redesign

**Status:** User-approved design and remote execution brief

**Approved:** 2026-07-27

**Target repository:** `hanbuddy-frontend`

**Approved base:** `develop` at `2805719` (`fix: 백엔드 에러 코드 기반 다국어 메시지 표시 (#33)`)

## 1. Purpose of This Document

This document is self-contained so the redesign can be implemented from another device without access to the original design conversation, visual-companion server, or Figma file.

It records the approved product decisions, visual tokens, responsive rules, route coverage, implementation constraints, and acceptance criteria. If the sibling `hanbuddy-landing` repository is unavailable on the remote device, use the exact values in this document.

For this redesign, this specification supersedes the Figma-specific implementation guidance currently present in `AGENTS.md`. The implementation must remove that obsolete Figma guidance and replace it with the responsive-web rules summarized here.

## 2. Approved Outcome

Convert the entire frontend from a mobile-app-like 390px presentation into a responsive experience marketplace website while preserving existing routes, behavior, API contracts, BFF boundaries, authentication, payment behavior, and internationalization.

The finished site must:

- use the current `hanbuddy-landing` warm-red palette exactly;
- use Plus Jakarta Sans for display text, DM Sans for body/UI text, and Noto Sans KR for Korean;
- use a unified top navigation on desktop;
- use a top header with a hamburger menu on mobile;
- remove the persistent mobile bottom navigation;
- use mobile-only sticky action bars where a transactional action genuinely needs one;
- adapt every current screen, not only the tourist discovery flow;
- retain the current frontend service home instead of replacing it with a redirect;
- stop using Figma frames and node IDs as implementation authority;
- borrow proven marketplace patterns from Airbnb Experiences, GetYourGuide, and Klook without copying their branding or inventing unsupported product data.

## 3. Explicit User Decisions

The following decisions are final unless the user explicitly revises them:

1. Apply the landing project's color values and font combination exactly.
2. Keep semantic success, warning, and danger colors distinct from the brand primary.
3. Redesign all screens: service home, authentication, onboarding, tourist flows, buddy flows, shared profile flows, dialogs, and payment result screens.
4. Treat the old Figma screens as obsolete. Preserve information, functions, and user flows, but freely redesign layout and components for responsive web.
5. Keep the frontend repository's current service home route and redesign it with the rest of the site.
6. Use one global navigation model:
   - desktop: horizontal top navigation;
   - mobile: top header and hamburger menu;
   - no persistent bottom navigation.
7. Components may differ from the landing page when a marketplace web pattern is more usable. The brand foundation stays identical; operational components need not all be pill-shaped.
8. Use this marketplace synthesis:
   - Airbnb Experiences for photography, host personality, and experience storytelling;
   - GetYourGuide for decision-ready trust information and clear booking actions;
   - Klook for practical search, filters, and option selection, used sparingly.

## 4. Non-Goals

This redesign does not authorize:

- changing backend endpoints, DTOs, or BFF architecture;
- changing route URLs or the locale routing model;
- redesigning authentication, payment, or booking business rules;
- introducing unsupported search/filter APIs;
- displaying invented availability, discount, popularity, booking-count, cancellation, language, duration, or capacity claims;
- copying another marketplace's colors, logos, typography, illustrations, or exact component composition;
- introducing a general-purpose design-system package or Storybook unless independently justified by implementation needs;
- changing the separate `hanbuddy-landing` repository.

## 5. Source References

### HanBuddy brand source

The active landing source of truth is the current warm-red design, not the older Berry Violet proposal that remains in landing history.

If available locally, verify against:

- sibling repository: `../hanbuddy-landing`;
- `../hanbuddy-landing/DESIGN.md`;
- `../hanbuddy-landing/index.html`;
- landing commit `d676c63` and later current commits.

### Marketplace pattern references

- Airbnb Seoul Experiences: <https://www.airbnb.com/seoul-south-korea/things-to-do>
- Airbnb Seoul baseball experience detail: <https://www.airbnb.com/experiences/4217908>
- GetYourGuide Seoul activities: <https://www.getyourguide.com/seoul-l197/local-food-tours-tc532/>
- Klook Seoul activities: <https://www.klook.com/en-SG/destination/c13-seoul/>
- Klook activity detail example: <https://www.klook.com/activity/88165-seoul-main-attraction-tour/>

Use these as interaction and information-architecture references only.

## 6. Visual Foundation

### 6.1 Color tokens

Replace the current Figma-derived `cream`, `forest`, `sage`, `earth`, `chip`, and `sand` vocabulary with role-based tokens.

| Role              | Token               | Exact value | Use                                               |
| ----------------- | ------------------- | ----------- | ------------------------------------------------- |
| Page canvas       | `canvas`            | `#fffaf7`   | Default page background                           |
| Clean surface     | `canvas-soft`       | `#ffffff`   | Header, dialogs, high-clarity surfaces            |
| Primary           | `primary`           | `#d13f32`   | Main actions and active interaction states        |
| Primary hover     | `primary-hover`     | `#b9342b`   | Hover and pressed primary actions                 |
| Primary strong    | `primary-strong`    | `#8f2f28`   | Accessible branded text, focus, strong emphasis   |
| Primary soft      | `primary-soft`      | `#fff0ec`   | Quiet branded surfaces and selected states        |
| Primary text      | `ink`               | `#261b18`   | Headings and primary body text                    |
| Secondary text    | `muted`             | `#675b56`   | Supporting copy and metadata                      |
| Strong border     | `line-strong`       | `#d6c5bf`   | Inputs, selected boundaries, focus-adjacent edges |
| Soft border       | `line-soft`         | `#eee2dd`   | Hairlines and quiet outlines                      |
| Neutral panel     | `panel`             | `#f8f3f0`   | Grouped content and neutral cards                 |
| Raised panel      | `panel-raised`      | `#fcf8f6`   | Subtle raised surfaces                            |
| On-primary        | `on-primary`        | `#ffffff`   | Text and icons on primary fills                   |
| On-primary strong | `on-primary-strong` | `#ffffff`   | Text and icons on strong primary fills            |

Retain the existing semantic intent:

| State        | Token          | Value     |
| ------------ | -------------- | --------- |
| Success      | `success`      | `#3f6b46` |
| Success soft | `success-soft` | `#dcead9` |
| Warning      | `warning`      | `#7a5210` |
| Warning soft | `warning-soft` | `#f6e3c2` |
| Danger       | `danger`       | `#cf3d33` |

Add a danger-soft token only if a real component needs it and verify accessible contrast.

Do not mechanically assign red values to legacy names such as `forest`. Migrate each usage according to meaning:

- brand CTA or active state → `primary`;
- high-contrast brand text or focus → `primary-strong`;
- heading/body text → `ink`;
- supporting text → `muted`;
- neutral container → `panel` or `panel-raised`;
- selected/quiet brand container → `primary-soft`;
- genuine completion/warning/error → semantic state tokens.

### 6.2 Typography

Use `next/font/google` in the locale root layout.

| Role                 | Family            | Weights            |
| -------------------- | ----------------- | ------------------ |
| Display and headings | Plus Jakarta Sans | 600, 700, 800      |
| Body and interface   | DM Sans           | 400, 500, 600, 700 |
| Korean glyphs        | Noto Sans KR      | 400, 500, 600, 700 |

Recommended Tailwind roles:

- `font-display`: Plus Jakarta Sans, then Noto Sans KR, then system sans;
- `font-sans`: DM Sans, then Noto Sans KR, then system sans.

Rules:

- default body size: 16px on content pages where space permits;
- minimum body/helper size: 14px;
- compact labels: minimum 12px;
- display tracking may use approximately `-0.025em`;
- only eyebrows and compact uppercase labels receive wide tracking;
- do not add handwriting fonts to the application UI;
- load only weights actually used and verify build-time font fetching in the project environment.

### 6.3 Shape, depth, and motion

- Activity and content cards: approximately 16px radius.
- Inputs and operational buttons: approximately 8–12px radius.
- Marketing CTAs and compact chips: pill radius.
- Use tonal surfaces and hairline borders before shadows.
- Use subtle shadows only for sticky booking panels, menus, dialogs, and truly floating surfaces.
- Preserve the existing reduced-motion handling.
- Use the landing's low-motion interaction character; avoid parallax, glows, and decorative gradients.
- The existing logo gradient may remain the only decorative brand gradient.

## 7. Responsive Architecture

### 7.1 Viewport model

Use content-driven CSS while treating these ranges as design validation targets:

- mobile: below 768px;
- tablet: 768px through 1023px;
- desktop: 1024px and above;
- main content maximum: approximately 1200px with responsive side padding.

Remove the application-wide 390px centered mobile frame. Pages should occupy the available viewport and use an appropriate inner content measure.

### 7.2 Global navigation

Create a responsive global site header.

Desktop behavior:

- HanBuddy logo/wordmark at the start;
- role-appropriate primary destinations in a horizontal navigation;
- locale control and authenticated profile/action area at the end;
- active navigation state indicated by more than color alone;
- one consistent header height and hairline bottom border.

Mobile behavior:

- HanBuddy logo/wordmark;
- essential locale/profile affordance where space permits;
- hamburger button opening an accessible right-side drawer over a dismissible backdrop;
- menu contains the same destinations as desktop;
- focus moves into the menu, Escape closes it, focus returns to the trigger, and background scrolling is controlled;
- no persistent `BottomNavBar`.

Page-level back, close, title, and action controls remain separate from global navigation. Refactor the existing `TopAppBar` into a page header/subheader pattern rather than treating it as the global site header.

### 7.3 Transaction actions

The absence of bottom navigation does not remove transactional actions.

- On mobile, booking, payment, onboarding completion, or activity creation may use a safe-area-aware sticky bottom action bar.
- On desktop, the same action belongs in an inline form footer or sticky side booking panel.
- Never show both a global bottom navigation and a bottom action bar.
- Account for iOS safe-area insets and prevent content from being hidden behind sticky actions.

## 8. Page Families and Route Coverage

All current pages are in scope.

| Family                   | Current routes                                            | Desktop                                                                                                                      | Mobile                                                    |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Service home             | `/` and `/home` equivalents under locale routing          | Full-width responsive hero and supporting content within the global header                                                   | Single-column content with mobile header/menu             |
| Authentication           | `/login`                                                  | Focused centered panel with appropriate surrounding whitespace                                                               | Full-width compact panel; no artificial phone frame       |
| Onboarding/form          | `/onboarding`, `/my-page/edit`, `/my-activities/create`   | Readable 720–800px form measure; related fields may form two columns                                                         | One column; sticky completion action only when useful     |
| Discovery/collection     | `/explore`, `/applications`, `/my-activities`, `/my-page` | Three columns at standard desktop widths and up to four at wide desktop widths, or a structured list/table according to data | One-column cards/list; filters collapse progressively     |
| Experience detail/action | `/activities/[id]`, `/activities/[id]/book`               | Main content plus sticky booking/action panel                                                                                | Stacked content plus mobile sticky action                 |
| Buddy workspace          | `/dashboard`, `/my-activities/[id]/applicants`            | Summary grid and structured rows/table where useful                                                                          | Summary cards and card-based records                      |
| Payment result           | `/payments/success` and any sibling payment result states | Centered result with clear next actions                                                                                      | Single-column result with full-width actions              |
| Dialogs/overlays         | cancellation and confirmation flows                       | Centered modal                                                                                                               | Bottom sheet or compact modal according to content length |

Specific responsive rules:

- discovery cards: 1 column on mobile, usually 2 on tablet, 3 on standard desktop, and up to 4 when the container can preserve a readable card width;
- activity detail: photography/content column plus action column on desktop;
- long forms must not stretch to the full desktop container;
- dashboards may use tables only when comparison across rows is meaningful;
- any desktop table must have a deliberate mobile card/list representation, not horizontal overflow;
- empty, loading, error, and unauthorized states must use the same responsive container rules.

## 9. Marketplace Pattern Synthesis

### 9.1 Discovery: Airbnb influence

Prioritize:

- large and consistent activity photography;
- concise titles and decision-useful metadata;
- visible buddy identity where available;
- generous spacing and low visual chrome;
- saved/favorite affordance only if backed by existing product behavior.

Do not fill cards with every possible badge. The primary scan should be image, title, place, host, rating, and price when those fields exist.

### 9.2 Detail and booking: GetYourGuide influence

Organize decision information clearly:

- hero gallery or strong hero image;
- title, location, rating, host, and price;
- availability and primary booking action;
- included items, restrictions, meeting point, and cancellation information where provided;
- sticky desktop action panel and mobile sticky action bar;
- trust information near the action, but only when supported by backend data.

### 9.3 Search and options: light Klook influence

Use:

- compact search/filter tools where the backend actually supports them;
- clear date, guest, and option selection;
- progressive disclosure for dense package details;
- sort controls only when sorting is real and useful.

Avoid:

- unsupported promotion badges;
- fake urgency;
- booked-count social proof not supplied by the API;
- dense stacks of labels that obscure the experience and buddy relationship.

### 9.4 HanBuddy-specific identity

HanBuddy is not a generic attraction-ticket catalogue. Preserve its product position as local-buddy matching plus cultural context.

Compared with the reference platforms, give relatively more weight to:

- who the buddy is;
- what local context the buddy adds;
- what the guest will do together with the buddy;
- clear group and meeting expectations;
- safe, concrete next steps.

## 10. Component System

Create or refactor shared components around roles instead of page-specific styling.

### Navigation and layout

- `SiteHeader`: responsive global header.
- `MobileMenu`: accessible right-side hamburger-menu drawer with a dismissible backdrop.
- `PageContainer`: shared max width and responsive gutters.
- `PageHeader`: breadcrumb/back context, title, description, and page actions.
- `BottomActionBar`: mobile transaction action only; hidden or transformed on desktop.

### Marketplace content

- `ActivityCard`: responsive photography-first card.
- `SearchFilterBar`: search and supported filters with progressive collapse.
- `BookingPanel`: desktop action panel that shares booking content/state with mobile actions.
- `HostSummary`: avatar, name, languages/context when available.
- `StatusBadge`: branded selection state or semantic lifecycle state.

### Forms and feedback

- inputs retain explicit labels and visible focus states;
- group related fields into desktop columns only when reading order remains clear;
- primary operational buttons use 8–12px radius rather than forcing every action into a pill;
- marketing/high-level CTAs may remain pills;
- confirmation and action dialogs use a centered desktop modal and a mobile bottom sheet while sharing content and behavior; compact informational alerts may remain centered when they fit safely within the mobile viewport;
- destructive actions remain visually distinct and never use the brand primary as their only warning.

### Data-heavy buddy screens

- use summary cards for high-level counts/status;
- use structured rows or tables on desktop where column comparison matters;
- render the same records as labeled cards on mobile;
- keep create/manage actions obvious without turning the tourist surface into an admin dashboard.

## 11. Data, Errors, and State

This is a presentation and responsive-architecture change. Preserve the existing data flow:

```text
React UI → same-origin /api/* BFF Route Handler → backend
```

Requirements:

- do not call the backend directly from browser components;
- verify current Swagger/OpenAPI shapes before exposing new metadata;
- do not hard-code reference-platform data into production UI;
- preserve current loading, retry, authentication redirect, and error-code localization behavior;
- keep errors near their relevant field/action and provide a page-level fallback where appropriate;
- keep English and Korean layouts stable when copy length differs;
- preserve payment idempotency and external redirect behavior.

## 12. Documentation Changes

Update `AGENTS.md` during implementation:

- remove the Figma file key, page/node inventory, screenshot workflow, and Figma MCP notes;
- remove wording that treats 390px Figma frames as the implementation standard;
- replace the old shared UI patterns with the approved responsive navigation, page-family, token, and marketplace-reference rules;
- keep unrelated backend, branching, CI, Vercel, commit, and safety instructions intact.

Do not remove historical Figma references from unrelated git history or old documents merely for cleanup. Update the active project instructions and any active source comments that claim Figma is the current source of truth.

## 13. Recommended Implementation Sequence

The remote implementation agent should create a detailed plan before editing code. The plan should broadly follow this dependency order:

1. Confirm a clean base and create a feature branch from current `develop`.
2. Read the relevant Next.js 16 App Router and font documentation from `node_modules/next/dist/docs/` before editing framework code.
3. Add or update tests for the new font variables, semantic tokens, and responsive global navigation.
4. Replace global colors and fonts in `globals.css` and the locale root layout.
5. Add/reuse the approved HanBuddy logo asset if the frontend lacks it.
6. Implement `SiteHeader`, `MobileMenu`, `PageContainer`, and revised page-header/action primitives.
7. Remove the persistent `BottomNavBar` from rendered layouts.
8. Convert shared UI components to the approved semantic tokens and web-adapted shapes.
9. Convert routes by page family: home/auth, discovery, detail/booking, shared profile, buddy workspace, payment results, dialogs.
10. Update active project documentation, including removal of obsolete Figma guidance.
11. Run automated checks and verify representative pages at all target widths in both locales.

Do not perform a blind global replacement from `forest` to `primary`. Audit each use for semantic meaning.

## 14. Verification

### Automated checks

Run the same sequence as CI:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Update existing tests affected by font imports and layout providers. Add focused tests for:

- global navigation destinations for tourist and buddy roles;
- mobile menu open/close and keyboard behavior;
- removal of rendered bottom navigation;
- semantic token presence and retired token absence;
- responsive transaction-action variants where behavior changes;
- preservation of localized error rendering.

### Visual and interaction checks

Verify representative routes at approximately:

- 390px mobile;
- 768px tablet;
- 1024px small desktop;
- 1440px desktop.

Check both English and Korean. At minimum verify:

- service home;
- login and onboarding;
- tourist discovery, detail, booking, and applications;
- buddy dashboard, activity list/create, and applicants;
- profile and profile editing;
- payment success;
- confirmation/cancellation overlays.

Validate:

- no application-wide 390px frame remains;
- no unintended horizontal scrolling;
- the mobile menu is keyboard and screen-reader usable;
- sticky actions do not cover content;
- desktop action panels do not overlap footers;
- long Korean strings do not break layouts;
- focus, hover, active, disabled, loading, success, warning, and danger states remain distinguishable;
- primary and text colors meet WCAG AA for their actual use;
- activity imagery preserves aspect ratio and meaningful alt text.

## 15. Acceptance Criteria

The redesign is complete only when all of the following are true:

1. All current routes are usable from mobile through desktop without an artificial phone frame.
2. Desktop uses the approved horizontal global header.
3. Mobile uses the approved top header and hamburger menu.
4. The persistent bottom navigation is no longer rendered.
5. Transaction screens retain a clear, non-overlapping action on every viewport.
6. The exact warm-red brand tokens and approved font families are active.
7. Legacy `forest`/`sage`/`earth` presentation tokens are removed from active UI code rather than redefined to unrelated colors.
8. Semantic success, warning, and danger states retain their meaning.
9. Discovery is photography- and buddy-led, detail/booking is decision-ready, and filters remain limited to supported product capabilities.
10. Existing routes, API/BFF behavior, authentication, payment, and localization remain functional.
11. Active `AGENTS.md` Figma implementation guidance is removed and replaced with responsive-web guidance.
12. The full local CI command sequence passes.
13. Representative visual checks pass at 390, 768, 1024, and 1440px in English and Korean.

## 16. Remote-Agent Kickoff Prompt

Use the following prompt on the remote device after checking out the branch that contains this document:

> Implement the approved HanBuddy responsive web redesign described in `docs/superpowers/specs/2026-07-27-hanbuddy-responsive-web-redesign-design.md`. Treat that document as the complete design and execution source of truth for this task. Preserve all existing behavior, routes, BFF boundaries, authentication, payment logic, and i18n. Remove obsolete Figma implementation guidance from active project instructions. Before writing Next.js code, read the relevant local Next.js 16 documentation under `node_modules/next/dist/docs/`. Create a detailed implementation plan, work test-first, migrate colors by semantic meaning rather than blind replacement, and run the full CI-equivalent verification plus responsive browser checks before claiming completion.

## 17. Handoff Notes

- The visual-companion files under `.superpowers/brainstorm/` are ignored local artifacts and are not required for remote execution.
- No application implementation was performed in the original session; the committed specification is the only intentional tracked change.
- The original conversation selected the unified top-navigation direction and then selected mobile top-menu option A2 instead of retaining the bottom tabs.
- The user explicitly approved redesigning components beyond the landing's component shapes when necessary for a responsive marketplace website.
- No unresolved product choice remains in this specification. If a low-level styling decision is not stated, prefer consistency, accessibility, and the smallest reusable abstraction that serves current routes.
