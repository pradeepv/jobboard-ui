"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useCrawl } from "@/hooks/useCrawl";
import GroupedTimeline from "@/components/GroupedTimeline";
import Modal from "@/components/Modal";

type AnalysisLog = {
  ts: number;
  level: "info" | "event" | "error";
  name?: string;
  message: string;
  data?: any;
};

type JobInfo = {
  url?: string;
  title?: string;
  company?: string;
  location?: string;
  id?: string;
  description?: string;
};

export default function Home() {
  // Crawl form state
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"ycombinator" | "hackernews" | "techcrunch" | "linkedin" | "">("");

  const [resume, setResume] = useState<File | null>(null);
  const [projectDoc, setProjectDoc] = useState<File | null>(null);

  const { start, stop, running, error, events, requestId } = useCrawl();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!source) {
      alert("Please select a source.");
      return;
    }
    start(query, source);
  }

  const status = useMemo(() => {
    if (running) return "Starting crawl...";
    if (error) return "Error";
    if (requestId) return "Started";
    return null;
  }, [running, error, requestId]);

  // ——— Analysis state and handlers ———
  const [analysisInfo, setAnalysisInfo] = useState<{ requestId: string; sseUrl: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalJob, setModalJob] = useState<JobInfo | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  // Visible analysis log
  const [analysisLogs, setAnalysisLogs] = useState<AnalysisLog[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Collapsible UI state for the stream
  const [streamCollapsed, setStreamCollapsed] = useState(false);
  const [analysisFinished, setAnalysisFinished] = useState(false);

  // Job summary gathered from events
  const [jobSummary, setJobSummary] = useState<JobInfo | null>(null);

  const pushLog = (entry: AnalysisLog) => {
    setAnalysisLogs((prev) => [...prev, entry].slice(-500));
  };

  useEffect(() => {
    if (!connected) return;
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [analysisLogs, connected]);

  const handleAnalyze = async (url: string, item?: any) => {
    setModalJob({
      url,
      title: item?.title,
      company: item?.company,
      location: item?.location,
      id: item?.id,
      description: item?.description,
    });
    setJobSummary(null);
    setModalOpen(true);

    setAnalysisError(null);
    setAnalysisInfo(null);
    setConnected(false);
    setAnalysisLogs([]);
    setStreamCollapsed(false);
    setAnalysisFinished(false);
    pushLog({ ts: Date.now(), level: "info", message: "Starting analysis…", data: { url } });

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobUrl: url }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`POST /api/analysis failed: ${res.status} ${t}`);
      }
      const data = await res.json();

      const normalized = normalizeSseUrl(String(data.sseUrl));
      setAnalysisInfo({ requestId: String(data.requestId), sseUrl: normalized.rel });

      pushLog({
        ts: Date.now(),
        level: "info",
        message: "Analysis started.",
        data: { requestId: data.requestId, sseUrl: normalized.display },
      });

      setTimeout(() => connectSse(normalized), 0);
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis";
      setAnalysisError(msg);
      pushLog({ ts: Date.now(), level: "error", message: msg });
    }
  };

  const connectSse = (u?: ReturnType<typeof normalizeSseUrl>) => {
    const src = u ?? (analysisInfo ? normalizeSseUrl(analysisInfo.sseUrl) : null);
    if (!src) return;

    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }

    pushLog({
      ts: Date.now(),
      level: "info",
      message: "Connecting to analysis SSE…",
      data: { url: src.display },
    });

    try {
      const bust = src.connect + (src.connect.includes("?") ? "&" : "?") + "t=" + Date.now();
      const es = new EventSource(bust);
      esRef.current = es;

      es.addEventListener("open", () => {
        setConnected(true);
        pushLog({ ts: Date.now(), level: "event", name: "open", message: "SSE open." });
      });

      es.addEventListener("connected", (e) => {
        pushLog({
          ts: Date.now(),
          level: "event",
          name: "connected",
          message: "Server acknowledged connection.",
          data: safeParse((e as MessageEvent).data),
        });
      });

      es.addEventListener("analysis", (e) => {
        const data = safeParse((e as MessageEvent).data);
        const kind = data?.kind || data?.type || "(no kind)";
        pushLog({
          ts: Date.now(),
          level: "event",
          name: "analysis",
          message: `Analysis event: ${kind}`,
          data,
        });

        // Capture job details for the summary when available
        // Adjust these keys to match your payloads
        if (kind === "jobAnalyzed" || kind === "analysisComplete" || kind === "analysisAllComplete") {
          const fromEvent: JobInfo = {
            title: data?.job?.title ?? data?.title ?? modalJob?.title,
            company: data?.job?.company ?? data?.company ?? modalJob?.company,
            location: data?.job?.location ?? data?.location ?? modalJob?.location,
            description: data?.job?.description ?? data?.description ?? modalJob?.description,
            url: modalJob?.url,
            id: modalJob?.id,
          };
          setJobSummary((prev) => ({ ...prev, ...fromEvent }));
        }
      });

      es.addEventListener("done", (e) => {
        pushLog({
          ts: Date.now(),
          level: "event",
          name: "done",
          message: "Analysis complete.",
          data: safeParse((e as MessageEvent).data),
        });
        setConnected(false);
        setAnalysisFinished(true);
        // Auto-collapse the stream log when done
        setStreamCollapsed(true);
        try {
          es.close();
        } catch {}
        esRef.current = null;
      });

      es.onerror = () => {
        pushLog({
          ts: Date.now(),
          level: "error",
          message:
            "SSE error/closed (proxy may have dropped the stream). If in dev, we route directly to :8082.",
          data: { readyState: es.readyState, url: src.display },
        });
        setConnected(false);
        try {
          es.close();
        } catch {}
        esRef.current = null;
      };
    } catch (err) {
      pushLog({
        ts: Date.now(),
        level: "error",
        message: "Failed to create EventSource.",
        data: String(err),
      });
    }
  };

  useEffect(() => {
    return () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl p-6 space-y-6">

        {/* Crawl form */}
        <section className="p-6 rounded-lg bg-white shadow-sm space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Crawl setup</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Search */}
            <div className="flex justify-center">
              <div className="relative w-1/2 min-w-[260px]">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-full bg-slate-100 text-sm text-slate-800 placeholder:text-slate-500 outline-none ring-1 ring-transparent focus:ring-brand/40 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Sources */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">Select source</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["ycombinator", "hackernews", "techcrunch", "linkedin"] as const).map((src) => (
                  <label
                    key={src}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="source"
                      value={src}
                      checked={source === src}
                      onChange={() => setSource(src)}
                      className="h-4 w-4 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-slate-800">
                      {src === "ycombinator"
                        ? "Y Combinator"
                        : src === "hackernews"
                        ? "Hacker News"
                        : src === "techcrunch"
                        ? "TechCrunch"
                        : "LinkedIn"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="resume">
                  Resume
                </label>
                <input
                  id="resume"
                  name="resume"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {resume && <p className="text-xs text-slate-500">Selected: {resume.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="projectDoc">
                  Project Document
                </label>
                <input
                  id="projectDoc"
                  name="projectDoc"
                  type="file"
                  accept=".pdf,.doc,.docx,.md,.txt"
                  onChange={(e) => setProjectDoc(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {projectDoc && <p className="text-xs text-slate-500">Selected: {projectDoc.name}</p>}
              </div>
            </div>

            {/* Actions + status */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={running}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 active:bg-brand/95 disabled:opacity-50 disabled:pointer-events-none transition"
                >
                  {running ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 4a8 8 0 108 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Starting…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Crawl
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={stop}
                  disabled={!running}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition"
                >
                  Stop
                </button>
              </div>

              <div className="text-sm">
                {status && !error && (
                  <span className="text-slate-600">
                    {status}
                    {requestId ? ` — id: ${requestId}` : ""}
                    {events.length > 0 ? ` — items: ${events.length}` : ""}
                  </span>
                )}
                {error && <span className="text-rose-700">Error: {error}</span>}
              </div>
            </div>
          </form>
        </section>

        {/* Grouped timeline */}
        <section className="p-6 rounded-lg bg-white shadow-sm">
          <div className="mt-13 p-4 rounded-xl2 bg-slate-50">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Live results</h3>
            <GroupedTimeline items={events} onAnalyze={handleAnalyze} />
            {!running && events.length === 0 && (
              <p className="text-gray-500">No results yet. Start a crawl to see items here.</p>
            )}
          </div>
        </section>

        <section className="p-6 rounded-lg bg-white shadow-sm mt-97">mt-97 probe (large margin)</section>
      </div>

      {/* Analysis modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (esRef.current) {
            try {
              esRef.current.close();
            } catch {}
            esRef.current = null;
          }
          setConnected(false);
        }}
        title="Analyze Job"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-slate-500">{modalJob?.url ? <span>URL: {modalJob.url}</span> : null}</div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
              <button
                className="rounded-md bg-brand px-3 py-2 text-sm text-white hover:bg-brand/90"
                onClick={() => {
                  console.log("[Modal] Generate clicked for job:", modalJob);
                }}
              >
                Generate
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Job Summary Panel */}
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  {jobSummary?.title ?? modalJob?.title ?? "Untitled job"}
                </div>
                <div className="text-sm text-slate-600">
                  {jobSummary?.company ?? modalJob?.company ?? "Unknown company"}
                  {(jobSummary?.location ?? modalJob?.location) ? ` · ${jobSummary?.location ?? modalJob?.location}` : ""}
                </div>
              </div>
              {modalJob?.url && (
                <a
                  href={modalJob.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  View posting
                </a>
              )}
            </div>
            <div className="mt-3 text-sm text-slate-800 whitespace-pre-wrap">
              {jobSummary?.description ?? modalJob?.description ?? (
                <span className="text-slate-500">No description captured yet.</span>
              )}
            </div>
          </div>

          {/* Analysis Stream (collapsible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-800">Analysis Stream</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                    connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                  title={connected ? "SSE open" : "Not connected"}
                >
                  {connected ? "Connected" : "Disconnected"}
                </span>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => setStreamCollapsed((v) => !v)}
                >
                  {streamCollapsed ? "Expand log" : "Collapse log"}
                </button>
              </div>
            </div>

            {!analysisInfo ? (
              <span className="text-xs text-slate-500">Waiting to start analysis…</span>
            ) : streamCollapsed ? (
              <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                {analysisFinished ? "Analysis complete. Log collapsed." : "Log collapsed."}
              </div>
            ) : (
              <div className="h-48 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                {analysisLogs.length === 0 ? (
                  <p className="text-slate-500">No messages yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {analysisLogs.map((l, i) => (
                      <li key={i} className="whitespace-pre-wrap break-words">
                        <span className="text-slate-400 tabular-nums mr-2">
                          {new Date(l.ts).toLocaleTimeString()}
                        </span>
                        <span
                          className={
                            l.level === "error"
                              ? "text-rose-700"
                              : l.level === "event"
                              ? "text-emerald-700"
                              : "text-slate-700"
                          }
                        >
                          {l.name ? `[${l.name}] ` : ""}
                          {l.message}
                        </span>
                        {l.data ? (
                          <details className="mt-1 text-slate-600">
                            <summary className="cursor-pointer text-[11px]">details</summary>
                            <pre className="overflow-auto rounded bg-white p-2 text-[11px] text-slate-800">
                              {safeStringify(l.data)}
                            </pre>
                          </details>
                        ) : null}
                      </li>
                    ))}
                    <div ref={logEndRef} />
                  </ul>
                )}
              </div>
            )}

            {analysisError && (
              <div className="rounded border border-rose-300 bg-rose-50 p-2 text-rose-700 text-xs">{analysisError}</div>
            )}
          </div>
        </div>
      </Modal>
    </main>
  );
}

/* ——— Helpers ——— */

function normalizeSseUrl(urlStr: string) {
  const isDev = typeof window !== "undefined" && window.location.port === "3000";
  try {
    const u = urlStr.startsWith("/") ? new URL(urlStr, window.location.origin) : new URL(urlStr);
    const rel = u.pathname + u.search;
    const backendBase = "http://localhost:8082"; // dev backend
    const abs = isDev ? backendBase + rel : rel;
    return { rel, abs, connect: abs, display: abs };
  } catch {
    const rel = urlStr.startsWith("/") ? urlStr : "/" + urlStr.replace(/^https?:\/\/[^/]+/, "");
    const backendBase = "http://localhost:8082";
    const abs = isDev ? backendBase + rel : rel;
    return { rel, abs, connect: abs, display: abs };
  }
}

function safeParse(input: any) {
  try {
    return typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    return { raw: String(input) };
  }
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}