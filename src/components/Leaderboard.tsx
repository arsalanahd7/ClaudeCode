"use client";

import { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-8 text-center">
        <p className="text-[var(--muted)] italic">No data yet. Submit shifts to see the leaderboard.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--primary-bg)] border-b-2 border-[var(--primary)]">
              <th className="text-left px-4 py-3 font-bold text-[var(--primary)]">Rank</th>
              <th className="text-left px-4 py-3 font-bold text-[var(--primary)]">Name</th>
              <th className="text-right px-4 py-3 font-bold text-[var(--primary)]">Revenue</th>
              <th className="text-right px-4 py-3 font-bold text-[var(--primary)]">Close Rate</th>
              <th className="text-right px-4 py-3 font-bold text-[var(--primary)]">Show Rate</th>
              <th className="text-right px-4 py-3 font-bold text-[var(--primary)]">Score</th>
              <th className="text-right px-4 py-3 font-bold text-[var(--primary)]">Shifts</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.user_id}
                className={`border-b border-[var(--card-border)] last:border-0 ${
                  i < 3 ? "bg-[var(--primary-bg)]/40" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-[var(--primary)] text-white"
                        : i === 1
                        ? "bg-[var(--primary-light)] text-white"
                        : i === 2
                        ? "bg-[var(--primary-bg)] text-[var(--primary)]"
                        : "bg-gray-100 text-[var(--muted)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{entry.user_name}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  ${entry.total_revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {(entry.avg_close_rate * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {(entry.avg_show_rate * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-bg)] text-[var(--primary)]">
                    {(entry.score * 100).toFixed(0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[var(--muted)]">
                  {entry.entries_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
