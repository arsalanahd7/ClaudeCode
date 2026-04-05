"use client";

import { useState } from "react";
import { ShiftEntry, WEAK_STAGE_OPTIONS, WeakStage } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type NumberFieldKey = 'calls_scheduled' | 'calls_completed' | 'no_shows' | 'reschedules' | 'cancellations' | 'won' | 'lost' | 'follow_ups' | 'decision_maker_calls' | 'webinar_watched_calls';

const NUMBER_FIELDS: { key: NumberFieldKey; label: string }[] = [
  { key: "calls_scheduled", label: "Calls Scheduled" },
  { key: "calls_completed", label: "Calls Completed" },
  { key: "no_shows", label: "No Shows" },
  { key: "reschedules", label: "Reschedules" },
  { key: "cancellations", label: "Cancellations" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "follow_ups", label: "Follow Ups" },
  { key: "decision_maker_calls", label: "Decision Maker Calls" },
  { key: "webinar_watched_calls", label: "Webinar Watched Calls" },
];

export default function ShiftForm() {
  const [form, setForm] = useState({
    user_name: "",
    calls_scheduled: 0,
    calls_completed: 0,
    no_shows: 0,
    reschedules: 0,
    cancellations: 0,
    won: 0,
    lost: 0,
    follow_ups: 0,
    decision_maker_calls: 0,
    webinar_watched_calls: 0,
    weak_stages: [] as WeakStage[],
    win_notes: "",
    loss_notes: "",
    revenue: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleNumber(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseInt(value) || 0 }));
  }

  function toggleStage(stage: WeakStage) {
    setForm((prev) => ({
      ...prev,
      weak_stages: prev.weak_stages.includes(stage)
        ? prev.weak_stages.filter((s) => s !== stage)
        : [...prev.weak_stages, stage],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    if (!form.user_name.trim()) {
      setError("Please enter your name.");
      setSubmitting(false);
      return;
    }

    if (form.calls_scheduled <= 0) {
      setError("Calls scheduled must be greater than 0.");
      setSubmitting(false);
      return;
    }

    const userId = form.user_name.toLowerCase().replace(/\s+/g, "_");

    const entry = {
      user_id: userId,
      user_name: form.user_name,
      calls_scheduled: form.calls_scheduled,
      calls_completed: form.calls_completed,
      no_shows: form.no_shows,
      reschedules: form.reschedules,
      cancellations: form.cancellations,
      won: form.won,
      lost: form.lost,
      follow_ups: form.follow_ups,
      decision_maker_calls: form.decision_maker_calls,
      webinar_watched_calls: form.webinar_watched_calls,
      weak_stages: form.weak_stages,
      win_notes: form.win_notes,
      loss_notes: form.loss_notes,
      revenue: form.revenue,
    };

    const { error: dbError } = await supabase
      .from("shift_entries")
      .insert([entry]);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
      setForm({
        user_name: form.user_name,
        calls_scheduled: 0,
        calls_completed: 0,
        no_shows: 0,
        reschedules: 0,
        cancellations: 0,
        won: 0,
        lost: 0,
        follow_ups: 0,
        decision_maker_calls: 0,
        webinar_watched_calls: 0,
        weak_stages: [],
        win_notes: "",
        loss_notes: "",
        revenue: 0,
      });
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Your Name</label>
        <input
          type="text"
          value={form.user_name}
          onChange={(e) => setForm((prev) => ({ ...prev, user_name: e.target.value }))}
          className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
          placeholder="e.g. John Smith"
        />
      </div>

      {/* Revenue */}
      <div>
        <label className="block text-sm font-medium mb-1">Revenue Closed ($)</label>
        <input
          type="number"
          value={form.revenue}
          onChange={(e) => handleNumber("revenue", e.target.value)}
          className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
          min={0}
        />
      </div>

      {/* Number Fields Grid */}
      <div className="grid grid-cols-2 gap-4">
        {NUMBER_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="number"
              value={form[key]}
              onChange={(e) => handleNumber(key, e.target.value)}
              className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
              min={0}
            />
          </div>
        ))}
      </div>

      {/* Weak Stages */}
      <div>
        <label className="block text-sm font-medium mb-2">Weak Stages (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {WEAK_STAGE_OPTIONS.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => toggleStage(stage)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.weak_stages.includes(stage)
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-white text-[var(--muted)] border-[var(--card-border)] hover:border-[var(--primary)]"
              }`}
            >
              {stage.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Win Notes</label>
          <textarea
            value={form.win_notes}
            onChange={(e) => setForm((prev) => ({ ...prev, win_notes: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white resize-none"
            rows={3}
            placeholder="What worked well today?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Loss Notes</label>
          <textarea
            value={form.loss_notes}
            onChange={(e) => setForm((prev) => ({ ...prev, loss_notes: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white resize-none"
            rows={3}
            placeholder="What could be improved?"
          />
        </div>
      </div>

      {/* Submit */}
      {error && (
        <div className="bg-red-50 text-[var(--danger)] px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-[var(--success)] px-4 py-2 rounded-lg text-sm">
          Shift submitted successfully! View your performance on the Dashboard.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Shift"}
      </button>
    </form>
  );
}
