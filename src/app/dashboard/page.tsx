"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, HistoricalCall } from "@/lib/types";
import {
  calculateMetrics,
  calculateCumulativeStats,
  filterEntriesByDate,
  filterHistoricalByDate,
  generateInsights,
  generateAIInsight,
} from "@/lib/metrics";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import InsightPanel from "@/components/InsightPanel";
import AIInsightPanel from "@/components/AIInsightPanel";

const TIME_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
];

export default function DashboardPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [historicalCalls, setHistoricalCalls] = useState<HistoricalCall[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showShiftHistory, setShowShiftHistory] = useState(false);

  useEffect(() => {
    async function load() {
      const [shiftRes, histRes] = await Promise.all([
        supabase.from("shift_entries").select("*").order("created_at", { ascending: false }),
        supabase.from("historical_calls").select("*").order("call_date", { ascending: false }),
      ]);

      if (shiftRes.data) {
        setEntries(shiftRes.data as ShiftEntry[]);
        if (shiftRes.data.length > 0 && !selectedUser) {
          setSelectedUser(shiftRes.data[0].user_id);
        }
      }
      if (histRes.data) {
        setHistoricalCalls(histRes.data as HistoricalCall[]);
      }
      setLoading(false);
    }
    load();
  }, [selectedUser]);

  const users = Array.from(new Map(entries.map((e) => [e.user_id, e.user_name])));
  const userEntries = entries.filter((e) => e.user_id === selectedUser);
  const userHistorical = historicalCalls.filter((c) => c.user_id === selectedUser);

  const filteredEntries = filterEntriesByDate(userEntries, timeFilter);
  const filteredHistorical = filterHistoricalByDate(userHistorical, timeFilter);

  const latestEntry = filteredEntries[0];
  const cumulative = calculateCumulativeStats(filteredEntries, filteredHistorical);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading dashboard...</p>
      </div>
    );
  }

  if (!latestEntry) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-[var(--primary)] mb-2">Dashboard</h1>
        <p className="text-[var(--muted)] italic">No shift data yet. Submit your first End of Shift form to see your performance.</p>
      </div>
    );
  }

  const metrics = calculateMetrics(latestEntry);
  const insights = generateInsights(metrics, cumulative);
  const aiInsight = generateAIInsight(metrics, latestEntry.call_details || [], cumulative);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
          <p className="text-[var(--muted)] mt-1">AdmissionPrep Performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {users.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
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
      </div>

      {/* Cumulative Performance */}
      <div className="bg-[var(--primary-bg)] rounded-xl border border-[var(--primary)] p-6 mb-6">
        <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-4">Cumulative Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Total Revenue</p>
            <p className="text-xl font-bold text-[var(--primary)]">${cumulative.total_revenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Total Calls</p>
            <p className="text-xl font-bold text-[var(--primary)]">{cumulative.total_calls_occurred}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Won Calls</p>
            <p className="text-xl font-bold text-[var(--primary)]">{cumulative.total_won_calls}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Enrollments</p>
            <p className="text-xl font-bold text-[var(--primary)]">{cumulative.total_enrollments}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Avg AOV</p>
            <p className="text-xl font-bold text-[var(--primary)]">${cumulative.avg_aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase">Avg Close Rate</p>
            <p className="text-xl font-bold text-[var(--primary)]">{(cumulative.avg_close_rate * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Latest Shift: Revenue + Calls in Schedule */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Revenue (This Shift)"
          value={`$${(latestEntry.revenue_collected || 0).toLocaleString()}`}
          color="green"
          subtitle={`${latestEntry.enrollments || 0} enrollment${latestEntry.enrollments !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Calls in Schedule"
          value={latestEntry.calls_in_schedule}
          color="default"
          subtitle={`${latestEntry.calls_occurred} occurred, ${latestEntry.no_shows + latestEntry.reschedules + latestEntry.cancellations} non-occurred`}
        />
        <MetricCard
          label="Shift Date"
          value={latestEntry.shift_date || "—"}
          color="default"
          subtitle="Latest shift"
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard
          label="Close Rate"
          value={`${(metrics.close_rate * 100).toFixed(1)}%`}
          color={metrics.close_rate >= 0.3 ? "green" : "red"}
          subtitle={`${latestEntry.won} won / ${latestEntry.calls_occurred}`}
        />
        <MetricCard
          label="Show Rate"
          value={`${(metrics.show_rate * 100).toFixed(1)}%`}
          color={metrics.show_rate >= 0.7 ? "green" : "red"}
        />
        <MetricCard
          label="Follow-up Rate"
          value={`${(metrics.follow_up_rate * 100).toFixed(1)}%`}
          color={metrics.follow_up_rate <= 0.5 ? "green" : "amber"}
        />
        <MetricCard
          label="DM Rate"
          value={`${(metrics.decision_maker_rate * 100).toFixed(1)}%`}
          color={metrics.decision_maker_rate >= 0.9 ? "green" : "amber"}
        />
        <MetricCard
          label="Webinar Rate"
          value={`${(metrics.webinar_rate * 100).toFixed(1)}%`}
          color={metrics.webinar_rate >= 0.8 ? "green" : "amber"}
        />
        <MetricCard
          label="PCC Rate"
          value={`${(metrics.pcc_rate * 100).toFixed(1)}%`}
          color="default"
          subtitle={`${latestEntry.pcced_calls || 0} PCCed`}
        />
      </div>

      {/* Chart */}
      <div className="mb-6">
        <PerformanceChart metrics={metrics} />
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <InsightPanel insights={insights} />
        <AIInsightPanel insight={aiInsight} />
      </div>

      {/* Per-Call Details (Latest Shift) */}
      {latestEntry.call_details && latestEntry.call_details.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Latest Shift — Per-Call Review</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Contact</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">Webinar</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">DM</th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Outcome</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">PCCed</th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {latestEntry.call_details.map((call, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 px-3 font-semibold">{call.contact_name || `Call ${i + 1}`}</td>
                    <td className="py-2 px-3 text-center">{call.webinar_watched ? "Yes" : "No"}</td>
                    <td className="py-2 px-3 text-center">{call.decision_maker_present ? "Yes" : "No"}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                        call.outcome === "won"
                          ? "bg-[var(--success-bg)] text-[var(--success)]"
                          : call.outcome === "lost"
                          ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                          : "bg-[var(--warning-bg)] text-[var(--warning)]"
                      }`}>
                        {call.outcome === "follow_up" ? "Follow-Up" : call.outcome === "won" ? "Won" : "Lost"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">{call.pcced ? "Yes" : "No"}</td>
                    <td className="py-2 px-3 text-[var(--muted)] text-xs">{call.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <button
          onClick={() => setShowShiftHistory(!showShiftHistory)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide">
            Shift History ({filteredEntries.length} shifts)
          </h3>
          <span className="text-[var(--muted)]">{showShiftHistory ? "Hide" : "Show"}</span>
        </button>

        {showShiftHistory && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Date</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Revenue</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Scheduled</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Occurred</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Won</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Lost</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Follow-Up</th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 px-3">{entry.shift_date || "—"}</td>
                    <td className="py-2 px-3 text-right font-semibold">${(entry.revenue_collected || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{entry.calls_in_schedule}</td>
                    <td className="py-2 px-3 text-right">{entry.calls_occurred}</td>
                    <td className="py-2 px-3 text-right text-[var(--primary)] font-semibold">{entry.won}</td>
                    <td className="py-2 px-3 text-right text-[var(--danger)]">{entry.lost}</td>
                    <td className="py-2 px-3 text-right text-[var(--warning)]">{entry.follow_ups}</td>
                    <td className="py-2 px-3 text-right">{entry.enrollments || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {(latestEntry.win_notes || latestEntry.loss_notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {latestEntry.win_notes && (
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-2">Win Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{latestEntry.win_notes}</p>
            </div>
          )}
          {latestEntry.loss_notes && (
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <h3 className="font-bold text-sm text-[var(--danger)] uppercase tracking-wide mb-2">Loss Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{latestEntry.loss_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
