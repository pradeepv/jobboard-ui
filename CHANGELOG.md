# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Redesign of the timeline (vertical rail + grouped categories) is on hold. We will revisit to finalize layout, spacing, and LTR/RTL handling.

## [0.2.0] - 2025-08-28

### Added

- Introduced GroupedTimeline component to group events by type (Jobs, Companies, Interview) with a single vertical rail.
  - File: `src/components/GroupedTimeline.tsx`
  - Features: section headers per category, colored dots per event, chronological sort within each group.

### Changed

- Home page now renders `GroupedTimeline` using mock data.
  - File: `src/app/page.tsx`

### Fixed

- Ensured timeline vertical rail renders reliably using absolute positioning (`left-3 top-0 bottom-0`) and proper padding/offset on list items.

## [0.1.0] - 2025-08-28

### Added

- Timeline component that accepts typed `events` and renders cards with tags, location chips, and optional links.
  - File: `src/components/Timeline.tsx`
- Centralized mock data for events.
  - File: `src/data/mockEvents.ts`
- App shell and base styling via Tailwind.
  - Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

### Notes

- TypeScript path alias `@/*` expected to point to `src/*` (configure in `tsconfig.json`).
- Tailwind required; ensure `@tailwind base; @tailwind components; @tailwind utilities;` in `globals.css`.

[Unreleased]: https://github.com/pradeep/personal-job-board/compare/v0.2.0...HEAD