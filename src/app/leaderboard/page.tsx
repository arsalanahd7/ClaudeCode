"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry } from "@/lib/types";
import { calculateLeaderboard, filterEntriesByDate } from "@/lib/metrics";
import LeaderboardComponent from "@/components/Leaderboard";

const TIME_FILTERS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shift_entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setEntries(data as ShiftEntry[]);
    }
    setLoading(false);
  }, []);

  // Fetch on mount and on every window focus (handles navigating back)
  useEffect(() => {
    load();
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  const filteredEntries = filterEntriesByDate(entries, timeFilter);
  const leaderboard = calculateLeaderboard(filteredEntries);
  const filterLabel = TIME_FILTERS.find((f) => f.value === timeFilter)?.label || timeFilter;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Leaderboard</h1>
          <p className="text-[var(--muted)] mt-1">
            Ranked by composite score: 50% revenue + 30% close rate + 20% show rate — {filterLabel}
          </p>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {TIME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-[var(--muted)] italic">Loading leaderboard...</p>
      ) : (
        <LeaderboardComponent entries={leaderboard} />
      )}
    </div>
  );
}
