"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry } from "@/lib/types";
import { calculateMetrics, generateInsights, generateAIInsight } from "@/lib/metrics";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import InsightPanel from "@/components/InsightPanel";
import AIInsightPanel from "@/components/AIInsightPanel";

export default function DashboardPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shift_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setEntries(data as ShiftEntry[]);
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0].user_id);
        }
      }
      setLoading(false);
    }
    load();
  }, [selectedUser]);

  const users = Array.from(new Map(entries.map((e) => [e.user_id, e.user_name])));
  const userEntries = entries.filter((e) => e.user_id === selectedUser);
  const latestEntry = userEntries[0];

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
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-[var(--muted)] italic">No shift data yet. Submit your first End of Shift form to see your performance.</p>
      </div>
    );
  }

  const metrics = calculateMetrics(latestEntry);
  const insights = generateInsights(metrics);
  const aiInsight = generateAIInsight(metrics, latestEntry.call_details || []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--muted)] mt-1">Latest shift performance for AdmissionPrep</p>
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {users.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Cumulative Stats */}
      {(latestEntry.total_revenue_since_start > 0 || latestEntry.total_calls_since_start > 0) && (
        <div className="bg-[var(--primary-bg)] rounded-xl border border-[var(--primary)] p-5 mb-6">
          <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-3">All-Time Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">Total Revenue Since Start</p>
              <p className="text-2xl font-bold text-[var(--primary)]">${(latestEntry.total_revenue_since_start || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Total Calls Since Start</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{(latestEntry.total_calls_since_start || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue + Calls in Schedule */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="Revenue Collected"
          value={`$${(latestEntry.revenue_collected || 0).toLocaleString()}`}
          color="green"
          subtitle={`From ${latestEntry.won} closed deal${latestEntry.won !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Calls in Schedule"
          value={latestEntry.calls_in_schedule}
          color="default"
          subtitle={`${latestEntry.calls_occurred} occurred, ${latestEntry.no_shows + latestEntry.reschedules + latestEntry.cancellations} non-occurred`}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Close Rate"
          value={`${(metrics.close_rate * 100).toFixed(1)}%`}
          color={metrics.close_rate >= 0.3 ? "green" : "red"}
          subtitle={`${latestEntry.won} won / ${latestEntry.calls_occurred} occurred`}
        />
        <MetricCard
          label="Show Rate"
          value={`${(metrics.show_rate * 100).toFixed(1)}%`}
          color={metrics.show_rate >= 0.7 ? "green" : "red"}
          subtitle={`${latestEntry.calls_occurred} / ${latestEntry.calls_in_schedule} scheduled`}
        />
        <MetricCard
          label="Follow-up Rate"
          value={`${(metrics.follow_up_rate * 100).toFixed(1)}%`}
          color={metrics.follow_up_rate <= 0.5 ? "green" : "amber"}
          subtitle={`${latestEntry.follow_ups} follow-ups`}
        />
        <MetricCard
          label="DM Rate"
          value={`${(metrics.decision_maker_rate * 100).toFixed(1)}%`}
          color={metrics.decision_maker_rate >= 0.9 ? "green" : "amber"}
          subtitle={`${latestEntry.decision_maker_calls} DM calls`}
        />
        <MetricCard
          label="Webinar Rate"
          value={`${(metrics.webinar_rate * 100).toFixed(1)}%`}
          color={metrics.webinar_rate >= 0.8 ? "green" : "amber"}
          subtitle={`${latestEntry.webinar_watched_calls} watched`}
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

      {/* Per-Call Details */}
      {latestEntry.call_details && latestEntry.call_details.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Per-Call Review</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Contact</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">Webinar</th>
                  <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">DM</th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Outcome</th>
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
                        {call.outcome === "follow_up" ? "Follow-Up" : call.outcome.charAt(0).toUpperCase() + call.outcome.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--muted)] text-xs">
                      {[call.win_notes, call.loss_notes, call.general_notes].filter(Boolean).join(" | ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
