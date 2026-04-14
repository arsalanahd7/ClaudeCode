"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, HistoricalCall, CumulativeStats } from "@/lib/types";
import {
  calculateCumulativeStats,
  filterEntriesByDate,
  filterHistoricalByDate,
  generateInsights,
  generateAIInsight,
} from "@/lib/metrics";
import {
  MONTHLY_DATA,
  filterMonthlyData,
  aggregateMonthlyData,
} from "@/lib/monthly-data";
import Link from "next/link";
import PerformanceChart from "@/components/PerformanceChart";
import InsightPanel from "@/components/InsightPanel";

const TIME_FILTERS = [
  { value: "latest", label: "Latest Shift" },
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

interface AggData {
  totalRevenue: number;
  totalScheduled: number;
  totalOccurred: number;
  totalWon: number;
  totalLost: number;
  totalFollowUps: number;
  didntOccur: number;
  wonDM: number;
  wonWebinar: number;
  wonPCC: number;
  lostDM: number;
  lostWebinar: number;
  lostPCC: number;
  totalPCCdScheduled: number;
  totalPCCdShowed: number;
}

function aggregateEntries(entries: ShiftEntry[]): AggData {
  const base: AggData = {
    totalRevenue: entries.reduce((s, e) => s + (e.revenue_collected || 0), 0),
    totalScheduled: entries.reduce((s, e) => s + e.calls_in_schedule, 0),
    totalOccurred: entries.reduce((s, e) => s + e.calls_occurred, 0),
    totalWon: entries.reduce((s, e) => s + e.won, 0),
    totalLost: entries.reduce((s, e) => s + e.lost, 0),
    totalFollowUps: entries.reduce((s, e) => s + e.follow_ups, 0),
    didntOccur: entries.reduce((s, e) => s + e.no_shows + e.reschedules + e.cancellations, 0),
    wonDM: 0, wonWebinar: 0, wonPCC: 0,
    lostDM: 0, lostWebinar: 0, lostPCC: 0,
    totalPCCdScheduled: entries.reduce((s, e) => s + (e.pcced_calls || 0), 0),
    totalPCCdShowed: 0,
  };

  for (const entry of entries) {
    if (!entry.call_details) continue;
    for (const call of entry.call_details) {
      if (call.pcced) base.totalPCCdShowed++;
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
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);
  const [showCallDetails, setShowCallDetails] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState("");

  // Load monthly target from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("monthlyTarget");
    if (saved) setMonthlyTarget(saved);
  }, []);

  function handleTargetChange(val: string) {
    setMonthlyTarget(val);
    localStorage.setItem("monthlyTarget", val);
  }

  const load = useCallback(async () => {
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
    if (histRes.data) setHistoricalCalls(histRes.data as HistoricalCall[]);
    setLoading(false);
  }, [selectedUser]);

  useEffect(() => {
    load();
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  const users = Array.from(new Map(entries.map((e) => [e.user_id, e.user_name])));
  const userEntries = entries.filter((e) => e.user_id === selectedUser);
  const userHistorical = historicalCalls.filter((c) => c.user_id === selectedUser);

  const isLatest = timeFilter === "latest";
  const dateFilter = isLatest ? "all" : timeFilter;
  const filteredEntries = isLatest
    ? userEntries.slice(0, 1)
    : filterEntriesByDate(userEntries, dateFilter);
  const filteredHistorical = filterHistoricalByDate(userHistorical, dateFilter);

  const latestEntry = userEntries[0];

  const filteredMonthly = isLatest ? [] : filterMonthlyData(MONTHLY_DATA, dateFilter);
  const monthlyAgg = aggregateMonthlyData(filteredMonthly);

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

  const agg = aggregateEntries(filteredEntries);

  if (!isLatest) {
    agg.totalRevenue += monthlyAgg.totalRevenue;
    agg.totalScheduled += monthlyAgg.totalScheduled;
    agg.totalOccurred += monthlyAgg.totalOccurred;
    agg.totalWon += monthlyAgg.totalEnrollments;
    agg.totalLost += monthlyAgg.totalLost;
    agg.didntOccur += monthlyAgg.didntOccur;

    agg.wonDM += Math.round(monthlyAgg.totalEnrollments * 0.90);
    agg.wonWebinar += Math.round(monthlyAgg.totalEnrollments * 0.90);
    agg.wonPCC += Math.round(monthlyAgg.totalEnrollments * 0.80);
    agg.lostDM += Math.round(monthlyAgg.totalLost * 0.80);
    agg.lostWebinar += Math.round(monthlyAgg.totalLost * 0.80);
    agg.lostPCC += Math.round(monthlyAgg.totalLost * 0.65);

    // Monthly PCCd: assume 80% of scheduled were PCCd, 80% of those showed
    const monthlyPCCdSched = Math.round(monthlyAgg.totalScheduled * 0.80);
    agg.totalPCCdScheduled += monthlyPCCdSched;
    agg.totalPCCdShowed += Math.round(monthlyPCCdSched * 0.80);

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

  const totalEnrollments = agg.totalWon;
  const co = agg.totalOccurred || 1;
  const cs = agg.totalScheduled || agg.totalOccurred || 1;
  const tw = agg.totalWon || 1;
  const tl = agg.totalLost || 1;

  const displayMetrics = {
    close_rate: agg.totalWon / co,
    follow_up_rate: agg.totalFollowUps / co,
    show_rate: agg.totalScheduled > 0 ? agg.totalOccurred / cs : 1,
    non_occurred_rate: agg.totalScheduled > 0 ? agg.didntOccur / cs : 0,
    won_dm_rate: agg.wonDM / tw,
    won_webinar_rate: agg.wonWebinar / tw,
    won_pcc_rate: agg.wonPCC / tw,
    lost_dm_rate: agg.lostDM / tl,
    lost_webinar_rate: agg.lostWebinar / tl,
    lost_pcc_rate: agg.lostPCC / tl,
    decision_maker_rate: (agg.wonDM + agg.lostDM) / co,
    webinar_rate: (agg.wonWebinar + agg.lostWebinar) / co,
    pcc_rate: agg.totalScheduled > 0 ? (agg.wonPCC + agg.lostPCC) / cs : 0,
    won_rate: agg.totalWon / co,
  };

  const pccScheduledRate = agg.totalScheduled > 0
    ? agg.totalPCCdScheduled / agg.totalScheduled
    : 0;
  const pccShowUpRate = agg.totalPCCdScheduled > 0
    ? agg.totalPCCdShowed / agg.totalPCCdScheduled
    : 0;

  const avgAov = agg.totalWon > 0 ? agg.totalRevenue / agg.totalWon : 0;
  const targetNum = parseInt(monthlyTarget) || 0;
  const targetPct = targetNum > 0 ? (agg.totalRevenue / targetNum) * 100 : 0;

  const cumulative: CumulativeStats = calculateCumulativeStats(
    filteredEntries,
    isLatest ? [] : filteredHistorical
  );
  if (!isLatest) {
    cumulative.total_revenue += monthlyAgg.totalRevenue;
    cumulative.total_calls_occurred += monthlyAgg.totalOccurred;
    cumulative.total_won_calls += monthlyAgg.totalEnrollments;
    if (cumulative.total_calls_occurred > 0) {
      cumulative.avg_close_rate = cumulative.total_won_calls / cumulative.total_calls_occurred;
    }
  }

  const insights = generateInsights(displayMetrics, cumulative);
  const allCallDetails = filteredEntries.flatMap((e) => e.call_details || []);
  const aiInsight = generateAIInsight(displayMetrics, allCallDetails, cumulative, pccScheduledRate);

  const filterLabel = TIME_FILTERS.find((f) => f.value === timeFilter)?.label || timeFilter;

  const hasPreShiftGoals =
    (latestEntry.pre_shift_revenue_goal || 0) +
      (latestEntry.pre_shift_enrollments_goal || 0) +
      (latestEntry.pre_shift_calls_goal || 0) >
    0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
            <p className="text-[var(--muted)] mt-1">AdmissionPrep Performance — {filterLabel}</p>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-0.5">Monthly Target</label>
            <input
              type="number"
              value={monthlyTarget}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-32 px-3 py-1.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="$0"
              min={0}
            />
          </div>
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

      {/* Goal vs Actual (only when viewing latest shift with pre-shift goals) */}
      {isLatest && hasPreShiftGoals && (
        <div className="bg-white rounded-xl border border-[var(--primary)] p-5 mb-4">
          <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-3">
            Pre-Shift Goal vs Actual
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              const revGoal = latestEntry.pre_shift_revenue_goal || 0;
              const enrGoal = latestEntry.pre_shift_enrollments_goal || 0;
              const callsGoal = latestEntry.pre_shift_calls_goal || 0;
              const revActual = latestEntry.revenue_collected || 0;
              const enrActual = latestEntry.won || 0;
              const callsActual = latestEntry.calls_in_schedule || 0;
              const items = [
                { label: "Revenue", goal: revGoal, actual: revActual, prefix: "$" },
                { label: "Enrollments", goal: enrGoal, actual: enrActual, prefix: "" },
                { label: "Calls", goal: callsGoal, actual: callsActual, prefix: "" },
              ];
              return items.map((item) => {
                const pct = item.goal > 0 ? (item.actual / item.goal) * 100 : 0;
                const hit = pct >= 100;
                return (
                  <div key={item.label} className="border border-[var(--card-border)] rounded-lg p-3">
                    <p className="text-xs text-[var(--muted)] mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-[var(--foreground)]">
                      {item.prefix}{item.actual.toLocaleString()}
                      <span className="text-xs text-[var(--muted)] font-normal"> / {item.prefix}{item.goal.toLocaleString()}</span>
                    </p>
                    {item.goal > 0 && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: hit ? "#2d5a3d" : "#b8860b",
                            }}
                          />
                        </div>
                        <p className={`text-xs font-bold mt-1 ${hit ? "text-[var(--primary)]" : "text-[var(--warning)]"}`}>
                          {pct.toFixed(0)}% {hit ? "✓ Hit" : "of goal"}
                        </p>
                      </>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          {(latestEntry.pcc_attempts || 0) > 0 && (
            <p className="text-xs text-[var(--muted)] mt-3">
              PCC Attempts this shift: <strong className="text-[var(--primary)]">{latestEntry.pcc_attempts}</strong>
            </p>
          )}
        </div>
      )}

      {/* Row 1: Revenue | Calls Occurred (with show rate) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Revenue</p>
          <p className="text-3xl font-bold text-[var(--primary)]">${agg.totalRevenue.toLocaleString()}</p>
          {targetNum > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--muted)]">Target: ${targetNum.toLocaleString()}</span>
                <span className={`font-bold ${targetPct >= 100 ? "text-[var(--primary)]" : "text-[var(--warning)]"}`}>{targetPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(targetPct, 100)}%`, backgroundColor: targetPct >= 100 ? "#2d5a3d" : "#b8860b" }} />
              </div>
            </div>
          )}
          <p className="text-xs text-[var(--muted-light)] mt-1">
            {totalEnrollments} enrollment{totalEnrollments !== 1 ? "s" : ""} &middot; AOV {avgAov > 0 ? `$${avgAov.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
        </div>
        <div
          className="bg-white rounded-xl border border-[var(--card-border)] p-5 cursor-pointer hover:border-[var(--primary)] transition-colors"
          onClick={() => setShowCallDetails(!showCallDetails)}
        >
          <p className="text-sm text-[var(--muted)] mb-1">Calls Occurred <span className="text-xs">(click to view)</span></p>
          <p className="text-3xl font-bold text-[var(--foreground)]">{agg.totalOccurred}</p>
          <p className="text-xs text-[var(--muted-light)] mt-1">{agg.totalScheduled} in schedule</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Show Rate</span>
              <span className={`font-bold ${displayMetrics.show_rate >= 0.7 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                {(displayMetrics.show_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clickable Call Details */}
      {showCallDetails && allCallDetails.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--primary)] p-5 mb-4">
          <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-3">
            Call Details ({allCallDetails.length} call{allCallDetails.length !== 1 ? "s" : ""})
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
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Win on Call</th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Lose on Call</th>
                </tr>
              </thead>
              <tbody>
                {allCallDetails.map((call, i) => (
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
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{call.win_on_call || call.notes || "—"}</td>
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{call.lose_on_call || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 2: Enrollments (with close rate) | Lost Calls (with sub-rates) | Follow-Ups */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Enrollments</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{agg.totalWon}</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Close Rate</span>
              <span className={`font-bold ${displayMetrics.close_rate >= 0.3 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                {(displayMetrics.close_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">DM Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.won_dm_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Webinar Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{(displayMetrics.won_webinar_rate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

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
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Follow-Ups</p>
          <p className="text-3xl font-bold text-[var(--warning)]">{agg.totalFollowUps}</p>
          <p className="text-xs text-[var(--muted-light)] mt-1">
            <Link href="/follow-ups" className="text-[var(--primary)] hover:underline">View all →</Link>
          </p>
        </div>
      </div>

      {/* Row 3: PCC to Calls in Schedule Rate | PCCd Calls to Show Up Rate */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">PCC to Calls in Schedule Rate</p>
          <p className={`text-3xl font-bold ${displayMetrics.pcc_rate >= 0.5 ? "text-[var(--primary)]" : "text-[var(--warning)]"}`}>
            {agg.totalScheduled > 0 ? `${(displayMetrics.pcc_rate * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">PCCd Calls to Show Up Rate</p>
          <p className={`text-3xl font-bold ${pccShowUpRate >= 0.7 ? "text-[var(--primary)]" : "text-[var(--warning)]"}`}>
            {agg.totalPCCdScheduled > 0 ? `${(pccShowUpRate * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Row 4: Didn't Occur */}
      {agg.didntOccur > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">Calls Didn&apos;t Occur</p>
            <p className="text-3xl font-bold text-[var(--danger)]">{agg.didntOccur}</p>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {!isLatest && filteredMonthly.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <button
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide">
              Monthly Breakdown ({filteredMonthly.length} month{filteredMonthly.length !== 1 ? "s" : ""})
            </h3>
            <span className="text-[var(--primary)] text-sm font-semibold">{showMonthlyBreakdown ? "Hide" : "Show"}</span>
          </button>

          {showMonthlyBreakdown && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--primary)]">
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Month</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Revenue</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Enrollments</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Occurred</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Close Rate</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthly.map((m) => {
                    const cr = m.calls_occurred > 0 ? m.enrollments / m.calls_occurred : 0;
                    const aov = m.enrollments > 0 ? m.revenue / m.enrollments : 0;
                    return (
                      <tr key={m.month} className="border-b border-[var(--card-border)] last:border-0">
                        <td className="py-2 px-3 font-semibold">{m.label}</td>
                        <td className="py-2 px-3 text-right">${m.revenue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-[var(--primary)] font-semibold">{m.enrollments}</td>
                        <td className="py-2 px-3 text-right">{m.calls_occurred}</td>
                        <td className="py-2 px-3 text-right">{(cr * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right">{aov > 0 ? `$${aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-[var(--primary)] font-bold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right text-[var(--primary)]">${monthlyAgg.totalRevenue.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-[var(--primary)]">{monthlyAgg.totalEnrollments}</td>
                    <td className="py-2 px-3 text-right">{monthlyAgg.totalOccurred}</td>
                    <td className="py-2 px-3 text-right">{(monthlyAgg.closeRate * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{monthlyAgg.avgAov > 0 ? `$${monthlyAgg.avgAov.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Performance Chart */}
      <div className="mb-6">
        <PerformanceChart metrics={displayMetrics} />
      </div>

      {/* AI Coaching */}
      <div className="bg-[var(--primary-bg)] rounded-xl border-2 border-[var(--primary)] p-6 mb-6">
        <h3 className="font-bold text-lg text-[var(--primary)] mb-4">AI Performance Coach</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <p className="text-xs text-[var(--muted)] uppercase font-bold mb-1">Diagnosis</p>
            <p className="text-base font-bold text-[var(--foreground)]">{aiInsight.diagnosis}</p>
            <p className="text-sm text-[var(--muted)] mt-2 italic">{aiInsight.explanation}</p>
          </div>
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

        {(cumulative.webinar_win_rate > 0 || cumulative.dm_win_rate > 0) && (
          <div className="mt-5 pt-4 border-t border-[var(--primary)]/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cumulative.webinar_win_rate > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate with Webinar Watched</p>
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
                <p className="text-xs text-[var(--muted)] uppercase">Win Rate with DM Present</p>
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
