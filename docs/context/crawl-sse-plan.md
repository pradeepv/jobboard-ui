# Crawl + SSE Integration Context

This document captures the shared context and step-by-step plan to integrate a “Start Crawl” button in the UI that triggers a backend crawl via Temporal, streams progress/results over SSE, and renders them in the GroupedTimeline. Keep this updated as we progress.

## Summary

- UI repo: pradeepv/jobboard-ui (Next.js + Tailwind)
- Goal: On button click, call POST /api/crawl, receive { requestId }, subscribe to SSE at GET /api/stream/{requestId}, render incoming results live in GroupedTimeline. After receiving a “crawlComplete” event, enable selection and wire an Analyze flow.
- Temporal convention: Use deterministic workflowId = `crawl-{requestId}`.
- Event kinds expected over SSE: `crawlStart`, `page`, `crawlComplete`.

## Endpoints (assumed)

- POST /api/crawl
  - Request body: { query: string, requestId?: string }
  - Response body: { requestId: string }
  - Behavior: Starts Temporal CrawlWorkflow with workflowId `crawl-{requestId}`; publishes events to SSE bus channel for that request.

- GET /api/stream/{requestId}
  - Server-Sent Events stream (Content-Type: text/event-stream)
  - Messages (JSON in the data field):
    - { "kind": "crawlStart", "payload"?: any }
    - { "kind": "page", "payload": JobPosting }
    - { "kind": "crawlComplete", "payload"?: any }

- Optional (future): POST /api/analyze
  - Request body: { requestId: string, jobIds: string[], resume?: string }
  - Response: 202 Accepted (starts AnalysisWorkflow; streams to the same SSE channel).

## Event payload shape (UI expectation)

JobPosting payload for `page` events should map to TimelineEvent:
- id: string
- title: string
- company?: string
- location?: string
- url?: string
- createdAt?: string (ISO) — if absent, UI will default to now
- tags?: string[]
- description?: string

The UI will defensively map fields from common aliases (e.g., role -> title, link -> url, org -> company).

## Files in this repo

- app/timeline/page.tsx
  - Renders query input, “Start Crawl” button, and GroupedTimeline.
  - Shows live results and requestId snippet.

- src/hooks/useCrawl.ts
  - start(query): POST /api/crawl with a client-generated requestId (UUID).
  - Opens EventSource(`/api/stream/{requestId}`).
  - Handles events: crawlStart, page, crawlComplete.
  - Exposes state: { requestId, events, running, start }.

- src/components/GroupedTimeline.tsx
  - Displays events with LinkedIn-blue rail, colored markers, right-aligned cards, rounded nav.
  - Accepts events: TimelineEvent[].


## Acceptance criteria

- Start Crawl button triggers backend crawl (POST /api/crawl) and opens SSE.
- UI displays incoming “page” events in GroupedTimeline with reasonable mapping.
- Loading states and errors are handled gracefully.
- After “crawlComplete”, selection UI appears and works.

## Notes for backend/Temporal

- Use deterministic workflowId: `crawl-{requestId}` provided by client.
- Emit events to an event bus keyed by `req:{requestId}`.
- Publish explicit “crawlStart” on begin and “crawlComplete” on finish to close the loop in UI.
- For retries, set generous activity timeouts/backoffs (network-bound).

## Copy/paste reminder for chat

When you return to this task, paste this block at the top of your message:

Context:

- Repo: pradeepv/jobboard-ui (Next.js + Tailwind).
- Goal: On button click, call POST /api/crawl, get requestId, and subscribe to SSE /api/stream/{requestId}. Show crawl results in GroupedTimeline. After “crawlComplete”, enable selection and wire /api/analyze.
- Endpoints: POST /api/crawl, GET /api/stream/{requestId}; events: crawlStart, page, crawlComplete.
