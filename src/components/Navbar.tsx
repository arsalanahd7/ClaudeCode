"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const salesItems = [
  { href: "/shift", label: "End of Shift" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/shift-history", label: "History" },
  { href: "/follow-ups", label: "Follow-Ups" },
  { href: "/rescheduled", label: "Rescheduled" },
  { href: "/history", label: "Manual Input" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const coachingItems = [
  { href: "/calls", label: "Call Log" },
  { href: "/reps", label: "Rep Profiles" },
  { href: "/coaching", label: "Coaching" },
];

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const isCoachingSection =
    pathname.startsWith("/calls") ||
    pathname.startsWith("/reps") ||
    pathname.startsWith("/coaching");

  return (
    <nav className="bg-white border-b border-[var(--card-border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main row */}
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-xl text-[var(--primary)] tracking-tight">
            AdmissionPrep
          </Link>
          <div className="flex items-center gap-1">
            {salesItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === item.href
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--primary-bg)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <span className="mx-1 text-[var(--card-border)]">|</span>
            {coachingItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === item.href || (item.href === "/calls" && pathname.startsWith("/calls/")) || (item.href === "/reps" && pathname.startsWith("/reps/"))
                    ? "bg-[var(--primary)] text-white"
                    : isCoachingSection
                    ? "text-[var(--foreground)] hover:bg-[var(--primary-bg)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--primary-bg)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/settings"
              aria-label="Advanced Settings"
              title="Advanced Settings"
              className={`ml-1 p-1.5 rounded-lg transition-colors ${
                pathname === "/settings"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--primary-bg)]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
