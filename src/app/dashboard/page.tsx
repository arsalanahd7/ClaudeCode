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
        <p className="text-[var(--muted)]">Loading dashboard...</p>
      </div>
    );
  }

  if (!latestEntry) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-[var(--muted)]">No shift data yet. Submit your first End of Shift form to see your performance.</p>
      </div>
    );
  }

  const metrics = calculateMetrics(latestEntry);
  const insights = generateInsights(metrics, latestEntry.weak_stages || []);
  const aiInsight = generateAIInsight(metrics, latestEntry.weak_stages || [], insights);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--muted)] mt-1">Latest shift performance overview</p>
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-3 py-2 border border-[var(--card-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {users.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Close Rate"
          value={`${(metrics.close_rate * 100).toFixed(1)}%`}
          color={metrics.close_rate >= 0.3 ? "green" : "red"}
          subtitle={`${latestEntry.won} won / ${latestEntry.calls_completed} completed`}
        />
        <MetricCard
          label="Show Rate"
          value={`${(metrics.show_rate * 100).toFixed(1)}%`}
          color={metrics.show_rate >= 0.7 ? "green" : "red"}
          subtitle={`${latestEntry.calls_completed} / ${latestEntry.calls_scheduled} scheduled`}
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

      {/* Revenue */}
      <div className="mb-6">
        <MetricCard
          label="Revenue Closed"
          value={`$${(latestEntry.revenue || 0).toLocaleString()}`}
          color="blue"
          subtitle={`From ${latestEntry.won} closed deals`}
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

      {/* Notes */}
      {(latestEntry.win_notes || latestEntry.loss_notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {latestEntry.win_notes && (
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <h3 className="font-semibold text-sm text-[var(--success)] uppercase tracking-wide mb-2">Win Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{latestEntry.win_notes}</p>
            </div>
          )}
          {latestEntry.loss_notes && (
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <h3 className="font-semibold text-sm text-[var(--danger)] uppercase tracking-wide mb-2">Loss Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{latestEntry.loss_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
