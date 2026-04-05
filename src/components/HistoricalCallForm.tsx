"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HistoricalCallForm() {
  const [userName, setUserName] = useState("");
  const [callDate, setCallDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [outcome, setOutcome] = useState<"won" | "lost" | "follow_up">("won");
  const [revenue, setRevenue] = useState("");
  const [enrolled, setEnrolled] = useState(false);
  const [webinarWatched, setWebinarWatched] = useState(false);
  const [decisionMakerPresent, setDecisionMakerPresent] = useState(false);
  const [pcced, setPcced] = useState(false);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
    if (!callDate) {
      setError("Please select a date for this call.");
      setSubmitting(false);
      return;
    }

    const userId = userName.toLowerCase().replace(/\s+/g, "_");

    const entry = {
      user_id: userId,
      user_name: userName,
      call_date: callDate,
      contact_name: contactName,
      outcome,
      revenue: parseInt(revenue) || 0,
      enrolled,
      webinar_watched: webinarWatched,
      decision_maker_present: decisionMakerPresent,
      pcced,
      notes,
    };

    const { error: dbError } = await supabase
      .from("historical_calls")
      .insert([entry]);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
      setContactName("");
      setOutcome("won");
      setRevenue("");
      setEnrolled(false);
      setWebinarWatched(false);
      setDecisionMakerPresent(false);
      setPcced(false);
      setNotes("");
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Name + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="e.g. John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Call Date</label>
          <input
            type="date"
            value={callDate}
            onChange={(e) => setCallDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--primary)]">Call Details</h2>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Contact Name</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="Name of the contact"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "won" | "lost" | "follow_up")}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="follow_up">Follow-Up</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Revenue ($)</label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enrolled}
              onChange={(e) => setEnrolled(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">Enrolled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={webinarWatched}
              onChange={(e) => setWebinarWatched(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">Webinar Watched</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={decisionMakerPresent}
              onChange={(e) => setDecisionMakerPresent(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">DM Present</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pcced}
              onChange={(e) => setPcced(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">PCCed</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            rows={3}
            placeholder="Any details about this call"
          />
        </div>
      </div>

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm border border-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">
          Historical call added successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-lg tracking-wide"
      >
        {submitting ? "Adding..." : "Add Historical Call"}
      </button>
    </form>
  );
}
