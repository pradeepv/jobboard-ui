"use client";

import Nav from "@/components/Nav";
import GroupedTimeline from "@/components/GroupedTimeline";
import { useState } from "react";
import { useCrawl } from "@/hooks/useCrawl";
import { useAnalysis } from "@/hooks/useAnalysis";

export default function Page() {
  const [query, setQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const { running, error, events, start, stop, requestId } = useCrawl();
  const { analyzing, analysisResults, startAnalysis, analysisError } = useAnalysis();

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Stream</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-sm">
              All
            </button>
            <button className="px-3 py-1.5 rounded-full bg-gray-100 text-sm hover:bg-gray-200">
              Jobs
            </button>
            <button className="px-3 py-1.5 rounded-full bg-gray-100 text-sm hover:bg-gray-200">
              Companies
            </button>
            <button className="px-3 py-1.5 rounded-full bg-gray-100 text-sm hover:bg-gray-200">
              Interview Qs
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Keywords (e.g., backend, golang)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={running}
          />
          <div className="flex gap-2">
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              onClick={() => start(query)}
              disabled={running}
            >
              {running ? "Crawling..." : "Start"}
            </button>
            <button
              className="rounded border px-4 py-2 disabled:opacity-60"
              onClick={stop}
              disabled={!running}
            >
              Stop
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {requestId && (
            <span>
              Run: <code>{String(requestId).slice(0, 12)}</code>
            </span>
          )}
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-600">Results</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Selected: {selectedJobs.size}
            </span>
            <button
              className="rounded bg-emerald-600 px-3 py-1.5 text-white text-sm disabled:opacity-50"
              disabled={selectedJobs.size === 0 || analyzing}
              onClick={() => startAnalysis(Array.from(selectedJobs))}
            >
              {analyzing ? "Analyzing..." : "Generate Resume"}
            </button>
          </div>
        </div>

        <GroupedTimeline
          items={events}
          selectable
          selectedIds={selectedJobs}
          onToggle={(id: string) => {
            setSelectedJobs((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
        />

        {!running && events.length === 0 && (
          <p className="text-gray-500">
            No results yet. Enter keywords and click Start to stream job events.
          </p>
        )}

        {analysisError && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {analysisError}
          </div>
        )}

        {analysisResults && (
          <div className="mt-6 rounded border bg-white p-4">
            <h3 className="font-semibold mb-2">Generated Artifacts</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
{JSON.stringify(analysisResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}