"use client";

import { useState } from "react";
import { useCrawl } from "../../hooks/useCrawl";
import GroupedTimeline from "../../components/GroupedTimeline";

export default function TimelinePage() {
  const [query, setQuery] = useState("");
  const { requestId, running, error, events, start, stop } = useCrawl();

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
          onClick={() => start(query)}
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

      <div className="text-sm text-gray-600">
        {requestId && (
          <span>
            Request: <code>{String(requestId).slice(0, 12)}</code>
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
        <p className="text-gray-500">No results yet. Start a crawl to see items here.</p>
      )}
    </div>
  );
}