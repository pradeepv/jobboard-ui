import Image from "next/image";
import styles from "./page.module.css";
import Nav from "@/components/Nav";
import GroupedTimeline from "@/components/GroupedTimeline";
import { mockEvents } from "@/data/mockEvents";

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
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

        <GroupedTimeline events={mockEvents} />
      </div>
    </main>
  );
}