"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimelineEvent = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url?: string;
  createdAt?: string;
  tags?: string[];
  description?: string;
};

type CrawlEvent =
  | { kind: "crawlStart"; payload?: any }
  | { kind: "page"; payload: any }
  | { kind: "crawlComplete"; payload?: any }
  | { kind: "sourceComplete"; payload?: any }
  | { kind: "allComplete"; payload?: any }
  | { kind: "error"; payload?: any };

function toTimelineEvent(payload: any): TimelineEvent {
  const fallbackId =
    (globalThis as any)?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return {
    id: String(payload?.id ?? fallbackId),
    title: payload?.title ?? payload?.role ?? payload?.msg ?? "Untitled",
    company: payload?.company ?? payload?.org ?? payload?.employer ?? undefined,
    location: payload?.location ?? undefined,
    url: payload?.url ?? payload?.link ?? undefined,
    createdAt: payload?.createdAt ?? payload?.ts ?? new Date().toISOString(),
    tags: payload?.tags ?? [],
    description: payload?.description ?? payload?.summary ?? undefined,
  };
}

export function useCrawl() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const startingRef = useRef<boolean>(false);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const closeCurrentStream = useCallback(() => {
    const es = esRef.current;
    if (es) {
      try {
        es.close();
      } catch {}
      esRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    const id = currentIdRef.current;
    if (id) {
      try {
        await fetch(`/api/local/crawl/${id}`, { method: "DELETE" });
      } catch {}
    }
    closeCurrentStream();
    setRunning(false);
  }, [closeCurrentStream]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const start = useCallback(
    async (query: string) => {
      try {
        if (!query.trim()) {
          setError("Please enter a query.");
          return;
        }
        if (startingRef.current) {
          // Prevent double starts due to rapid clicking/strict mode
          return;
        }
        startingRef.current = true;

        setError(null);
        setEvents([]);
        seenKeysRef.current.clear();
        setRunning(true);

        // Build query params
        const params = new URLSearchParams();
        params.set("sources", "ycombinator"); // adjust or expose in UI
        params.set("keywords", query);
        params.set("location", "");
        params.set("remoteOnly", "false");
        params.set("maxPages", "2");
        params.set("perSourceLimit", "50");
        params.set("json", "true");

        const url = `/api/local/crawl?${params.toString()}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          startingRef.current = false;
          throw new Error(
            `POST /api/local/crawl failed: ${res.status} ${res.statusText} ${text}`,
          );
        }

        const data = await res.json();
        const id: string = data.runId;
        let ssePath: string = data.sseUrl || `/api/local/stream/${id}`;

        // Close any existing stream BEFORE opening a new one
        closeCurrentStream();

        currentIdRef.current = id;
        setRequestId(id);

        // Normalize to relative path so Next proxy applies if needed
        if (!ssePath.startsWith("/")) {
          try {
            const u = new URL(ssePath, window.location.href);
            ssePath = u.pathname + u.search;
          } catch {
            // leave as-is
          }
        }

        const es = new EventSource(ssePath);
        esRef.current = es;

        es.addEventListener("open", () => {
          startingRef.current = false;
        });

        // Optional: if backend emits a named 'connected' event
        es.addEventListener("connected", () => {
          // no-op
        });

        // Typed events (if backend sets event: ...)
        es.addEventListener("start", (_ev: MessageEvent) => {
          // no-op or show progress
        });

        es.addEventListener("source_start", (_ev: MessageEvent) => {
          // no-op
        });

        es.addEventListener("page_start", (_ev: MessageEvent) => {
          // no-op
        });

        es.addEventListener("job", (ev: MessageEvent) => {
          try {
            const d = JSON.parse(ev.data);
            // d: { type:"job", source, page, key, data:{...} }
            const payload = {
              id: d.key, // stable id for dedupe
              title: d.data?.title,
              company: d.data?.company,
              location: d.data?.location,
              url: d.data?.url,
              createdAt: new Date().toISOString(),
              tags: Array.isArray(d.data?.tags) ? d.data.tags : [],
              description: d.data?.description ?? "",
            };

            if (payload.id && seenKeysRef.current.has(payload.id)) return;
            if (payload.id) seenKeysRef.current.add(payload.id);

            const te = toTimelineEvent(payload);
            setEvents((prev) =>
              prev.some((p) => p.id === te.id) ? prev : [...prev, te],
            );
          } catch (e) {
            console.error("Bad job event data", e, (ev as MessageEvent).data);
          }
        });

        es.addEventListener("page_complete", (_ev: MessageEvent) => {
          // no-op
        });

        es.addEventListener("source_complete", (_ev: MessageEvent) => {
          // no-op
        });

        es.addEventListener("complete", () => {
          setRunning(false);
          closeCurrentStream();
        });

        es.addEventListener("stopped", () => {
          setRunning(false);
          closeCurrentStream();
        });

        es.addEventListener("error", (ev: MessageEvent) => {
          try {
            const e = JSON.parse(ev.data);
            setError(e?.message ?? "Server reported an error.");
          } catch {
            setError("Server reported an error.");
          }
          setRunning(false);
          closeCurrentStream();
        });

        // IMPORTANT: handle default 'message' when server doesn't set event: name
        es.addEventListener("message", (ev: MessageEvent) => {
          try {
            const d = JSON.parse(ev.data);
            const t = d?.type;

            if (t === "job") {
              // Same mapping as the named 'job' handler
              const payload = {
                id: d.key ?? d.data?.id ?? d.url ?? d.link ?? undefined,
                title: d.data?.title ?? d.title,
                company: d.data?.company ?? d.company,
                location: d.data?.location ?? d.location,
                url: d.data?.url ?? d.url ?? d.link,
                createdAt: new Date().toISOString(),
                tags: Array.isArray(d.data?.tags)
                  ? d.data.tags
                  : Array.isArray(d.tags)
                  ? d.tags
                  : [],
                description: d.data?.description ?? d.description ?? "",
              };

              if (payload.id && seenKeysRef.current.has(payload.id)) return;
              if (payload.id) seenKeysRef.current.add(payload.id);

              const te = toTimelineEvent(payload);
              setEvents((prev) =>
                prev.some((p) => p.id === te.id) ? prev : [...prev, te],
              );
              return;
            }

            if (t === "complete" || t === "stopped" || t === "allComplete") {
              setRunning(false);
              closeCurrentStream();
              return;
            }

            if (t === "error") {
              setError(d?.message ?? "Server reported an error.");
              setRunning(false);
              closeCurrentStream();
              return;
            }

            // Optional: ignore/observe banner/start/progress messages
            // if (t === "banner" || t === "start" || t === "page_start" || t === "source_start") { /* no-op */ }
          } catch {
            // Non-JSON lines like "type: connected" can be ignored safely
          }
        });

        // Fallback logging channel if controller ever emits generic lines
        es.addEventListener("line", () => {});

        es.onerror = () => {
          // This also fires on normal close; don't treat as fatal if we already flipped running
          if (running) setError("SSE connection error.");
          setRunning(false);
          closeCurrentStream();
        };
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setRunning(false);
        closeCurrentStream();
        startingRef.current = false;
      }
    },
    [closeCurrentStream, running],
  );

  return { requestId, running, error, events, start, stop };
}