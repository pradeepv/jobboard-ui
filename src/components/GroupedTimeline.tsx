import React from "react";
import type { TimelineEvent } from "../hooks/useCrawl";

interface GroupedTimelineProps {
  items: TimelineEvent[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}

export default function GroupedTimeline({
  items,
  selectable = false,
  selectedIds = new Set(),
  onToggle,
}: GroupedTimelineProps) {
  if (!items?.length) return null;

  return (
    <ol className="relative border-s-2 border-blue-200 ps-4 space-y-6">
      {items.map((e) => {
        const isSelected = selectedIds.has(e.id);
        return (
          <li key={e.id} className="ms-2">
            <div className="absolute -start-1.5 mt-2 h-3 w-3 rounded-full border border-white bg-blue-500" />
            <div className={`rounded-md border p-3 shadow-sm ${
              isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white'
            }`}>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  {selectable && onToggle && (
                    <input
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
            {e.url && (
              <a
                className="text-sm text-blue-600 underline"
                href={e.url}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            )}
            {e.description && <p className="mt-2 text-sm">{e.description}</p>}
          </div>
        </li>
        );
      })}
    </ol>
  );
}