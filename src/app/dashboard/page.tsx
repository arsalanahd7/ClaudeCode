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
  totalNoShows: number;
  totalReschedules: number;
  totalCancellations: number;
  wonDM: number;
  wonWebinar: number;
  wonPCC: number;
  lostDM: number;
  lostWebinar: number;
  lostPCC: number;
  // Total DM/Webinar presence across ALL occurred calls (any outcome)
  totalDMPresent: number;
  totalWebinarWatched: number;
  totalPCCdOccurred: number;
  totalPCCdScheduled: number;
  totalPCCdShowed: number;
  totalPCCAttempts: number;
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
    totalNoShows: entries.reduce((s, e) => s + e.no_shows, 0),
    totalReschedules: entries.reduce((s, e) => s + e.reschedules, 0),
    totalCancellations: entries.reduce((s, e) => s + e.cancellations, 0),
    wonDM: 0, wonWebinar: 0, wonPCC: 0,
    lostDM: 0, lostWebinar: 0, lostPCC: 0,
    totalDMPresent: 0, totalWebinarWatched: 0, totalPCCdOccurred: 0,
    totalPCCdScheduled: entries.reduce((s, e) => s + (e.pcced_calls || 0), 0),
    totalPCCdShowed: 0,
    totalPCCAttempts: entries.reduce((s, e) => s + (e.pcc_attempts || 0), 0),
  };

  for (const entry of entries) {
    if (!entry.call_details) continue;
    for (const call of entry.call_details) {
      if (call.pcced) base.totalPCCdShowed++;
      if (call.decision_maker_present) base.totalDMPresent++;
      if (call.webinar_watched) base.totalWebinarWatched++;
      if (call.pcced) base.totalPCCdOccurred++;
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

    agg.totalDMPresent += Math.round((monthlyAgg.totalEnrollments * 0.90) + (monthlyAgg.totalLost * 0.80));
    agg.totalWebinarWatched += Math.round((monthlyAgg.totalEnrollments * 0.90) + (monthlyAgg.totalLost * 0.80));
    agg.totalPCCdOccurred += Math.round((monthlyAgg.totalEnrollments * 0.80) + (monthlyAgg.totalLost * 0.65));

    const monthlyPCCdSched = Math.round(monthlyAgg.totalScheduled * 0.80);
    agg.totalPCCdScheduled += monthlyPCCdSched;
    agg.totalPCCdShowed += Math.round(monthlyPCCdSched * 0.80);

    for (const call of filteredHistorical) {
      agg.totalOccurred++;
      agg.totalRevenue += call.revenue || 0;
      if (call.decision_maker_present) agg.totalDMPresent++;
      if (call.webinar_watched) agg.totalWebinarWatched++;
      if (call.pcced) agg.totalPCCdOccurred++;
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
  const decisionsTotal = agg.totalWon + agg.totalLost;
  const dcd = decisionsTotal || 1;

  // DM and Webinar PRESENCE rates (fixed: now uses total presence across all occurred calls)
  const dmPresentNonFollowup = agg.wonDM + agg.lostDM;
  const webinarPresentNonFollowup = agg.wonWebinar + agg.lostWebinar;
  const nonFollowupOccurred = agg.totalWon + agg.totalLost;
  const nonDMPresent = nonFollowupOccurred - dmPresentNonFollowup;
  const nonWebinarPresent = nonFollowupOccurred - webinarPresentNonFollowup;

  const displayMetrics = {
    close_rate: agg.totalWon / co, // won / occurred (call close rate)
    decision_close_rate: agg.totalWon / dcd, // won / (won + lost)
    follow_up_rate: agg.totalFollowUps / co,
    show_rate: agg.totalScheduled > 0 ? agg.totalOccurred / cs : 1,
    non_occurred_rate: agg.totalScheduled > 0 ? agg.didntOccur / cs : 0,
    won_dm_rate: agg.wonDM / tw,
    won_webinar_rate: agg.wonWebinar / tw,
    won_pcc_rate: agg.wonPCC / tw,
    lost_dm_rate: agg.lostDM / tl,
    lost_webinar_rate: agg.lostWebinar / tl,
    lost_pcc_rate: agg.lostPCC / tl,
    decision_maker_rate: agg.totalDMPresent / co, // fixed: % of ALL occurred with DM
    webinar_rate: agg.totalWebinarWatched / co, // fixed: % of ALL occurred with webinar
    pcc_rate: agg.totalScheduled > 0 ? agg.totalPCCdScheduled / agg.totalScheduled : 0,
    won_rate: agg.totalWon / co,
    // Win rate WITH vs WITHOUT the key levers (the real coaching signal)
    win_rate_with_dm: dmPresentNonFollowup > 0 ? agg.wonDM / dmPresentNonFollowup : 0,
    win_rate_without_dm: nonDMPresent > 0 ? (agg.totalWon - agg.wonDM) / nonDMPresent : 0,
    win_rate_with_webinar: webinarPresentNonFollowup > 0 ? agg.wonWebinar / webinarPresentNonFollowup : 0,
    win_rate_without_webinar: nonWebinarPresent > 0 ? (agg.totalWon - agg.wonWebinar) / nonWebinarPresent : 0,
  };

  const pccScheduledRate = agg.totalScheduled > 0
    ? agg.totalPCCdScheduled / agg.totalScheduled
    : 0;
  const pccShowUpRate = agg.totalPCCdScheduled > 0
    ? agg.totalPCCdShowed / agg.totalPCCdScheduled
    : 0;
  // PCC Attempts → Scheduled conversion (how many attempts turned into booked calls)
  const pccAttemptsToSched = agg.totalPCCAttempts > 0
    ? agg.totalPCCdScheduled / agg.totalPCCAttempts
    : 0;
  // Win rate on PCCd calls specifically
  const pccdWinRate = agg.totalPCCdOccurred > 0 ? agg.wonPCC / agg.totalPCCdOccurred : 0;

  const avgAov = agg.totalWon > 0 ? agg.totalRevenue / agg.totalWon : 0;
  const revenuePerCall = agg.totalOccurred > 0 ? agg.totalRevenue / agg.totalOccurred : 0;
  const revenuePerScheduled = agg.totalScheduled > 0 ? agg.totalRevenue / agg.totalScheduled : 0;
  const targetNum = parseInt(monthlyTarget) || 0;
  const targetPct = targetNum > 0 ? (agg.totalRevenue / targetNum) * 100 : 0;

  // Pace-to-target: days remaining in month vs revenue needed
  const paceCalc = (() => {
    if (targetNum <= 0 || timeFilter !== "month") return null;
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const revenueNeeded = Math.max(0, targetNum - agg.totalRevenue);
    const perDayNeeded = daysRemaining > 0 ? revenueNeeded / daysRemaining : revenueNeeded;
    return { daysRemaining, revenueNeeded, perDayNeeded };
  })();

  // Sample size signal: when do we trust the metrics?
  const sampleSize = agg.totalOccurred + filteredHistorical.length;
  const lowSample = sampleSize > 0 && sampleSize < 5;

  // Data quality: flag when monthly historical estimates are included
  const usesHistoricalEstimates = !isLatest && filteredMonthly.length > 0;

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
        <div className="flex gap-3 items-center">
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
          {selectedUser && (
            <Link
              href={`/reps/${encodeURIComponent(selectedUser)}`}
              className="px-3 py-2.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-bg)] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Coaching Profile →
            </Link>
          )}
        </div>
      </div>

      {/* Data quality warnings */}
      {lowSample && (
        <div className="bg-[var(--warning-bg)] border border-[var(--warning)] text-[var(--warning)] px-4 py-3 rounded-lg text-sm mb-4">
          <strong>Small sample size:</strong> These metrics are based on only {sampleSize} call{sampleSize !== 1 ? "s" : ""}. Read with caution — rates can swing dramatically with so few data points.
        </div>
      )}
      {usesHistoricalEstimates && (
        <div className="bg-[var(--primary-bg)] border border-[var(--primary)] text-[var(--primary)] px-4 py-3 rounded-lg text-xs mb-4">
          <strong>Note:</strong> Historical months include estimated DM/Webinar/PCC rates (90%/90%/80% for wins, 80%/80%/65% for losses) derived from monthly totals — not from per-call records.
        </div>
      )}

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
              {paceCalc && paceCalc.revenueNeeded > 0 && (
                <p className="text-xs text-[var(--muted)] mt-1">
                  <span className="font-bold text-[var(--foreground)]">${Math.ceil(paceCalc.perDayNeeded).toLocaleString()}/day</span> needed for {paceCalc.daysRemaining} remaining day{paceCalc.daysRemaining !== 1 ? "s" : ""}
                </p>
              )}
              {paceCalc && paceCalc.revenueNeeded === 0 && (
                <p className="text-xs font-bold text-[var(--primary)] mt-1">✓ Target hit — stretch goal territory</p>
              )}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-[var(--muted)]">Enrollments</p>
              <p className="font-bold text-[var(--foreground)]">{totalEnrollments}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">AOV</p>
              <p className="font-bold text-[var(--foreground)]">{avgAov > 0 ? `$${avgAov.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Rev/Call</p>
              <p className="font-bold text-[var(--foreground)]">{revenuePerCall > 0 ? `$${revenuePerCall.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</p>
            </div>
          </div>
        </div>
        <div
          className="bg-white rounded-xl border border-[var(--card-border)] p-5 cursor-pointer hover:border-[var(--primary)] transition-colors"
          onClick={() => setShowCallDetails(!showCallDetails)}
        >
          <p className="text-sm text-[var(--muted)] mb-1">Calls Occurred <span className="text-xs">(click to view)</span></p>
          <p className="text-3xl font-bold text-[var(--foreground)]">{agg.totalOccurred}</p>
          <p className="text-xs text-[var(--muted-light)] mt-1">{agg.totalScheduled} in schedule &middot; {revenuePerScheduled > 0 ? `$${revenuePerScheduled.toLocaleString(undefined, { maximumFractionDigits: 0 })}/scheduled` : "—"}</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Show Rate</span>
              <span className={`font-bold ${displayMetrics.show_rate >= 0.6 ? "text-[var(--primary)]" : displayMetrics.show_rate >= 0.5 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
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
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{call.win_on_call || "—"}</td>
                    <td className="py-2 px-3 text-xs text-[var(--muted)]">{call.lose_on_call || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 2: Enrollments | Lost | Follow-Ups — with both close rate metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Enrollments</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{agg.totalWon}</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs" title="Won / All Occurred (includes follow-ups in denominator)">
              <span className="text-[var(--muted)]">Close Rate (per call)</span>
              <span className={`font-bold ${displayMetrics.close_rate >= 0.25 ? "text-[var(--primary)]" : displayMetrics.close_rate >= 0.15 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                {(displayMetrics.close_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs" title="Won / (Won + Lost) — excludes follow-ups">
              <span className="text-[var(--muted)]">Close Rate (per decision)</span>
              <span className={`font-bold ${displayMetrics.decision_close_rate >= 0.40 ? "text-[var(--primary)]" : displayMetrics.decision_close_rate >= 0.25 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                {decisionsTotal > 0 ? `${(displayMetrics.decision_close_rate * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Lost Calls</p>
          <p className="text-3xl font-bold text-[var(--danger)]">{agg.totalLost}</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Loss Rate (per decision)</span>
              <span className="font-semibold text-[var(--foreground)]">
                {decisionsTotal > 0 ? `${((agg.totalLost / dcd) * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Win:Loss Ratio</span>
              <span className="font-semibold text-[var(--foreground)]">
                {agg.totalLost > 0 ? `${(agg.totalWon / agg.totalLost).toFixed(2)}:1` : agg.totalWon > 0 ? "All wins" : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Follow-Ups</p>
          <p className="text-3xl font-bold text-[var(--warning)]">{agg.totalFollowUps}</p>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">Deferred Rate</span>
              <span className={`font-semibold ${displayMetrics.follow_up_rate > 0.4 ? "text-[var(--warning)]" : "text-[var(--foreground)]"}`}>
                {(displayMetrics.follow_up_rate * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs">
              <Link href="/follow-ups" className="text-[var(--primary)] hover:underline font-semibold">View all →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Row 2.5: Win Rate by Condition — the real coaching signal */}
      {nonFollowupOccurred >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">Win Rate by Decision Maker</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 bg-[var(--primary-bg)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">With DM Present</p>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {dmPresentNonFollowup >= 3 ? `${(displayMetrics.win_rate_with_dm * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-xs text-[var(--muted-light)]">{agg.wonDM}/{dmPresentNonFollowup} calls</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-[var(--muted)]">Without DM</p>
                <p className="text-2xl font-bold text-[var(--danger)]">
                  {nonDMPresent >= 3 ? `${(displayMetrics.win_rate_without_dm * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-xs text-[var(--muted-light)]">{agg.totalWon - agg.wonDM}/{nonDMPresent} calls</p>
              </div>
            </div>
            {dmPresentNonFollowup >= 3 && nonDMPresent >= 3 && (
              <p className="text-xs text-[var(--muted)] mt-3 pt-2 border-t border-[var(--card-border)]">
                DM presence lift:{" "}
                <strong className={displayMetrics.win_rate_with_dm > displayMetrics.win_rate_without_dm ? "text-[var(--primary)]" : "text-[var(--danger)]"}>
                  {displayMetrics.win_rate_without_dm > 0
                    ? `${(((displayMetrics.win_rate_with_dm - displayMetrics.win_rate_without_dm) / displayMetrics.win_rate_without_dm) * 100).toFixed(0)}%`
                    : "N/A"}
                </strong>
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">Win Rate by Webinar</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 bg-[var(--primary-bg)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">Watched</p>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {webinarPresentNonFollowup >= 3 ? `${(displayMetrics.win_rate_with_webinar * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-xs text-[var(--muted-light)]">{agg.wonWebinar}/{webinarPresentNonFollowup} calls</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-[var(--muted)]">Didn&apos;t Watch</p>
                <p className="text-2xl font-bold text-[var(--danger)]">
                  {nonWebinarPresent >= 3 ? `${(displayMetrics.win_rate_without_webinar * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-xs text-[var(--muted-light)]">{agg.totalWon - agg.wonWebinar}/{nonWebinarPresent} calls</p>
              </div>
            </div>
            {webinarPresentNonFollowup >= 3 && nonWebinarPresent >= 3 && (
              <p className="text-xs text-[var(--muted)] mt-3 pt-2 border-t border-[var(--card-border)]">
                Webinar lift:{" "}
                <strong className={displayMetrics.win_rate_with_webinar > displayMetrics.win_rate_without_webinar ? "text-[var(--primary)]" : "text-[var(--danger)]"}>
                  {displayMetrics.win_rate_without_webinar > 0
                    ? `${(((displayMetrics.win_rate_with_webinar - displayMetrics.win_rate_without_webinar) / displayMetrics.win_rate_without_webinar) * 100).toFixed(0)}%`
                    : "N/A"}
                </strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Row 3: PCC Funnel — Attempts → Scheduled → Showed → Won */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-4">
        <h3 className="font-bold text-sm text-[var(--primary)] uppercase tracking-wide mb-3">PCC Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 border border-[var(--card-border)] rounded-lg">
            <p className="text-xs text-[var(--muted)]">Attempts</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{agg.totalPCCAttempts || "—"}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">Outreach this period</p>
          </div>
          <div className="p-3 border border-[var(--card-border)] rounded-lg">
            <p className="text-xs text-[var(--muted)]">PCCd in Schedule</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{agg.totalPCCdScheduled}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalScheduled > 0 ? `${(displayMetrics.pcc_rate * 100).toFixed(0)}% of schedule` : "—"}
              {agg.totalPCCAttempts > 0 && ` · ${(pccAttemptsToSched * 100).toFixed(0)}% of attempts`}
            </p>
          </div>
          <div className="p-3 border border-[var(--card-border)] rounded-lg">
            <p className="text-xs text-[var(--muted)]">PCCd Showed Up</p>
            <p className={`text-2xl font-bold ${pccShowUpRate >= 0.7 ? "text-[var(--primary)]" : pccShowUpRate >= 0.55 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
              {agg.totalPCCdOccurred || agg.totalPCCdShowed}
            </p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalPCCdScheduled > 0 ? `${(pccShowUpRate * 100).toFixed(0)}% show rate` : "—"}
            </p>
          </div>
          <div className="p-3 border border-[var(--card-border)] rounded-lg">
            <p className="text-xs text-[var(--muted)]">PCCd Won</p>
            <p className="text-2xl font-bold text-[var(--primary)]">{agg.wonPCC}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalPCCdOccurred > 0 ? `${(pccdWinRate * 100).toFixed(0)}% win rate on PCCd` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Non-Occurred Breakdown (each has different coaching meaning) */}
      {agg.didntOccur > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">No-Shows</p>
            <p className="text-3xl font-bold text-[var(--danger)]">{agg.totalNoShows}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalScheduled > 0 ? `${((agg.totalNoShows / agg.totalScheduled) * 100).toFixed(0)}% of schedule` : "—"} · qualification signal
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">Reschedules</p>
            <p className="text-3xl font-bold text-[var(--warning)]">{agg.totalReschedules}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalScheduled > 0 ? `${((agg.totalReschedules / agg.totalScheduled) * 100).toFixed(0)}% of schedule` : "—"} · often recoverable
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-sm text-[var(--muted)] mb-1">Cancellations</p>
            <p className="text-3xl font-bold text-[var(--danger)]">{agg.totalCancellations}</p>
            <p className="text-xs text-[var(--muted-light)] mt-1">
              {agg.totalScheduled > 0 ? `${((agg.totalCancellations / agg.totalScheduled) * 100).toFixed(0)}% of schedule` : "—"} · lead quality
            </p>
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

      {/* Performance Insights (rule-based) */}
      <div className="bg-[var(--primary-bg)] rounded-xl border-2 border-[var(--primary)] p-6 mb-6">
        <h3 className="font-bold text-lg text-[var(--primary)] mb-4">Performance Insights</h3>
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
