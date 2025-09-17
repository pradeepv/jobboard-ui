import React from "react";
import type { TimelineEvent } from "../hooks/useCrawl";

interface GroupedTimelineProps {
  items: TimelineEvent[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onAnalyze?: (url: string, item: TimelineEvent) => void;
}

export default function GroupedTimeline({
  items,
  selectable = false,
  selectedIds = new Set(),
  onToggle,
  onAnalyze,
}: GroupedTimelineProps) {
  if (!items?.length) return null;

  return (
    <div>
      {/* Visual marker to ensure we are editing the correct component */}
      <div className="mb-2 text-xs text-gray-400">GT v2</div>

      <ol className="relative border-s-2 border-blue-200 ps-4 space-y-6">
        {items.map((e) => {
          const isSelected = selectedIds.has(e.id);
          const hasUrl = typeof e.url === "string" && e.url.trim().length > 0;
          const canAnalyze = Boolean(onAnalyze && hasUrl);

          return (
            <li key={e.id} className="ms-2">
              <div className="absolute -start-1.5 mt-2 h-3 w-3 rounded-full border border-white bg-blue-500" />
              <div
                className={`rounded-md border p-3 shadow-sm ${
                  isSelected ? "bg-blue-50 border-blue-200" : "bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    {selectable && onToggle && (
                      <input
                        title="Select"
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={isSelected}
                        onChange={() => onToggle(e.id)}
                      />
                    )}
                    <h3 className="font-medium">{e.title}</h3>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(e.createdAt ?? Date.now()).toLocaleString()}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  {e.company && <span>{e.company}</span>}
                  {e.location && <span> · {e.location}</span>}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  {hasUrl ? (
                    <button
                      className="text-sm rounded border px-2 py-1 hover:bg-blue-50 text-blue-700"
                      onClick={() => {
                        console.log("[GroupedTimeline] View clicked:", e.url, e.id);
                        try {
                          window.open(e.url as string, "_blank", "noopener,noreferrer");
                        } catch {
                          // As a fallback, set location (less safe; avoid if possible)
                          window.location.href = e.url as string;
                        }
                      }}
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">(no URL)</span>
                  )}

                  {canAnalyze ? (
                    <button
                      className="text-sm rounded border px-2 py-1 hover:bg-blue-50"
                      onClick={() => {
                        console.log("[GroupedTimeline] Analyze clicked:", e.url, e.id);
                        onAnalyze?.(e.url as string, e);
                      }}
                    >
                      Analyze
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {onAnalyze ? "(no URL to analyze)" : "(no onAnalyze handler)"}
                    </span>
                  )}
                </div>

                {e.description && <p className="mt-2 text-sm">{e.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}