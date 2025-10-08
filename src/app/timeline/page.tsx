"use client";

import { useEffect, useRef, useState } from "react";
import { useCrawl } from "../../hooks/useCrawl";
import GroupedTimeline from "../../components/GroupedTimeline";

type JobInfo = {
  url?: string;
  title?: string;
  company?: string;
  location?: string;
  id?: string;
  description?: string;
};

export default function TimelinePage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<
    "ycombinator" | "hackernews" | "techcrunch" | "linkedin" | ""
  >("ycombinator");
  const { requestId, running, error, events, start, stop } = useCrawl();

  const [analysisInfo, setAnalysisInfo] = useState<{
    requestId: string;
    sseUrl: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJob, setModalJob] = useState<JobInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [analysisFinished, setAnalysisFinished] = useState(false);

  // AI analysis results
  const [aiResults, setAiResults] = useState<{
    companyInfo?: string;
    salaryRange?: string;
    roleDescription?: string;
    roleDuties?: string[];
    requirements?: string[];
    techStack?: string[];
    leadershipRole?: boolean;
    softSkills?: string[];
    experienceLevel?: string;
  } | null>(null);

  const esRef = useRef<EventSource | null>(null);

  const handleAnalyze = async (url: string, item?: any) => {
    console.log("[TimelinePage] handleAnalyze called with:", { url, item });
    const newModalJob = {
      url,
      title: item?.title,
      company: item?.company,
      location: item?.location,
      id: item?.id,
      description: item?.description,
    };
    console.log("[TimelinePage] Setting modal job to:", newModalJob);
    setModalJob(newModalJob);
    setModalOpen(true);

    setAnalysisError(null);
    setAnalysisInfo(null);
    setConnected(false);
    setAnalysisFinished(false);
    setAiResults(null);
    try {
      console.log("[TimelinePage] Sending analysis request for URL:", url);
      const res = await fetch("/api/analysis/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl: url,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`POST /api/analysis failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      console.log("[TimelinePage] analysis started:", data);
      setAnalysisInfo({ requestId: data.requestId, sseUrl: data.sseUrl });
    } catch (e: any) {
      console.error("[TimelinePage] analysis error:", e);
      setAnalysisError(e?.message || "Failed to start analysis");
    }
  };

  const connectSse = () => {
    if (!analysisInfo) return;
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }

    // sseUrl is already relative (/api/stream/{id}); Next rewrite proxies to Spring
    const es = new EventSource(analysisInfo.sseUrl);
    esRef.current = es;

    es.addEventListener("open", () => {
      console.log("[Analysis SSE] open");
    });

    es.addEventListener("connected", (e) => {
      setConnected(true);
      console.log("[Analysis SSE] connected", (e as MessageEvent).data);
    });

    const names = [
      "analysis",
      "parsingStart",
      "parsingComplete",
      "summarizingStart",
      "summarizingComplete",
      "generatingResumeStart",
      "generatingCoverLetterStart",
      "crewLog",
      "generatingComplete",
      "analysisSuccess",
      "analysisFailed",
      // Generic fallback names your worker might emit:
      "parseStart",
      "parsed",
      "done",
    ];
    for (const name of names) {
      es.addEventListener(name, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          console.log(`[Analysis SSE] ${name}`, data);

          // Handle AI analysis results
          if (name === "aiAnalysisComplete" && data?.aiResults) {
            setAiResults(data.aiResults);
            console.log(
              "[Analysis SSE] AI analysis results received",
              data.aiResults,
            );
          }

          // Handle completion
          if (name === "analysisComplete" || name === "done") {
            setAnalysisFinished(true);
          }
        } catch {
          console.log(`[Analysis SSE] ${name}`, (e as MessageEvent).data);
        }
      });
    }

    es.onerror = () => {
      console.warn("[Analysis SSE] error/closed");
      setConnected(false);
      try {
        es.close();
      } catch {}
      esRef.current = null;
    };
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
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Crawl Timeline</h1>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="e.g., backend,java"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={running}
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          onClick={() => start(query, source)}
          disabled={running}
        >
          {running ? "Crawling..." : "Start Crawl"}
        </button>
        {running && (
          <button className="rounded border px-3 py-2" onClick={stop}>
            Stop
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        {requestId && (
          <div>
            Crawl Request: <code>{String(requestId).slice(0, 12)}</code>
          </div>
        )}
        {analysisInfo && (
          <div className="space-y-1">
            <div className="text-green-700">
              Analysis started. requestId: <code>{analysisInfo.requestId}</code>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs">{analysisInfo.sseUrl}</code>
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={connectSse}
                disabled={connected}
                title="Connect to analysis SSE"
              >
                {connected ? "Connected" : "Connect SSE"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {analysisError && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {analysisError}
        </div>
      )}

      <GroupedTimeline items={events} onAnalyze={handleAnalyze} />

      {!running && events.length === 0 && (
        <p className="text-gray-500">
          No results yet. Start a crawl to see items here.
        </p>
      )}

      {/* Analysis Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Job Analysis</h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalJob(null);
                    setAiResults(null);
                    setAnalysisFinished(false);
                    if (esRef.current) {
                      esRef.current.close();
                      esRef.current = null;
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Job Info */}
              {modalJob && (
                <div className="mb-6 p-4 border rounded">
                  <h3 className="font-medium text-lg mb-2">{modalJob.title}</h3>
                  <div className="text-sm text-gray-600">
                    {modalJob.company && <span>{modalJob.company}</span>}
                    {modalJob.location && <span> · {modalJob.location}</span>}
                  </div>
                  {modalJob.url && (
                    <div>
                      <a
                        href={modalJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      >
                        View Original Posting
                      </a>
                      <div className="text-xs text-gray-500 mt-1">
                        URL: {modalJob.url}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Controls */}
              <div className="mb-6">
                {!analysisInfo && !analysisError && (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">
                      Ready to analyze this job posting
                    </p>
                    <button
                      onClick={() => {
                        console.log(
                          "[TimelinePage] Start Analysis clicked with modalJob:",
                          modalJob,
                        );
                        if (modalJob?.url) {
                          // Reset analysis state and start new analysis
                          setAnalysisError(null);
                          setAnalysisInfo(null);
                          setConnected(false);
                          setAnalysisFinished(false);
                          setAiResults(null);

                          // Start the analysis
                          console.log(
                            "[TimelinePage] Sending analysis request for URL:",
                            modalJob.url,
                          );
                          fetch("/api/analysis/url", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ jobUrl: modalJob.url }),
                          })
                            .then((res) => {
                              if (!res.ok) {
                                throw new Error(
                                  `POST /api/analysis failed: ${res.status}`,
                                );
                              }
                              return res.json();
                            })
                            .then((data) => {
                              setAnalysisInfo({
                                requestId: data.requestId,
                                sseUrl: data.sseUrl,
                              });
                              // Auto-connect to SSE
                              setTimeout(() => connectSse(), 100);
                            })
                            .catch((e) => {
                              setAnalysisError(
                                e?.message || "Failed to start analysis",
                              );
                            });
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Start Analysis
                    </button>
                  </div>
                )}

                {analysisInfo && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"}`}
                      ></div>
                      <span className="text-sm">
                        {connected
                          ? "Connected"
                          : analysisFinished
                            ? "Analysis Complete"
                            : "Connecting..."}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Request ID: {analysisInfo.requestId}
                    </div>
                    {!connected && !analysisFinished && (
                      <button
                        onClick={connectSse}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Connect to Analysis Stream
                      </button>
                    )}
                  </div>
                )}

                {analysisError && (
                  <div className="text-red-600 bg-red-50 p-3 rounded">
                    {analysisError}
                  </div>
                )}
              </div>

              {/* AI Analysis Results */}
              {aiResults && (
                <div className="rounded border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <div className="text-sm font-medium text-blue-900">
                      AI Analysis Results
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {aiResults.companyInfo && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Company Info
                        </div>
                        <div className="text-blue-700">
                          {aiResults.companyInfo}
                        </div>
                      </div>
                    )}
                    {aiResults.salaryRange && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Salary Range
                        </div>
                        <div className="text-blue-700">
                          {aiResults.salaryRange}
                        </div>
                      </div>
                    )}
                    {aiResults.roleDescription && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Role Description
                        </div>
                        <div className="text-blue-700">
                          {aiResults.roleDescription}
                        </div>
                      </div>
                    )}
                    {aiResults.experienceLevel && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Experience Level
                        </div>
                        <div className="text-blue-700">
                          {aiResults.experienceLevel}
                        </div>
                      </div>
                    )}
                    {aiResults.roleDuties &&
                      aiResults.roleDuties.length > 0 && (
                        <div>
                          <div className="font-medium text-blue-800 mb-1">
                            Role Duties
                          </div>
                          <ul className="text-blue-700 list-disc list-inside space-y-1">
                            {aiResults.roleDuties.map((duty, index) => (
                              <li key={index}>{duty}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {aiResults.requirements &&
                      aiResults.requirements.length > 0 && (
                        <div>
                          <div className="font-medium text-blue-800 mb-1">
                            Requirements
                          </div>
                          <ul className="text-blue-700 list-disc list-inside space-y-1">
                            {aiResults.requirements.map((req, index) => (
                              <li key={index}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {aiResults.techStack && aiResults.techStack.length > 0 && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Tech Stack
                        </div>
                        <ul className="text-blue-700 list-disc list-inside space-y-1">
                          {aiResults.techStack.map((tech, index) => (
                            <li key={index}>{tech}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiResults.softSkills &&
                      aiResults.softSkills.length > 0 && (
                        <div>
                          <div className="font-medium text-blue-800 mb-1">
                            Soft Skills
                          </div>
                          <ul className="text-blue-700 list-disc list-inside space-y-1">
                            {aiResults.softSkills.map((skill, index) => (
                              <li key={index}>{skill}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {aiResults.leadershipRole !== undefined && (
                      <div>
                        <div className="font-medium text-blue-800 mb-1">
                          Leadership Role
                        </div>
                        <div className="text-blue-700">
                          {aiResults.leadershipRole ? "Yes" : "No"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysisFinished && !aiResults && (
                <div className="text-center py-8 text-gray-500">
                  Analysis completed but no detailed results were generated.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
