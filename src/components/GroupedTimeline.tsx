import React from "react";
import type { TimelineEvent } from "../hooks/useCrawl";

export default function GroupedTimeline({ items }: { items: TimelineEvent[] }) {
  if (!items?.length) return null;

  return (
    <ol className="relative border-s-2 border-blue-200 ps-4 space-y-6">
      {items.map((e) => (
        <li key={e.id} className="ms-2">
          <div className="absolute -start-1.5 mt-2 h-3 w-3 rounded-full border border-white bg-blue-500" />
          <div className="rounded-md border p-3 shadow-sm bg-white">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">{e.title}</h3>
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
      ))}
    </ol>
  );
}