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

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async (query: string) => {
    if (!query.trim()) {
      setError("Please enter a query.");
      return;
    }
    setError(null);
    setEvents([]);
    setRunning(true);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

    const res = await fetch(`${apiBase}/api/crawl?roles=${encodeURIComponent(query)}`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setRunning(false);
      setError(`Failed to start crawl (${res.status})`);
      return;
    }

    const data = await res.json();
    const id: string = data.requestId;
    const sseUrl: string = data.sseUrl || `/api/stream/${id}`;
    setRequestId(id);

    const url = sseUrl.startsWith("http") ? sseUrl : `${apiBase}${sseUrl}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", () => {
      // Connected and keepalive will follow.
    });

    es.addEventListener("ping", () => {
      // keepalive; ignore
    });

    es.addEventListener("crawl", (ev: MessageEvent) => {
      try {
        const raw = JSON.parse(ev.data);
        let normalized: CrawlEvent;

        if (raw?.kind) {
          normalized = raw as CrawlEvent;
        } else if (raw?.stage === "startPage") {
          normalized = { kind: "page", payload: { title: `Starting page ${raw.page}`, ts: raw.ts } };
        } else if (raw?.stage === "page") {
          normalized = {
            kind: "page",
            payload: { title: `Fetched page ${raw.page} (${raw.count} items)`, ts: raw.ts },
          };
        } else {
          normalized = { kind: "page", payload: raw };
        }

        if (normalized.kind === "page") {
          const te = toTimelineEvent(normalized.payload);
          setEvents((prev) => (prev.some((p) => p.id === te.id) ? prev : [...prev, te]));
        } else if (normalized.kind === "crawlComplete") {
          setRunning(false);
          es.close();
          esRef.current = null;
        }
      } catch (e) {
        console.error("Bad SSE data", e, ev.data);
      }
    });

    es.onerror = () => {
      setError("SSE connection error.");
      setRunning(false);
      es.close();
      esRef.current = null;
    };
  }, []);

  return { requestId, running, error, events, start, stop };
}