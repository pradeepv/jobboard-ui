"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
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
  const { analyzing, analysisError: hookAnalysisError, events: analysisEvents, jobDetails, aiResults, analysisCompleted, startAnalysis } = useAnalysis();
  const [analysisInfo, setAnalysisInfo] = useState<{ requestId: string; sseUrl: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalJob, setModalJob] = useState<JobInfo | null>(null);

  // No local EventSource: the hook manages SSE lifecycle to avoid duplicates
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
    // aiResults comes from useAnalysis hook; no local reset needed
    setModalOpen(true);

    setAnalysisError(null);
    setAnalysisInfo(null);
    setConnected(false);
    setAnalysisLogs([]);
    setStreamCollapsed(false);
    setAnalysisFinished(false);
    pushLog({ ts: Date.now(), level: "info", message: "Starting analysis…", data: { url } });

    try {
      await startAnalysis(url);
      pushLog({ ts: Date.now(), level: "info", message: "Analysis started (hook-managed SSE).", data: { url } });
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis";
      setAnalysisError(msg);
      pushLog({ ts: Date.now(), level: "error", message: msg });
    }
  };

  // Bind analysis hook state into modal content
  useEffect(() => {
    // When parsed details arrive, populate the summary shown in the modal
    if (jobDetails) {
      setJobSummary({
        title: jobDetails.title || modalJob?.title || 'Untitled job',
        company: jobDetails.company || modalJob?.company || 'Unknown company',
        location: jobDetails.location || modalJob?.location || '',
        url: jobDetails.url || modalJob?.url || '',
        description: jobDetails.description || '',
      } as any);
    } else if (modalJob) {
      // Fallback so the modal doesn’t look empty before parsingComplete
      setJobSummary({
        title: modalJob.title || 'Untitled job',
        company: modalJob.company || 'Unknown company',
        location: modalJob.location || '',
        url: modalJob.url || '',
        description: modalJob.description || '',
      } as any);
    }
  }, [jobDetails, modalJob]);

  // When hook's analysisError changes, reflect it locally if needed
  useEffect(() => {
    if (hookAnalysisError) setAnalysisError(hookAnalysisError);
  }, [hookAnalysisError]);

  // Removed local analysis EventSource handling; hook manages SSE lifecycle

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
          {/* Parsed Job Details */}
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
              {jobDetails?.description ?? jobSummary?.description ?? modalJob?.description ?? (
                <span className="text-slate-500">(waiting for parsingComplete…)</span>
              )}
            </div>
          </div>

          {/* AI Analysis Results */}
          <div className="rounded border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <div className="text-sm font-medium text-blue-900">AI Analysis Results</div>
            </div>
            {!aiResults ? (
              <div className="text-sm text-blue-700">Awaiting AI analysis…</div>
            ) : (
              <div className="space-y-3 text-sm">
                {aiResults.companyInfo && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Company Info</div>
                    <div className="text-blue-700">{aiResults.companyInfo}</div>
                  </div>
                )}
                {aiResults.salaryRange && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Salary Range</div>
                    <div className="text-blue-700">{aiResults.salaryRange}</div>
                  </div>
                )}
                {aiResults.roleDescription && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Role Description</div>
                    <div className="text-blue-700">{aiResults.roleDescription}</div>
                  </div>
                )}
                {aiResults.experienceLevel && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Experience Level</div>
                    <div className="text-blue-700">{aiResults.experienceLevel}</div>
                  </div>
                )}
                {aiResults.roleDuties && aiResults.roleDuties.length > 0 && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Role Duties</div>
                    <ul className="text-blue-700 list-disc list-inside space-y-1">
                      {aiResults.roleDuties.map((duty, index) => (
                        <li key={index}>{duty}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResults.requirements && aiResults.requirements.length > 0 && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Requirements</div>
                    <ul className="text-blue-700 list-disc list-inside space-y-1">
                      {aiResults.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResults.techStack && aiResults.techStack.length > 0 && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Tech Stack</div>
                    <div className="flex flex-wrap gap-1">
                      {aiResults.techStack.map((tech, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiResults.softSkills && aiResults.softSkills.length > 0 && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Soft Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {aiResults.softSkills.map((skill, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiResults.leadershipRole !== undefined && (
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Leadership Role</div>
                    <div className="text-blue-700">
                      {aiResults.leadershipRole ? "Yes" : "No"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analysis Stream (hidden for now) */}
          {/*
          <div className="space-y-2">
            ...stream log UI hidden...
          </div>
          */}
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
