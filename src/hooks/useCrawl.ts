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
  _dataQuality?: 'complete' | 'partial' | 'minimal' | 'invalid'; // Data quality indicator
  _source?: string; // Original source for debugging
};

type CrawlEvent =
  | { kind: "crawlStart"; payload?: any }
  | { kind: "page"; payload: any }
  | { kind: "crawlComplete"; payload?: any }
  | { kind: "sourceComplete"; payload?: any }
  | { kind: "allComplete"; payload?: any }
  | { kind: "error"; payload?: any };

function assessDataQuality(payload: any): 'complete' | 'partial' | 'minimal' | 'invalid' {
  const criticalFields = ['title'];
  const importantFields = ['company', 'url', 'source'];
  const optionalFields = ['location', 'description', 'salary'];

  const hasCritical = criticalFields.every(field => payload?.[field]);
  const hasImportant = importantFields.some(field => payload?.[field]);
  const hasOptional = optionalFields.some(field => payload?.[field]);

  if (hasCritical && hasImportant && hasOptional) return 'complete';
  if (hasCritical && hasImportant) return 'partial';
  if (hasCritical) return 'minimal';
  return 'invalid';
}

function generateSafeId(payload: any): string {
  // Try URL-based ID first
  if (payload?.url) {
    return `job_${Math.abs(payload.url.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0))}`;
  }

  // Fall back to title+company combination
  if (payload?.title && payload?.company) {
    const combined = `${payload.title}|${payload.company}`;
    return `job_${Math.abs(combined.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0))}`;
  }

  // Last resort: random ID
  return (globalThis as any)?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function sanitizeTitle(title: any): string {
  if (!title || typeof title !== 'string') return "Job Posting";

  // Remove common prefixes/suffixes
  let cleaned = title.replace(/^(job|position|role):\s*/i, '');
  cleaned = cleaned.replace(/\s+(job|position|role)$/i, '');

  // Capitalize properly
  cleaned = cleaned.split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return cleaned.trim() || "Job Posting";
}

function extractBestCompany(payload: any): string | undefined {
  const companyFields = ['company', 'organization', 'org', 'employer'];

  for (const field of companyFields) {
    if (payload?.[field] && typeof payload[field] === 'string' && payload[field].trim()) {
      return payload[field].trim();
    }
  }

  // Extract from URL as fallback
  if (payload?.url) {
    try {
      const domain = new URL(payload.url).hostname.replace('www.', '');
      const parts = domain.split('.');
      if (parts.length >= 2) {
        return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
      }
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      // Ignore URL parsing errors
    }
  }

  return undefined;
}

function extractBestTimestamp(payload: any): string {
  const timestampFields = ['posted_at', 'createdAt', 'date', 'timestamp', 'ts'];

  for (const field of timestampFields) {
    if (payload?.[field]) {
      try {
        const date = new Date(payload[field]);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // Continue to next field
      }
    }
  }

  return new Date().toISOString();
}

function truncateSafely(text: any): string | undefined {
  if (!text || typeof text !== 'string') return undefined;

  const maxLength = 200;
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - 3) + "...";
}

function sanitizeUrl(url: any): string | undefined {
  if (!url || typeof url !== 'string') return undefined;

  try {
    new URL(url);
    return url;
  } catch {
    // Invalid URL
    return undefined;
  }
}

function toTimelineEvent(payload: any): TimelineEvent {
  const dataQuality = assessDataQuality(payload);
  const safeId = generateSafeId(payload);

  return {
    id: safeId,
    title: sanitizeTitle(payload?.title),
    company: extractBestCompany(payload),
    location: payload?.location || undefined,
    url: sanitizeUrl(payload?.url),
    createdAt: extractBestTimestamp(payload),
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
    description: truncateSafely(payload?.description ?? payload?.summary),
    _dataQuality: dataQuality, // New field for UI components
    _source: payload?.source || 'Unknown'
  };
}

import { parseErrorResponse } from "../utils/api";
import { parseSseEvent } from "../utils/sse";

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
        await fetch(`/api/crawl/${id}`, { method: "DELETE" });
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
    async (query: string, source: string) => {
      try {
        if (!query.trim()) {
          setError("Please enter a query.");
          return;
        }
        if (!source.trim()) {
          setError("Please select a source.");
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
        params.set("sources", source); // single source string from UI
        params.set("keywords", query);
        params.set("location", "");
        params.set("remoteOnly", "false");
        params.set("maxPages", "2");
        params.set("perSourceLimit", "50");
        params.set("json", "true");

        const url = `/api/crawl?${params.toString()}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const env = await parseErrorResponse(res);
          startingRef.current = false;
          throw new Error(env ? `${env.code}: ${env.message}` : `POST /api/crawl failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const id: string = data.runId;
        let ssePath: string = data.sseUrl || `/api/stream/${id}`;

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

        // Optional named events
        es.addEventListener("connected", () => {
          // no-op
        });

        // Handle job events from MCP via the event bus
        es.addEventListener("job", (ev: MessageEvent) => {
          try {
            const parsed = parseSseEvent<{ job: any }>(ev);
            if (!parsed || parsed.type !== 'job') return;
            const jobData = parsed.data?.job ?? parsed.data;

            // Use the robust toTimelineEvent function for data sanitization
            const timelineEvent = toTimelineEvent(jobData);

            // Prevent duplicate events
            if (timelineEvent.id && seenKeysRef.current.has(timelineEvent.id)) {
              return;
            }
            if (timelineEvent.id) {
              seenKeysRef.current.add(timelineEvent.id);
            }

            setEvents(prev => [...prev, timelineEvent]);
          } catch (e) {
            console.error("Error processing job event", e, (ev as MessageEvent).data);
          }
        });

        // Handle completion events
        es.addEventListener("complete", (ev: MessageEvent) => {
          try {
            const parsed = parseSseEvent<any>(ev);
            if (parsed) {
              console.log("Crawl completed:", parsed);
            }
          } catch {
            // If parsing fails, use default behavior
          }
          setRunning(false);
          closeCurrentStream();
        });

        // Support alternate completion event name
        es.addEventListener("crawlComplete", (ev: MessageEvent) => {
          try {
            const parsed = parseSseEvent<any>(ev);
            if (parsed) {
              console.log("Crawl completed (crawlComplete):", parsed);
            }
          } catch {}
          setRunning(false);
          closeCurrentStream();
        });

        // Handle error events
        es.addEventListener("error", (ev: MessageEvent) => {
          try {
            const parsed = parseSseEvent<{ code: string; message: string }>(ev);
            setError(parsed?.data?.message ?? "Server reported an error.");
          } catch {
            setError("Server reported an error.");
          }
          setRunning(false);
          closeCurrentStream();
        });

        // Handle parseError events
        es.addEventListener("parseError", (ev: MessageEvent) => {
          try {
            const e = JSON.parse(ev.data);
            console.warn("Parse error:", e);
            // Don't stop the whole process for parse errors, just log
          } catch {
            console.warn("Parse error with unparsable data:", ev.data);
          }
        });

        // Default message handler if server doesn't name events
        es.addEventListener("message", (ev: MessageEvent) => {
          try {
            const parsed = parseSseEvent<any>(ev);
            if (!parsed) return; 
            const d = parsed; 
            const t = d.type;

            if (t === "job" || t === "page" || t === "item") {
              const payload = {
                id: (d as any).key ?? d.data?.job?.id ?? d.data?.id ?? (d as any).url ?? (d as any).link ?? undefined,
                title: d.data?.job?.title ?? d.data?.title ?? (d as any).title,
                company: d.data?.job?.company ?? d.data?.company ?? (d as any).company,
                location: d.data?.job?.location ?? d.data?.location ?? (d as any).location,
                url: d.data?.job?.url ?? d.data?.url ?? (d as any).url ?? (d as any).link,
                createdAt: new Date().toISOString(),
                tags: Array.isArray(d.data?.job?.tags)
                  ? d.data.job.tags
                  : Array.isArray(d.data?.tags)
                  ? d.data.tags
                  : Array.isArray((d as any).tags)
                  ? (d as any).tags
                  : [],
                description: d.data?.job?.description ?? d.data?.description ?? (d as any).description ?? "",
              };

              if (payload.id && seenKeysRef.current.has(payload.id)) return;
              if (payload.id) seenKeysRef.current.add(payload.id);

              const te = toTimelineEvent(payload);
              setEvents((prev) => (prev.some((p) => p.id === te.id) ? prev : [...prev, te]));
              return;
            }

            if (t === "complete" || t === "stopped" || t === "allComplete" || t === "crawlComplete") {
              setRunning(false);
              closeCurrentStream();
              return;
            }

            if (t === "error") {
              const msg = (d as any)?.data?.message ?? (d as any)?.message;
              setError(msg ?? "Server reported an error.");
              setRunning(false);
              closeCurrentStream();
              return;
            }
          } catch {
            // ignore non-JSON lines
          }
        });

        es.onerror = () => {
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

// Helper function to generate IDs if not provided
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
