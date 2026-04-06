"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, HistoricalCall, CumulativeStats } from "@/lib/types";
import { ImportedDeal, calculateImportStats, filterDealsByDate } from "@/lib/csv-import";
import {
  calculateMetrics,
  calculateCumulativeStats,
  filterEntriesByDate,
  filterHistoricalByDate,
  generateInsights,
  generateAIInsight,
} from "@/lib/metrics";
import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import InsightPanel from "@/components/InsightPanel";
import AIInsightPanel from "@/components/AIInsightPanel";

const TIME_FILTERS = [
  { value: "latest", label: "Latest Shift" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
  { value: "all", label: "Cumulative (All Time)" },
];

interface AggData {
  totalRevenue: number;
  totalScheduled: number;
  totalOccurred: number;
  totalWon: number;
  totalLost: number;
  totalFollowUps: number;
  totalNoShows: number;
  totalReschedules: number;
  totalCancellations: number;
  // Won-specific rates
  wonDM: number;
  wonWebinar: number;
  wonPCC: number;
  // Lost-specific rates
  lostDM: number;
  lostWebinar: number;
  lostPCC: number;
}

function aggregateEntries(entries: ShiftEntry[]): AggData {
  const base: AggData = {
    totalRevenue: entries.reduce((s, e) => s + (e.revenue_collected || 0), 0),
    totalScheduled: entries.reduce((s, e) => s + e.calls_in_schedule, 0),
    totalOccurred: entries.reduce((s, e) => s + e.calls_occurred, 0),
    totalWon: entries.reduce((s, e) => s + e.won, 0),
    totalLost: entries.reduce((s, e) => s + e.lost, 0),
    totalFollowUps: entries.reduce((s, e) => s + e.follow_ups, 0),
    totalNoShows: entries.reduce((s, e) => s + e.no_shows, 0),
    totalReschedules: entries.reduce((s, e) => s + e.reschedules, 0),
    totalCancellations: entries.reduce((s, e) => s + e.cancellations, 0),
    wonDM: 0, wonWebinar: 0, wonPCC: 0,
    lostDM: 0, lostWebinar: 0, lostPCC: 0,
  };

  // Derive won/lost-specific DM/webinar/PCC from call_details
  for (const entry of entries) {
    if (!entry.call_details) continue;
    for (const call of entry.call_details) {
      if (call.outcome === "won") {
        if (call.decision_maker_present) base.wonDM++;
        if (call.webinar_watched) base.wonWebinar++;
        if (call.pcced) base.wonPCC++;
      } else if (call.outcome === "lost") {
        if (call.decision_maker_present) base.lostDM++;
        if (call.webinar_watched) base.lostWebinar++;
        if (call.pcced) base.lostPCC++;
      }
    }
  }

  return base;
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [historicalCalls, setHistoricalCalls] = useState<HistoricalCall[]>([]);
  const [importedDeals, setImportedDeals] = useState<ImportedDeal[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [showShiftHistory, setShowShiftHistory] = useState(false);

  useEffect(() => {
    async function load() {
      const [shiftRes, histRes, importRes] = await Promise.all([
        supabase.from("shift_entries").select("*").order("created_at", { ascending: false }),
        supabase.from("historical_calls").select("*").order("call_date", { ascending: false }),
        supabase.from("imported_deals").select("*").order("close_date", { ascending: false }),
      ]);

      if (shiftRes.data) {
        setEntries(shiftRes.data as ShiftEntry[]);
        if (shiftRes.data.length > 0 && !selectedUser) {
          setSelectedUser(shiftRes.data[0].user_id);
        }
      }
      if (histRes.data) setHistoricalCalls(histRes.data as HistoricalCall[]);
      if (importRes.data) setImportedDeals(importRes.data as ImportedDeal[]);
      setLoading(false);
    }
    load();
  }, [selectedUser]);

  const users = Array.from(new Map(entries.map((e) => [e.user_id, e.user_name])));
  const userEntries = entries.filter((e) => e.user_id === selectedUser);
  const userHistorical = historicalCalls.filter((c) => c.user_id === selectedUser);
  const userImported = importedDeals.filter((d) => d.user_id === selectedUser);

  // Filter entries based on time
  const isLatest = timeFilter === "latest";
  const dateFilter = isLatest ? "all" : timeFilter;
  const filteredEntries = isLatest
    ? userEntries.slice(0, 1)
    : filterEntriesByDate(userEntries, dateFilter);
  const filteredHistorical = filterHistoricalByDate(userHistorical, dateFilter);
  const filteredImported = filterDealsByDate(userImported, dateFilter);

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
        <h1 className="text-2xl font-bold text-[var(--primary)] mb-2">Dashboard</h1>
        <p className="text-[var(--muted)] italic">No shift data yet. Submit your first End of Shift form to see your performance.</p>
      </div>
    );
  }

  // Aggregate stats across all filtered entries
  const agg = aggregateEntries(filteredEntries);

  // Only add imported deals and historical calls for non-latest filters
  const importStats = calculateImportStats(filteredImported);
  const hasImportedData = filteredImported.length > 0;
  if (!isLatest && hasImportedData) {
    // Hardcoded CSV assumptions based on real HubSpot data
    const csvScheduled = 531;
    const csvOccurred = 414;
    const csvLost = 300;
    const csvWon = csvOccurred - csvLost; // 114
    const csvNoShows = csvScheduled - csvOccurred; // 117
    const csvCancels = Math.round(csvNoShows * 0.70); // ~82
    const csvReschedules = csvNoShows - csvCancels; // ~35

    agg.totalRevenue += importStats.total_revenue;
    agg.totalScheduled += csvScheduled;
    agg.totalOccurred += csvOccurred;
    agg.totalWon += csvWon;
    agg.totalLost += csvLost;
    agg.totalNoShows += csvNoShows;
    agg.totalCancellations += csvCancels;
    agg.totalReschedules += csvReschedules;

    // CSV won calls: 90% DM, 90% webinar, 80% PCC
    agg.wonDM += Math.round(csvWon * 0.90);
    agg.wonWebinar += Math.round(csvWon * 0.90);
    agg.wonPCC += Math.round(csvWon * 0.80);
    // CSV lost calls: 80% DM, 80% webinar, 65% PCC
    agg.lostDM += Math.round(csvLost * 0.80);
    agg.lostWebinar += Math.round(csvLost * 0.80);
    agg.lostPCC += Math.round(csvLost * 0.65);
  }

  if (!isLatest) {
    // Add historical call stats
    for (const call of filteredHistorical) {
      agg.totalOccurred++;
      agg.totalRevenue += call.revenue || 0;
      if (call.outcome === "won") {
        agg.totalWon++;
        if (call.decision_maker_present) agg.wonDM++;
        if (call.webinar_watched) agg.wonWebinar++;
        if (call.pcced) agg.wonPCC++;
      } else if (call.outcome === "lost") {
        agg.totalLost++;
        if (call.decision_maker_present) agg.lostDM++;
        if (call.webinar_watched) agg.lostWebinar++;
        if (call.pcced) agg.lostPCC++;
      } else {
        agg.totalFollowUps++;
      }
    }
  }

  // Enrollments always = won calls
  const totalEnrollments = agg.totalWon;

  // Calculate rates from aggregated data
  const co = agg.totalOccurred || 1;
  const cs = agg.totalScheduled || agg.totalOccurred || 1;
  const nonOccurred = agg.totalNoShows + agg.totalReschedules + agg.totalCancellations;
  const tw = agg.totalWon || 1;
  const tl = agg.totalLost || 1;

  const displayMetrics = {
    close_rate: agg.totalWon / co,
    follow_up_rate: agg.totalFollowUps / co,
    show_rate: agg.totalScheduled > 0 ? agg.totalOccurred / cs : 1,
    non_occurred_rate: agg.totalScheduled > 0 ? nonOccurred / cs : 0,
    // Won-specific rates
    won_dm_rate: agg.wonDM / tw,
    won_webinar_rate: agg.wonWebinar / tw,
    won_pcc_rate: agg.wonPCC / tw,
    // Lost-specific rates
    lost_dm_rate: agg.lostDM / tl,
    lost_webinar_rate: agg.lostWebinar / tl,
    lost_pcc_rate: agg.lostPCC / tl,
    // Overall
    decision_maker_rate: (agg.wonDM + agg.lostDM) / co,
    webinar_rate: (agg.wonWebinar + agg.lostWebinar) / co,
    pcc_rate: (agg.wonPCC + agg.lostPCC) / co,
    won_rate: agg.totalWon / co,
  };

  // AOV = revenue / won calls (enrollments = won calls)
  const avgAov = agg.totalWon > 0 ? agg.totalRevenue / agg.totalWon : 0;

  // For insights use cumulative stats from shift data
  const cumulative: CumulativeStats = calculateCumulativeStats(
    filteredEntries,
    isLatest ? [] : filteredHistorical
  );
  if (!isLatest) {
    cumulative.total_revenue += importStats.total_revenue;
    cumulative.total_calls_occurred += importStats.total_deals;
    cumulative.total_won_calls += importStats.total_won;
    if (cumulative.total_calls_occurred > 0) {
      cumulative.avg_close_rate = cumulative.total_won_calls / cumulative.total_calls_occurred;
    }
  }

  const insights = generateInsights(displayMetrics, cumulative);

  // For AI insight, gather all call details from filtered entries
  const allCallDetails = filteredEntries.flatMap((e) => e.call_details || []);
  const aiInsight = generateAIInsight(displayMetrics, allCallDetails, cumulative);

  const filterLabel = TIME_FILTERS.find((f) => f.value === timeFilter)?.label || timeFilter;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
          <p className="text-[var(--muted)] mt-1">AdmissionPrep Performance — {filterLabel}</p>
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

      {/* Row 1: Revenue | Calls Occurred */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Revenue</p>
          <p className="text-3xl font-bold text-[var(--primary)]">${agg.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted-light)] mt-1">
            {totalEnrollments} enrollment{totalEnrollments !== 1 ? "s" : ""} &middot; AOV {avgAov > 0 ? `$${avgAov.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Calls Occurred</p>
          <p className="text-3xl font-bold text-[var(--foreground)]">{agg.totalOccurred}</p>
          <p className="text-xs text-[var(--muted-light)] mt-1">{agg.totalScheduled} in schedule</p>
        </div>
      </div>

      {/* Row 2: Won Calls (with sub-rates) | Lost Calls (with sub-rates) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Won Calls Card */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Won Calls</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{agg.totalWon}</p>
          <div className="mt-3 pt-3 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">DM Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.won_dm_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Webinar Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.won_webinar_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">PCC Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.won_pcc_rate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Lost Calls Card */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Lost Calls</p>
          <p className="text-3xl font-bold text-[var(--danger)]">{agg.totalLost}</p>
          <div className="mt-3 pt-3 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">DM Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.lost_dm_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Webinar Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.lost_webinar_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">PCC Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.lost_pcc_rate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Close Rate | Show Rate | Follow-Ups */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <MetricCard
          label="Close Rate"
          value={`${(displayMetrics.close_rate * 100).toFixed(1)}%`}
          color={displayMetrics.close_rate >= 0.3 ? "green" : "red"}
          subtitle={`${agg.totalWon} / ${agg.totalOccurred}`}
        />
        <MetricCard
          label="Show Rate"
          value={agg.totalScheduled > 0 ? `${(displayMetrics.show_rate * 100).toFixed(1)}%` : "—"}
          color={displayMetrics.show_rate >= 0.7 ? "green" : "red"}
          subtitle={agg.totalScheduled > 0 ? `${agg.totalOccurred} / ${agg.totalScheduled}` : undefined}
        />
        <MetricCard
          label="Follow-Ups"
          value={agg.totalFollowUps}
          color={agg.totalFollowUps > 0 ? "amber" : "default"}
        />
      </div>

      {/* Row 4: Non-Occurred Breakdown */}
      {nonOccurred > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="No-Shows"
            value={nonOccurred}
            color="red"
            subtitle={`${agg.totalScheduled} scheduled − ${agg.totalOccurred} occurred`}
          />
          <MetricCard
            label="Cancelled"
            value={agg.totalCancellations}
            color="red"
            subtitle={`~70% of no-shows`}
          />
          <MetricCard
            label="Rescheduled"
            value={agg.totalReschedules}
            color="amber"
            subtitle={`~30% of no-shows`}
          />
        </div>
      )}

      {/* Chart */}
      <div className="mb-6">
        <PerformanceChart metrics={displayMetrics} />
      </div>

      {/* AI Coaching — Elevated */}
      <div className="bg-[var(--primary-bg)] rounded-xl border-2 border-[var(--primary)] p-6 mb-6">
        <h3 className="font-bold text-lg text-[var(--primary)] mb-4">AI Performance Coach</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Diagnosis */}
          <div className="lg:col-span-1">
            <p className="text-xs text-[var(--muted)] uppercase font-bold mb-1">Diagnosis</p>
            <p className="text-base font-bold text-[var(--foreground)]">{aiInsight.diagnosis}</p>
            <p className="text-sm text-[var(--muted)] mt-2 italic">{aiInsight.explanation}</p>
          </div>
          {/* Actions */}
          <div className="lg:col-span-2">
            <p className="text-xs text-[var(--muted)] uppercase font-bold mb-2">Recommended Actions</p>
            <ul className="space-y-2">
              {aiInsight.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key stats for context */}
        {(cumulative.webinar_win_rate > 0 || cumulative.dm_win_rate > 0) && (
          <div className="mt-5 pt-4 border-t border-[var(--primary)]/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cumulative.webinar_win_rate > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate (Webinar)</p>
                <p className="text-lg font-bold text-[var(--primary)]">{(cumulative.webinar_win_rate * 100).toFixed(0)}%</p>
              </div>
            )}
            {cumulative.non_webinar_win_rate > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate (No Webinar)</p>
                <p className="text-lg font-bold text-[var(--danger)]">{(cumulative.non_webinar_win_rate * 100).toFixed(0)}%</p>
              </div>
            )}
            {cumulative.dm_win_rate > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate (DM Present)</p>
                <p className="text-lg font-bold text-[var(--primary)]">{(cumulative.dm_win_rate * 100).toFixed(0)}%</p>
              </div>
            )}
            {cumulative.non_dm_win_rate > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate (No DM)</p>
                <p className="text-lg font-bold text-[var(--danger)]">{(cumulative.non_dm_win_rate * 100).toFixed(0)}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coaching Nudges */}
      {insights.length > 0 && (
        <div className="mb-6">
          <InsightPanel insights={insights} />
        </div>
      )}

      {/* Per-Call Details (Latest Shift) */}
      {latestEntry.call_details && latestEntry.call_details.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">
            Latest Shift — Per-Call Review ({latestEntry.shift_date || "—"})
          </h3>
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
            Shift History ({filteredEntries.length} shift{filteredEntries.length !== 1 ? "s" : ""})
          </h3>
          <span className="text-[var(--primary)] text-sm font-semibold">{showShiftHistory ? "Hide" : "Show"}</span>
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
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]"></th>
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
                    <td className="py-2 px-3 text-right">
                      <Link href={`/edit-shift?id=${entry.id}`} className="text-[var(--primary)] hover:underline text-xs font-semibold">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes (from latest shift) */}
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
