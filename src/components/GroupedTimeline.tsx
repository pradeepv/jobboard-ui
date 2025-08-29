import React from "react";

export type TimelineEvent = {
  id: string;
  type: "job" | "company" | "interview";
  title: string;
  description?: string;
  company?: string;
  location?: string;
  url?: string;
  createdAt: string; // ISO date
  tags?: string[];
};

type GroupedTimelineProps = {
  events: TimelineEvent[];
};

const TYPE_LABEL: Record<TimelineEvent["type"], string> = {
  job: "Jobs",
  company: "Companies",
  interview: "Interview",
};

const TYPE_COLOR: Record<TimelineEvent["type"], string> = {
  job: "bg-blue-600",
  company: "bg-emerald-600",
  interview: "bg-purple-600",
};

export default function GroupedTimeline({ events }: GroupedTimelineProps) {
  const order: Array<TimelineEvent["type"]> = ["job", "company", "interview"];

  const grouped = order
    .map((t) => ({
      type: t,
      items: events.filter((e) => e.type === t),
    }))
    .filter((g) => g.items.length > 0);

  if (!grouped.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-500">
        No events yet.
      </div>
    );
  }

  return (
    // This wrapper establishes the coordinate system and ensures non-zero height
    <div className="relative">
      {/* The vertical rail spans the full height of all groups */}
      <div className="pointer-events-none absolute left-3 top-0 bottom-0 w-px bg-gray-200" aria-hidden />

      <div className="space-y-10">
        {grouped.map((group) => (
          <section key={group.type}>
            {/* Group header */}
            <header className="mb-4 flex items-center gap-3 pl-10">
              <div className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOR[group.type]}`} />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                {TYPE_LABEL[group.type]}
              </h2>
            </header>

            {/* List aligned to the rail at left:3 (so use pl-6 and -left-3 for the dot) */}
            <ol className="relative pl-6">
              {group.items
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((ev) => (
                  <li key={ev.id} className="relative mb-10">
                    {/* Dot sits on the rail at x = left:3 */}
                    <span
                      className={`absolute -left-3 top-2 h-3 w-3 rounded-full ${TYPE_COLOR[ev.type]} ring-4 ring-white`}
                      aria-hidden
                    />
                    {/* Card */}
                    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {ev.title}
                          </h3>
                          {ev.company && (
                            <p className="text-sm text-gray-600">
                              {ev.company}
                            </p>
                          )}
                        </div>
                        <time className="shrink-0 text-xs text-gray-500">
                          {new Date(ev.createdAt).toLocaleDateString()}
                        </time>
                      </div>

                      {ev.description && (
                        <p className="mt-2 text-sm text-gray-700">
                          {ev.description}
                        </p>
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
          </section>
        ))}
      </div>
    </div>
  );
}