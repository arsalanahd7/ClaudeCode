"use client";

import { useState } from "react";
import { CallDetail } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const EMPTY_CALL: CallDetail = {
  contact_name: "",
  webinar_watched: false,
  decision_maker_present: false,
  outcome: "won",
  win_notes: "",
  loss_notes: "",
  general_notes: "",
};

export default function ShiftForm() {
  const [userName, setUserName] = useState("");

  // Cumulative fields
  const [totalRevenueSinceStart, setTotalRevenueSinceStart] = useState("");
  const [totalCallsSinceStart, setTotalCallsSinceStart] = useState("");

  // This shift
  const [revenueCollected, setRevenueCollected] = useState("");
  const [callsInSchedule, setCallsInSchedule] = useState("");

  // Non-occurred
  const [noShows, setNoShows] = useState("");
  const [reschedules, setReschedules] = useState("");
  const [cancellations, setCancellations] = useState("");

  // Occurred outcomes
  const [won, setWon] = useState("");
  const [lost, setLost] = useState("");
  const [followUps, setFollowUps] = useState("");

  // Per-call table
  const [callDetails, setCallDetails] = useState<CallDetail[]>([]);

  // Overall notes
  const [winNotes, setWinNotes] = useState("");
  const [lossNotes, setLossNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Derived values
  const scheduleNum = parseInt(callsInSchedule) || 0;
  const noShowNum = parseInt(noShows) || 0;
  const rescheduleNum = parseInt(reschedules) || 0;
  const cancelNum = parseInt(cancellations) || 0;
  const nonOccurred = noShowNum + rescheduleNum + cancelNum;
  const callsOccurred = Math.max(0, scheduleNum - nonOccurred);

  const wonNum = parseInt(won) || 0;
  const lostNum = parseInt(lost) || 0;
  const followUpNum = parseInt(followUps) || 0;

  // Count per-call DM and webinar stats
  const dmCalls = callDetails.filter((c) => c.decision_maker_present).length;
  const webinarCalls = callDetails.filter((c) => c.webinar_watched).length;

  // When calls occurred changes, adjust the call details table
  function handleCallsOccurredChange(newCount: number) {
    setCallDetails((prev) => {
      if (newCount > prev.length) {
        return [...prev, ...Array(newCount - prev.length).fill(null).map(() => ({ ...EMPTY_CALL }))];
      }
      return prev.slice(0, newCount);
    });
  }

  // Re-sync call details when schedule or non-occurred changes
  function recalcAndSync(newSchedule: number, newNonOccurred: number) {
    const newOccurred = Math.max(0, newSchedule - newNonOccurred);
    handleCallsOccurredChange(newOccurred);
  }

  function updateCallDetail(index: number, field: keyof CallDetail, value: string | boolean) {
    setCallDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    if (!userName.trim()) {
      setError("Please enter your name.");
      setSubmitting(false);
      return;
    }

    if (scheduleNum <= 0) {
      setError("Calls in Schedule must be greater than 0.");
      setSubmitting(false);
      return;
    }

    const userId = userName.toLowerCase().replace(/\s+/g, "_");

    const entry = {
      user_id: userId,
      user_name: userName,
      revenue_collected: parseInt(revenueCollected) || 0,
      total_calls_since_start: parseInt(totalCallsSinceStart) || 0,
      total_revenue_since_start: parseInt(totalRevenueSinceStart) || 0,
      calls_in_schedule: scheduleNum,
      calls_occurred: callsOccurred,
      won: wonNum,
      lost: lostNum,
      follow_ups: followUpNum,
      no_shows: noShowNum,
      reschedules: rescheduleNum,
      cancellations: cancelNum,
      decision_maker_calls: dmCalls,
      webinar_watched_calls: webinarCalls,
      call_details: callDetails,
      win_notes: winNotes,
      loss_notes: lossNotes,
    };

    const { error: dbError } = await supabase
      .from("shift_entries")
      .insert([entry]);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
      setRevenueCollected("");
      setCallsInSchedule("");
      setNoShows("");
      setReschedules("");
      setCancellations("");
      setWon("");
      setLost("");
      setFollowUps("");
      setCallDetails([]);
      setWinNotes("");
      setLossNotes("");
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-[var(--foreground)]">
          Your Name
        </label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          placeholder="e.g. John Smith"
        />
      </div>

      {/* Cumulative Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Cumulative Performance</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Your all-time totals since you started. These add to your previous numbers.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Total Revenue Since Start ($)</label>
            <input
              type="number"
              value={totalRevenueSinceStart}
              onChange={(e) => setTotalRevenueSinceStart(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="0"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Total Calls Since Start</label>
            <input
              type="number"
              value={totalCallsSinceStart}
              onChange={(e) => setTotalCallsSinceStart(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="0"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* This Shift Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-1">This Shift</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Today&apos;s numbers. Revenue and calls in schedule for this session.</p>

        {/* Revenue */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1.5">Revenue Collected ($)</label>
          <input
            type="number"
            value={revenueCollected}
            onChange={(e) => setRevenueCollected(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="0"
            min={0}
          />
        </div>

        {/* Calls in Schedule */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1.5 text-lg">Calls in Schedule</label>
          <input
            type="number"
            value={callsInSchedule}
            onChange={(e) => {
              setCallsInSchedule(e.target.value);
              const newSched = parseInt(e.target.value) || 0;
              recalcAndSync(newSched, nonOccurred);
            }}
            className="w-full px-4 py-3 border-2 border-[var(--primary)] rounded-lg bg-[var(--primary-bg)] text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="0"
            min={0}
          />
        </div>

        {/* Branching: Non-Occurred */}
        <div className="ml-4 border-l-2 border-[var(--card-border)] pl-5 mb-6">
          <h3 className="text-sm font-bold text-[var(--danger)] uppercase tracking-wide mb-3">
            Non-Occurred Calls
            <span className="ml-2 text-[var(--muted)] font-normal lowercase">({nonOccurred} total)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">No-Shows</label>
              <input
                type="number"
                value={noShows}
                onChange={(e) => {
                  setNoShows(e.target.value);
                  const newNon = (parseInt(e.target.value) || 0) + rescheduleNum + cancelNum;
                  recalcAndSync(scheduleNum, newNon);
                }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Rescheduled</label>
              <input
                type="number"
                value={reschedules}
                onChange={(e) => {
                  setReschedules(e.target.value);
                  const newNon = noShowNum + (parseInt(e.target.value) || 0) + cancelNum;
                  recalcAndSync(scheduleNum, newNon);
                }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Cancelled</label>
              <input
                type="number"
                value={cancellations}
                onChange={(e) => {
                  setCancellations(e.target.value);
                  const newNon = noShowNum + rescheduleNum + (parseInt(e.target.value) || 0);
                  recalcAndSync(scheduleNum, newNon);
                }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Branching: Calls Occurred */}
        <div className="ml-4 border-l-2 border-[var(--primary)] pl-5 mb-6">
          <h3 className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide mb-3">
            Calls Occurred
            <span className="ml-2 font-normal lowercase text-[var(--muted)]">({callsOccurred} total)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Won</label>
              <input
                type="number"
                value={won}
                onChange={(e) => setWon(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Lost</label>
              <input
                type="number"
                value={lost}
                onChange={(e) => setLost(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Follow-Ups</label>
              <input
                type="number"
                value={followUps}
                onChange={(e) => setFollowUps(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="0"
                min={0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Per-Call Detail Table */}
      {callsOccurred > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Per-Call Breakdown</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Detail each of your {callsOccurred} call{callsOccurred > 1 ? "s" : ""}. This powers your AI coaching insights.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-2 font-semibold">#</th>
                  <th className="text-left py-2 px-2 font-semibold">Contact Name</th>
                  <th className="text-center py-2 px-2 font-semibold">Webinar?</th>
                  <th className="text-center py-2 px-2 font-semibold">DM Present?</th>
                  <th className="text-left py-2 px-2 font-semibold">Outcome</th>
                  <th className="text-left py-2 px-2 font-semibold">Win Notes</th>
                  <th className="text-left py-2 px-2 font-semibold">Loss Notes</th>
                  <th className="text-left py-2 px-2 font-semibold">General Notes</th>
                </tr>
              </thead>
              <tbody>
                {callDetails.map((call, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)]">
                    <td className="py-2 px-2 text-[var(--muted)] font-semibold">{i + 1}</td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={call.contact_name}
                        onChange={(e) => updateCallDetail(i, "contact_name", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="Name"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={call.webinar_watched}
                        onChange={(e) => updateCallDetail(i, "webinar_watched", e.target.checked)}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={call.decision_maker_present}
                        onChange={(e) => updateCallDetail(i, "decision_maker_present", e.target.checked)}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={call.outcome}
                        onChange={(e) => updateCallDetail(i, "outcome", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      >
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="follow_up">Follow-Up</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={call.win_notes}
                        onChange={(e) => updateCallDetail(i, "win_notes", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="What went well"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={call.loss_notes}
                        onChange={(e) => updateCallDetail(i, "loss_notes", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="What went poorly"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={call.general_notes}
                        onChange={(e) => updateCallDetail(i, "general_notes", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="Other notes"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex gap-4 text-sm text-[var(--muted)]">
            <span>DM present: <strong className="text-[var(--primary)]">{dmCalls}/{callsOccurred}</strong></span>
            <span>Webinar watched: <strong className="text-[var(--primary)]">{webinarCalls}/{callsOccurred}</strong></span>
          </div>
        </div>
      )}

      {/* Overall Notes */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-4">Shift Reflection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Win Notes</label>
            <textarea
              value={winNotes}
              onChange={(e) => setWinNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              rows={3}
              placeholder="What worked well today?"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Loss Notes</label>
            <textarea
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              rows={3}
              placeholder="What could be improved?"
            />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm border border-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">
          Shift submitted successfully! View your performance on the Dashboard.
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-lg tracking-wide"
      >
        {submitting ? "Submitting..." : "Submit Shift"}
      </button>
    </form>
  );
}
