"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, CallDetail } from "@/lib/types";

const EMPTY_CALL: CallDetail = {
  contact_name: "",
  webinar_watched: false,
  decision_maker_present: false,
  outcome: "won",
  pcced: false,
  notes: "",
};

export default function EditShiftForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shiftId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [shiftDate, setShiftDate] = useState("");
  const [revenueCollected, setRevenueCollected] = useState("");
  const [enrollments, setEnrollments] = useState("");
  const [callsInSchedule, setCallsInSchedule] = useState("");
  const [noShows, setNoShows] = useState("");
  const [reschedules, setReschedules] = useState("");
  const [cancellations, setCancellations] = useState("");
  const [wonCalls, setWonCalls] = useState("");
  const [lost, setLost] = useState("");
  const [followUps, setFollowUps] = useState("");
  const [callDetails, setCallDetails] = useState<CallDetail[]>([]);
  const [winNotes, setWinNotes] = useState("");
  const [lossNotes, setLossNotes] = useState("");

  useEffect(() => {
    async function load() {
      if (!shiftId) { setLoading(false); return; }

      const { data } = await supabase
        .from("shift_entries")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (data) {
        const entry = data as ShiftEntry;
        setShiftDate(entry.shift_date || "");
        setRevenueCollected(String(entry.revenue_collected || 0));
        setEnrollments(String(entry.enrollments || 0));
        setCallsInSchedule(String(entry.calls_in_schedule));
        setNoShows(String(entry.no_shows));
        setReschedules(String(entry.reschedules));
        setCancellations(String(entry.cancellations));
        setWonCalls(String(entry.won));
        setLost(String(entry.lost));
        setFollowUps(String(entry.follow_ups));
        setCallDetails(entry.call_details || []);
        setWinNotes(entry.win_notes || "");
        setLossNotes(entry.loss_notes || "");
      }
      setLoading(false);
    }
    load();
  }, [shiftId]);

  const scheduleNum = parseInt(callsInSchedule) || 0;
  const noShowNum = parseInt(noShows) || 0;
  const rescheduleNum = parseInt(reschedules) || 0;
  const cancelNum = parseInt(cancellations) || 0;
  const nonOccurred = noShowNum + rescheduleNum + cancelNum;
  const callsOccurred = Math.max(0, scheduleNum - nonOccurred);
  const wonNum = parseInt(wonCalls) || 0;
  const lostNum = parseInt(lost) || 0;
  const followUpNum = parseInt(followUps) || 0;
  const dmCalls = callDetails.filter((c) => c.decision_maker_present).length;
  const webinarCalls = callDetails.filter((c) => c.webinar_watched).length;
  const pccedCalls = callDetails.filter((c) => c.pcced).length;

  function adjustCallDetails(newCount: number) {
    setCallDetails((prev) => {
      if (newCount > prev.length) {
        return [...prev, ...Array(newCount - prev.length).fill(null).map(() => ({ ...EMPTY_CALL }))];
      }
      return prev.slice(0, newCount);
    });
  }

  function updateCallDetail(index: number, field: keyof CallDetail, value: string | boolean) {
    setCallDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const { error: dbError } = await supabase
      .from("shift_entries")
      .update({
        shift_date: shiftDate,
        revenue_collected: parseInt(revenueCollected) || 0,
        enrollments: parseInt(enrollments) || 0,
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
        pcced_calls: pccedCalls,
        call_details: callDetails,
        win_notes: winNotes,
        loss_notes: lossNotes,
      })
      .eq("id", shiftId);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-[var(--muted)] italic">Loading shift...</p>;
  }

  if (!shiftId) {
    return <p className="text-[var(--muted)] italic">No shift ID provided.</p>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8">
      {/* Date */}
      <div>
        <label className="block text-sm font-semibold mb-1.5">Shift Date</label>
        <input
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* Revenue + Enrollments */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-4">Shift Data</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Revenue Collected ($)</label>
            <input type="number" value={revenueCollected} onChange={(e) => setRevenueCollected(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Enrollments</label>
            <input type="number" value={enrollments} onChange={(e) => setEnrollments(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
          </div>
        </div>

        {/* Calls in Schedule */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1.5 text-lg">Calls in Schedule</label>
          <input type="number" value={callsInSchedule}
            onChange={(e) => {
              setCallsInSchedule(e.target.value);
              const newOccurred = Math.max(0, (parseInt(e.target.value) || 0) - nonOccurred);
              adjustCallDetails(newOccurred);
            }}
            className="w-full px-4 py-3 border-2 border-[var(--primary)] rounded-lg bg-[var(--primary-bg)] text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
        </div>

        {/* Non-Occurred */}
        <div className="ml-4 border-l-2 border-[var(--card-border)] pl-5 mb-6">
          <h3 className="text-sm font-bold text-[var(--danger)] uppercase tracking-wide mb-3">
            Non-Occurred <span className="ml-2 text-[var(--muted)] font-normal lowercase">({nonOccurred} total)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">No-Shows</label>
              <input type="number" value={noShows} onChange={(e) => { setNoShows(e.target.value); const n = (parseInt(e.target.value)||0)+rescheduleNum+cancelNum; adjustCallDetails(Math.max(0,scheduleNum-n)); }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Rescheduled</label>
              <input type="number" value={reschedules} onChange={(e) => { setReschedules(e.target.value); const n = noShowNum+(parseInt(e.target.value)||0)+cancelNum; adjustCallDetails(Math.max(0,scheduleNum-n)); }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Cancelled</label>
              <input type="number" value={cancellations} onChange={(e) => { setCancellations(e.target.value); const n = noShowNum+rescheduleNum+(parseInt(e.target.value)||0); adjustCallDetails(Math.max(0,scheduleNum-n)); }}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
          </div>
        </div>

        {/* Occurred */}
        <div className="ml-4 border-l-2 border-[var(--primary)] pl-5">
          <h3 className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide mb-3">
            Calls Occurred <span className="ml-2 font-normal lowercase text-[var(--muted)]">({callsOccurred} total)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Won</label>
              <input type="number" value={wonCalls} onChange={(e) => setWonCalls(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Lost</label>
              <input type="number" value={lost} onChange={(e) => setLost(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Follow-Ups</label>
              <input type="number" value={followUps} onChange={(e) => setFollowUps(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" min={0} />
            </div>
          </div>
        </div>
      </div>

      {/* Per-Call Table */}
      {callDetails.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-4">Per-Call Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-2 font-semibold">#</th>
                  <th className="text-left py-2 px-2 font-semibold">Contact</th>
                  <th className="text-center py-2 px-2 font-semibold">Webinar?</th>
                  <th className="text-center py-2 px-2 font-semibold">DM?</th>
                  <th className="text-left py-2 px-2 font-semibold">Outcome</th>
                  <th className="text-center py-2 px-2 font-semibold">PCCed?</th>
                  <th className="text-left py-2 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {callDetails.map((call, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)]">
                    <td className="py-2 px-2 text-[var(--muted)] font-semibold">{i + 1}</td>
                    <td className="py-2 px-2">
                      <input type="text" value={call.contact_name} onChange={(e) => updateCallDetail(i, "contact_name", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" placeholder="Name" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="checkbox" checked={call.webinar_watched} onChange={(e) => updateCallDetail(i, "webinar_watched", e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="checkbox" checked={call.decision_maker_present} onChange={(e) => updateCallDetail(i, "decision_maker_present", e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    </td>
                    <td className="py-2 px-2">
                      <select value={call.outcome} onChange={(e) => updateCallDetail(i, "outcome", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="follow_up">Follow-Up</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="checkbox" checked={call.pcced} onChange={(e) => updateCallDetail(i, "pcced", e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    </td>
                    <td className="py-2 px-2">
                      <input type="text" value={call.notes} onChange={(e) => updateCallDetail(i, "notes", e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--input-border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" placeholder="Notes" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-4 text-sm text-[var(--muted)]">
            <span>DM: <strong className="text-[var(--primary)]">{dmCalls}/{callsOccurred}</strong></span>
            <span>Webinar: <strong className="text-[var(--primary)]">{webinarCalls}/{callsOccurred}</strong></span>
            <span>PCCed: <strong className="text-[var(--primary)]">{pccedCalls}/{callsOccurred}</strong></span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-4">Shift Reflection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Win Notes</label>
            <textarea value={winNotes} onChange={(e) => setWinNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" rows={3} placeholder="What worked well?" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Loss Notes</label>
            <textarea value={lossNotes} onChange={(e) => setLossNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" rows={3} placeholder="What could be improved?" />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && <div className="bg-[var(--danger-bg)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm border border-[var(--danger)]">{error}</div>}
      {success && <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">Shift updated successfully!</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-lg">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.push("/dashboard")}
          className="px-6 py-3.5 border border-[var(--card-border)] rounded-lg text-[var(--muted)] hover:bg-gray-50 transition-colors">
          Back to Dashboard
        </button>
      </div>
    </form>
  );
}
