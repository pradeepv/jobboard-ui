# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2025-09-17

### Added

  - Analysis Modal
    - Added a Job Summary panel at the top of the modal that displays job title, company, location, link to posting, and a description. The panel is populated from live analysis events with fallback to the selected item.
    - Analysis Stream section is now collapsible. It auto-collapses when the analysis completes (upon receiving “done/complete” event), but can be manually expanded.
    - Connection status chip shows Connected/Disconnected for the SSE stream.
    - Improved log viewer with details expanders for event payloads and automatic scroll-to-latest.
  - Networking
    - EventSource now connects directly to the backend in dev with a cache-busting query param to avoid race conditions and buffering by the Next dev server.
  - Accessibility/UX
    - Clearer status and error messages in the modal.
    - Buttons and controls styled consistently with brand color.

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