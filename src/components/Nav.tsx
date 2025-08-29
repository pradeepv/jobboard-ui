"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  name: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { name: "Jobs", href: "/jobs" },
  { name: "Companies", href: "/companies" },
  { name: "Interview Questions", href: "/interview-questions" },
  { name: "Applied", href: "/applied" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">
            TalentStream
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="md:hidden">
            {/* Simple mobile menu placeholder; can be upgraded later */}
            <span className="text-sm text-gray-600">Menu</span>
          </div>
        </div>
      </div>
    </header>
  );
}