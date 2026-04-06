"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, LeaderboardEntry } from "@/lib/types";
import { filterEntriesByDate } from "@/lib/metrics";
import {
  MONTHLY_DATA,
  filterMonthlyData,
  aggregateMonthlyData,
} from "@/lib/monthly-data";
import LeaderboardComponent from "@/components/Leaderboard";

const TIME_FILTERS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "2months", label: "Last 2 Months" },
  { value: "3months", label: "Last 3 Months" },
  { value: "4months", label: "Last 4 Months" },
  { value: "5months", label: "Last 5 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "7months", label: "Last 7 Months" },
  { value: "8months", label: "Last 8 Months" },
  { value: "9months", label: "Last 9 Months" },
  { value: "10months", label: "Last 10 Months" },
  { value: "11months", label: "Last 11 Months" },
  { value: "year", label: "Last 12 Months" },
  ...MONTHLY_DATA.map((m) => ({ value: m.month, label: m.label })).reverse(),
  { value: "all", label: "Cumulative (All Time)" },
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

  useEffect(() => {
    load();
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  const filteredEntries = filterEntriesByDate(entries, timeFilter);
  const filteredMonthly = filterMonthlyData(MONTHLY_DATA, timeFilter);
  const monthlyAgg = aggregateMonthlyData(filteredMonthly);

  // Build leaderboard combining shift data + monthly data per user
  const userMap = new Map<string, { entries: ShiftEntry[]; name: string }>();
  for (const entry of filteredEntries) {
    const existing = userMap.get(entry.user_id);
    if (existing) {
      existing.entries.push(entry);
    } else {
      userMap.set(entry.user_id, { entries: [entry], name: entry.user_name });
    }
  }

  const leaderboard: LeaderboardEntry[] = [];
  for (const [user_id, { entries: userEntries, name }] of userMap) {
    const shiftRevenue = userEntries.reduce((s, e) => s + (e.revenue_collected || 0), 0);
    const shiftWon = userEntries.reduce((s, e) => s + e.won, 0);
    const shiftOccurred = userEntries.reduce((s, e) => s + e.calls_occurred, 0);
    const shiftScheduled = userEntries.reduce((s, e) => s + e.calls_in_schedule, 0);

    // Add monthly data
    const totalRevenue = shiftRevenue + monthlyAgg.totalRevenue;
    const totalWon = shiftWon + monthlyAgg.totalEnrollments;
    const totalOccurred = shiftOccurred + monthlyAgg.totalOccurred;
    const totalScheduled = shiftScheduled + monthlyAgg.totalScheduled;

    const avgCloseRate = totalOccurred > 0 ? totalWon / totalOccurred : 0;
    const avgShowRate = totalScheduled > 0 ? totalOccurred / totalScheduled : 0;

    const maxRevenue = Math.max(totalRevenue, 1);
    const normalizedRevenue = totalRevenue / maxRevenue;
    const score = normalizedRevenue * 0.5 + avgCloseRate * 0.3 + avgShowRate * 0.2;

    leaderboard.push({
      user_id,
      user_name: name,
      total_revenue: totalRevenue,
      avg_close_rate: avgCloseRate,
      avg_show_rate: avgShowRate,
      score,
      entries_count: userEntries.length,
    });
  }

  // If no shift entries but monthly data exists, show it
  if (leaderboard.length === 0 && monthlyAgg.totalOccurred > 0) {
    leaderboard.push({
      user_id: "monthly",
      user_name: "Historical Data",
      total_revenue: monthlyAgg.totalRevenue,
      avg_close_rate: monthlyAgg.closeRate,
      avg_show_rate: monthlyAgg.showRate,
      score: 0.5 + monthlyAgg.closeRate * 0.3 + monthlyAgg.showRate * 0.2,
      entries_count: filteredMonthly.length,
    });
  }

  leaderboard.sort((a, b) => b.score - a.score);

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
