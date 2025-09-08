"use client";

import Nav from "@/components/Nav";
import GroupedTimeline from "@/components/GroupedTimeline";
import { useState } from "react";
import { useCrawl } from "@/hooks/useCrawl";

export default function Page() {
  const [query, setQuery] = useState("");
  const { running, error, events, start, stop, requestId } = useCrawl();

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

        <GroupedTimeline items={events} />

        {!running && events.length === 0 && (
          <p className="text-gray-500">
            No results yet. Enter keywords and click Start to stream job events.
          </p>
        )}
      </div>
    </main>
  );
}