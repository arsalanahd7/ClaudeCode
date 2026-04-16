"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const TEAM_MEMBERS = [
  "Arsalan",
  "David",
  "A-M",
  "Shyla",
  "Madison",
  "Arry",
  "Jason",
  "Ann-Marie",
  "Irene",
];

export default function HistoricalCallForm() {
  const [userName, setUserName] = useState("Arsalan");
  const [month, setMonth] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [callsOccurred, setCallsOccurred] = useState("");
  const [enrollments, setEnrollments] = useState("");
  const [revenue, setRevenue] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const occNum = parseInt(callsOccurred) || 0;
  const enrNum = parseInt(enrollments) || 0;
  const revNum = parseInt(revenue) || 0;
  const closeRate = occNum > 0 ? (enrNum / occNum) * 100 : 0;
  const aov = enrNum > 0 ? revNum / enrNum : 0;
  const showRate = 70; // assumed
  const scheduled = occNum > 0 ? Math.round(occNum / 0.70) : 0;
  const lostCalls = Math.max(0, occNum - enrNum);

  // Derived metrics: 95% DM, 95% webinar, 80% PCC
  const wonDM = Math.round(enrNum * 0.95);
  const wonWebinar = Math.round(enrNum * 0.95);
  const wonPCC = Math.round(enrNum * 0.80);
  const lostDM = Math.round(lostCalls * 0.95);
  const lostWebinar = Math.round(lostCalls * 0.95);
  const lostPCC = Math.round(lostCalls * 0.80);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    if (!userName.trim()) {
      setError("Please select a name.");
      setSubmitting(false);
      return;
    }
    if (!month) {
      setError("Please select a month.");
      setSubmitting(false);
      return;
    }

    const userId = userName.toLowerCase().replace(/\s+/g, "_");
    // Use first day of the month as shift_date
    const shiftDate = `${month}-01`;

    const entry = {
      user_id: userId,
      user_name: userName,
      shift_date: shiftDate,
      revenue_collected: revNum,
      enrollments: enrNum,
      calls_in_schedule: scheduled,
      calls_occurred: occNum,
      won: enrNum,
      lost: lostCalls,
      follow_ups: 0,
      no_shows: Math.round((scheduled - occNum) * 0.5),
      reschedules: Math.round((scheduled - occNum) * 0.3),
      cancellations: Math.round((scheduled - occNum) * 0.2),
      decision_maker_calls: wonDM + lostDM,
      webinar_watched_calls: wonWebinar + lostWebinar,
      pcced_calls: Math.round(scheduled * 0.80),
      call_details: [],
      win_notes: `Manual input for ${month}`,
      loss_notes: "",
    };

    const { error: dbError } = await supabase
      .from("shift_entries")
      .insert([entry]);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
      setMonth("");
      setMonthlyTarget("");
      setCallsOccurred("");
      setEnrollments("");
      setRevenue("");
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Name + Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Account Executive</label>
          <select
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Select name...</option>
            {TEAM_MEMBERS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--primary)]">Monthly Data Calculator</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Monthly Target ($)</label>
            <input
              type="number"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="e.g. 50000"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Revenue ($)</label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Calls Occurred</label>
            <input
              type="number"
              value={callsOccurred}
              onChange={(e) => setCallsOccurred(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="0"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Enrollments (Won Calls)</label>
            <input
              type="number"
              value={enrollments}
              onChange={(e) => setEnrollments(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {/* Derived Metrics Preview */}
        {occNum > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wide mb-3">Derived Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--primary-bg)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted)]">Close Rate</p>
                <p className="text-lg font-bold text-[var(--primary)]">{closeRate.toFixed(1)}%</p>
              </div>
              <div className="bg-[var(--primary-bg)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted)]">AOV</p>
                <p className="text-lg font-bold text-[var(--primary)]">${aov > 0 ? aov.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</p>
              </div>
              <div className="bg-[var(--primary-bg)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted)]">Scheduled (est.)</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{scheduled}</p>
              </div>
              <div className="bg-[var(--primary-bg)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted)]">Lost</p>
                <p className="text-lg font-bold text-[var(--danger)]">{lostCalls}</p>
              </div>
            </div>
            {parseInt(monthlyTarget) > 0 && (
              <div className="mt-3 bg-[var(--primary-bg)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted)]">Target Progress</p>
                <p className="text-lg font-bold text-[var(--primary)]">
                  {((revNum / parseInt(monthlyTarget)) * 100).toFixed(1)}%
                  <span className="text-sm font-normal text-[var(--muted)] ml-2">
                    (${revNum.toLocaleString()} / ${parseInt(monthlyTarget).toLocaleString()})
                  </span>
                </p>
              </div>
            )}
            <p className="text-xs text-[var(--muted)] mt-2 italic">
              Assumed rates: 95% DM, 95% webinar, 80% PCC, 70% show rate
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm border border-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">
          Monthly data added successfully! This will appear in your Dashboard and Leaderboard.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-lg tracking-wide"
      >
        {submitting ? "Adding..." : "Add Monthly Data"}
      </button>
    </form>
  );
}
