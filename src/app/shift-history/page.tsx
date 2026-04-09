"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ShiftEntry } from "@/lib/types";
import { filterEntriesByDate } from "@/lib/metrics";
import { MONTHLY_DATA } from "@/lib/monthly-data";

const TIME_FILTERS = [
  { value: "all", label: "All Time" },
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
];

export default function ShiftHistoryPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("shift_entries")
      .select("*")
      .order("shift_date", { ascending: false });

    if (data) {
      setEntries(data as ShiftEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteShift(id: string) {
    if (!confirm("Delete this shift? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("shift_entries").delete().eq("id", id);
    await load();
    setDeleting(null);
  }

  const filteredEntries = filterEntriesByDate(entries, timeFilter);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading shift history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Shift History</h1>
          <p className="text-[var(--muted)] mt-1">
            {filteredEntries.length} shift{filteredEntries.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {TIME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        {filteredEntries.length === 0 ? (
          <p className="text-[var(--muted)] italic text-center py-8">
            No shifts found for this time period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Date</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Revenue</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Scheduled</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Occurred</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Won</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Lost</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Follow-Ups</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Edit</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 px-3">{entry.shift_date || "—"}</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ${(entry.revenue_collected || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">{entry.calls_in_schedule}</td>
                    <td className="py-2 px-3 text-right">{entry.calls_occurred}</td>
                    <td className="py-2 px-3 text-right text-[var(--primary)] font-semibold">
                      {entry.won}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--danger)]">{entry.lost}</td>
                    <td className="py-2 px-3 text-right">{entry.follow_ups}</td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/edit-shift?id=${entry.id}`}
                        className="text-[var(--primary)] hover:underline text-xs font-semibold"
                      >
                        Edit
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => entry.id && deleteShift(entry.id)}
                        disabled={deleting === entry.id}
                        className="text-[var(--danger)] hover:underline text-xs font-semibold disabled:opacity-50"
                      >
                        {deleting === entry.id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
