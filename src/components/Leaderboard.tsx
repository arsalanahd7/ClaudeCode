"use client";

import { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-8 text-center">
        <p className="text-[var(--muted)]">No data yet. Submit shifts to see the leaderboard.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-[var(--card-border)]">
              <th className="text-left px-4 py-3 font-semibold text-[var(--muted)]">Rank</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--muted)]">Name</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--muted)]">Revenue</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--muted)]">Close Rate</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--muted)]">Show Rate</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--muted)]">Score</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--muted)]">Shifts</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.user_id}
                className={`border-b border-[var(--card-border)] last:border-0 ${
                  i < 3 ? "bg-blue-50/40" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : i === 1
                        ? "bg-gray-200 text-gray-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{entry.user_name}</td>
                <td className="px-4 py-3 text-right font-mono">
                  ${entry.total_revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(entry.avg_close_rate * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(entry.avg_show_rate * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
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
