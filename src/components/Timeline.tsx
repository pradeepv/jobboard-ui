import React from "react";

export type TimelineEvent = {
  id: string;
  type: "job" | "company" | "interview";
  title: string;
  description?: string;
  company?: string;
  location?: string;
  url?: string;
  createdAt: string; // ISO date string
  tags?: string[];
};

type TimelineProps = {
  events: TimelineEvent[];
};

export default function Timeline({ events }: TimelineProps) {
  if (!events?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-500">
        No events yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <ol className="relative border-s border-gray-200 pl-6">
        {events.map((ev) => (
          <li key={ev.id} className="mb-10">
            {/* Dot */}
            <span
              className={[
                "absolute -left-3 mt-1.5 h-6 w-6 rounded-full ring-8 ring-white",
                ev.type === "job"
                  ? "bg-blue-600"
                  : ev.type === "company"
                  ? "bg-emerald-600"
                  : "bg-purple-600",
              ].join(" ")}
              aria-hidden
            />

            {/* Card */}
            <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  {ev.company && (
                    <p className="text-sm text-gray-600">{ev.company}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-gray-500">
                  {new Date(ev.createdAt).toLocaleDateString()}
                </time>
              </div>

              {ev.description && (
                <p className="mt-2 text-sm text-gray-700">{ev.description}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ev.location && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {ev.location}
                  </span>
                )}
                {ev.tags?.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                  >
                    {t}
                  </span>
                ))}
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-sm font-medium text-blue-600 hover:underline"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}