  # Context: SSE-integrated UI for live crawl progress

  Purpose
  - UI integrates with backend SSE to display live crawl progress and items in real time.

  Key endpoints
  - POST /api/crawl -> returns { requestId, sseUrl }
  - GET {sseUrl} -> Server-Sent Events (SSE): connected, ping, crawl

  EventSource handling
  - Subscribes to /api/stream/{requestId}.
  - Ignores events: connected, ping.
  - Handles event name "crawl" with payload:
    - kind: "crawlStart" | "page" | "crawlComplete" | "error"
    - payload: varies by kind (see schema below).
  - On kind=crawlComplete (or error), closes EventSource.
  - Closes stream on component unmount/navigation to avoid leaks.

  UX behavior
  - Streams items as they arrive; deduplicates by item id.
  - Displays requestId for troubleshooting.
  - Shows running/loading indicator; optional “Stop” button calls es.close().

  Contract assumptions
  - requestId must be the exact full ID returned by POST /api/crawl.
  - Event schema (data for event name "crawl"):
    - crawlStart: { query/roles, ts? }
    - page: { id, title, url, company, location, createdAt, description, tags }
    - crawlComplete: { totalItems?, ts? }
    - error: { message, code?, ts? }

  Gotchas
  - Do not treat "ping" as data; it exists to keep proxies awake.
  - If the stream ends without crawlComplete, surface an error and allow retry.

  Testing
  - With orchestrator running:
    1) POST /api/crawl -> copy requestId and sseUrl.
    2) UI should connect and show “connected” (internally) and begin listening.
    3) Use orchestrator debug endpoint to send a page and then complete; UI should render item(s) and close the stream.

  Next steps
  - No UI changes required for MCP; same schema applies.
  - When MCP is wired, items will flow identically via "page" events.

