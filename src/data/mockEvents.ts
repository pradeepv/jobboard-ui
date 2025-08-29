import type { TimelineEvent } from "@/components/GroupedTimeline";

export const mockEvents: TimelineEvent[] = [
  {
    id: "evt_1",
    type: "job",
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    description:
      "Build modern UIs with React and Tailwind. Work closely with design.",
    location: "Remote, US",
    url: "https://example.com/jobs/1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    tags: ["React", "TypeScript", "Tailwind"],
  },
  {
    id: "evt_2",
    type: "company",
    title: "BetaTech raises Series B",
    company: "BetaTech",
    description:
      "Raised $45M to accelerate hiring across product and data teams.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    tags: ["Funding", "Growth"],
  },
  {
    id: "evt_3",
    type: "interview",
    title: "System design: real-time chat",
    description:
      "Discuss WebSocket scaling, presence, fan-out, and backpressure.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    tags: ["System Design", "Scalability"],
    url: "https://example.com/interview/chat",
  },
  {
    id: "evt_4",
    type: "job",
    title: "Backend Engineer (Go)",
    company: "Globex",
    location: "Berlin, DE",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    tags: ["Go", "Kubernetes"],
  },
];