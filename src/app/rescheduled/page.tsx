"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry } from "@/lib/types";

interface RescheduledRow {
  id: string;
  shift_date: string;
  reschedules: number;
  reschedule_names: string;
}

export default function RescheduledPage() {
  const [rows, setRows] = useState<RescheduledRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduledWithYou, setRescheduledWithYou] = useState<Map<string, boolean>>(new Map());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("shift_entries")
      .select("*")
      .order("shift_date", { ascending: false });

    if (data) {
      const entries = data as ShiftEntry[];
      const filtered: RescheduledRow[] = entries
        .filter((e) => e.reschedules > 0)
        .map((e) => ({
          id: e.id || "",
          shift_date: e.shift_date,
          reschedules: e.reschedules,
          reschedule_names: e.reschedule_names || "",
        }));
      setRows(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleRescheduledWithYou(id: string) {
    setRescheduledWithYou((prev) => {
      const next = new Map(prev);
      next.set(id, !next.get(id));
      return next;
    });
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading rescheduled calls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Rescheduled Calls</h1>
        <p className="text-[var(--muted)] mt-1">
          Track all rescheduled calls across your shifts.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        {rows.length === 0 ? (
          <p className="text-[var(--muted)] italic text-center py-8">
            No rescheduled calls found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Shift Date</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Rescheduled</th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Names</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">Rescheduled with you?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 px-3">{row.shift_date || "—"}</td>
                    <td className="py-2 px-3 text-right font-semibold">{row.reschedules}</td>
                    <td className="py-2 px-3 text-[var(--muted)]">
                      {row.reschedule_names || "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => toggleRescheduledWithYou(row.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          rescheduledWithYou.get(row.id)
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : "bg-gray-100 text-[var(--muted)]"
                        }`}
                      >
                        {rescheduledWithYou.get(row.id) ? "Yes" : "No"}
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
