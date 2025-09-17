"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Header() {
  const pathname = usePathname();

  const nav = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: "/jobs", label: "Jobs" },
      { href: "/questions", label: "Interview Qs" },
      { href: "/about", label: "About" },
    ],
    []
  );

  const isActive = (href: string) => pathname === href;

  const linkClass = (href: string) =>
    cx(
      "px-3 py-2 text-sm font-medium",
      "text-slate-700 hover:text-slate-900",
      "transition-colors",
      "relative",
      isActive(href) && "text-slate-900"
    );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[6px] bg-brand text-white flex items-center justify-center font-bold">
              My
            </div>
            <span className="hidden sm:inline text-base font-semibold text-slate-900">
              Job Board
            </span>
          </Link>
        </div>

        {/* Center: Nav */}
        <nav className="hidden md:flex items-center gap-4">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <span className="relative inline-flex flex-col items-center">
                <span>{item.label}</span>
                <span
                  className={cx(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-slate-900 transition-all",
                    isActive(item.href) ? "w-7 opacity-100" : "w-0 opacity-0"
                  )}
                />
              </span>
            </Link>
          ))}
        </nav>

        {/* Right: Spacer to balance layout (keeps nav centered) */}
        <div className="w-10 md:w-24" aria-hidden />
      </div>
    </header>
  );
}