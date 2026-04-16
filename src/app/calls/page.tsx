"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Call, CallReview } from "@/lib/types";
import { LEAD_QUALITY_LABELS } from "@/lib/coaching";

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

const DATE_FILTERS = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Outcomes" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "follow_up", label: "Follow Up" },
];

const REVIEW_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "reviewed", label: "Reviewed" },
  { value: "unreviewed", label: "Needs Review" },
];

const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  won: { bg: "var(--success-bg)", text: "var(--primary)" },
  lost: { bg: "var(--danger-bg)", text: "var(--danger)" },
  follow_up: { bg: "#fef3c7", text: "#92400e" },
  no_show: { bg: "#f3f4f6", text: "#6b7280" },
  rescheduled: { bg: "#f3f4f6", text: "#6b7280" },
  cancelled: { bg: "#f3f4f6", text: "#6b7280" },
};

const LEAD_QUALITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#dbeafe", text: "#1e40af" },
  2: { bg: "#fef3c7", text: "#92400e" },
  3: { bg: "#fce4ec", text: "#c62828" },
};

interface CallWithReview extends Call {
  review?: CallReview;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [repFilter, setRepFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [showLogForm, setShowLogForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Log call form state
  const [formContactName, setFormContactName] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formRep, setFormRep] = useState(TEAM_MEMBERS[0]);
  const [formOutcome, setFormOutcome] = useState<
    "won" | "lost" | "follow_up"
  >("won");
  const [formRevenue, setFormRevenue] = useState("");
  const [formEnrolled, setFormEnrolled] = useState(false);
  const [formWebinar, setFormWebinar] = useState(false);
  const [formDM, setFormDM] = useState(false);
  const [formPCC, setFormPCC] = useState(false);
  const [formLeadQuality, setFormLeadQuality] = useState<1 | 2 | 3>(2);
  const [formNotes, setFormNotes] = useState("");

  const load = useCallback(async () => {
    const { data: callsData } = await supabase
      .from("calls")
      .select("*")
      .order("call_date", { ascending: false });

    const { data: reviewsData } = await supabase
      .from("call_reviews")
      .select("*");

    if (callsData) {
      const reviewMap = new Map<string, CallReview>();
      if (reviewsData) {
        for (const r of reviewsData as CallReview[]) {
          reviewMap.set(r.call_id, r);
        }
      }

      const merged: CallWithReview[] = (callsData as Call[]).map((c) => ({
        ...c,
        review: c.id ? reviewMap.get(c.id) : undefined,
      }));

      setCalls(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const newCall: Omit<Call, "id" | "created_at"> = {
      user_id: formRep.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      user_name: formRep,
      call_date: formDate,
      contact_name: formContactName,
      outcome: formOutcome,
      revenue: parseFloat(formRevenue) || 0,
      enrolled: formEnrolled,
      webinar_watched: formWebinar,
      decision_maker_present: formDM,
      pcced: formPCC,
      lead_quality: formLeadQuality,
      rep_notes: formNotes,
    };

    await supabase.from("calls").insert([newCall]);

    // Reset form
    setFormContactName("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormRep(TEAM_MEMBERS[0]);
    setFormOutcome("won");
    setFormRevenue("");
    setFormEnrolled(false);
    setFormWebinar(false);
    setFormDM(false);
    setFormPCC(false);
    setFormLeadQuality(2);
    setFormNotes("");
    setShowLogForm(false);
    setSaving(false);
    await load();
  }

  // Filter logic
  const filtered = calls.filter((c) => {
    // Rep filter
    if (repFilter !== "all" && c.user_name !== repFilter) return false;

    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(c.call_date) < cutoff) return false;
    }

    // Outcome filter
    if (outcomeFilter !== "all" && c.outcome !== outcomeFilter) return false;

    // Review filter
    if (reviewFilter === "reviewed" && !c.review) return false;
    if (reviewFilter === "unreviewed" && c.review) return false;

    return true;
  });

  // Sort: when filtered to unreviewed, lost calls first
  const sorted = [...filtered].sort((a, b) => {
    if (reviewFilter === "unreviewed") {
      // Lost calls first
      if (a.outcome === "lost" && b.outcome !== "lost") return -1;
      if (a.outcome !== "lost" && b.outcome === "lost") return 1;
    }
    // Then by date descending
    return new Date(b.call_date).getTime() - new Date(a.call_date).getTime();
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading calls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Call Log
          </h1>
          <p className="text-[var(--muted)] mt-1">
            {sorted.length} call{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors"
        >
          {showLogForm ? "Cancel" : "Log Call"}
        </button>
      </div>

      {/* Log Call Form */}
      {showLogForm && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-4">
            Log a New Call
          </h2>
          <form onSubmit={handleLogCall}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Contact Name */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Contact name"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Rep */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Rep
                </label>
                <select
                  value={formRep}
                  onChange={(e) => setFormRep(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Outcome
                </label>
                <select
                  value={formOutcome}
                  onChange={(e) =>
                    setFormOutcome(
                      e.target.value as "won" | "lost" | "follow_up"
                    )
                  }
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="follow_up">Follow Up</option>
                </select>
              </div>

              {/* Revenue */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Revenue ($)
                </label>
                <input
                  type="number"
                  value={formRevenue}
                  onChange={(e) => setFormRevenue(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Lead Quality */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Lead Quality
                </label>
                <select
                  value={formLeadQuality}
                  onChange={(e) =>
                    setFormLeadQuality(parseInt(e.target.value) as 1 | 2 | 3)
                  }
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value={1}>1 - Cold</option>
                  <option value={2}>2 - Warm</option>
                  <option value={3}>3 - Hot</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6 mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formEnrolled}
                  onChange={(e) => setFormEnrolled(e.target.checked)}
                  className="rounded border-[var(--input-border)]"
                />
                <span>Enrolled</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formWebinar}
                  onChange={(e) => setFormWebinar(e.target.checked)}
                  className="rounded border-[var(--input-border)]"
                />
                <span>Webinar Watched</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formDM}
                  onChange={(e) => setFormDM(e.target.checked)}
                  className="rounded border-[var(--input-border)]"
                />
                <span>Decision Maker Present</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formPCC}
                  onChange={(e) => setFormPCC(e.target.checked)}
                  className="rounded border-[var(--input-border)]"
                />
                <span>PCC</span>
              </label>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Notes
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Call notes..."
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Call"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">All Reps</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {DATE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {REVIEW_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        {sorted.length === 0 ? (
          <p className="text-[var(--muted)] italic text-center py-8">
            No calls found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--primary)]">
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">
                    Contact
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">
                    Rep
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">
                    Outcome
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">
                    Lead Quality
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">
                    Score
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((call) => {
                  const outcomeStyle =
                    OUTCOME_COLORS[call.outcome] || OUTCOME_COLORS.lost;
                  const lqStyle =
                    LEAD_QUALITY_COLORS[call.lead_quality] ||
                    LEAD_QUALITY_COLORS[1];
                  const lqLabel =
                    LEAD_QUALITY_LABELS[call.lead_quality] || "Unknown";

                  return (
                    <tr
                      key={call.id}
                      className="border-b border-[var(--card-border)] last:border-0"
                    >
                      <td className="py-2 px-3">
                        {call.call_date || "\u2014"}
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {call.contact_name}
                      </td>
                      <td className="py-2 px-3">{call.user_name}</td>
                      <td className="py-2 px-3">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: outcomeStyle.bg,
                            color: outcomeStyle.text,
                          }}
                        >
                          {call.outcome === "follow_up"
                            ? "Follow Up"
                            : call.outcome.charAt(0).toUpperCase() +
                              call.outcome.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: lqStyle.bg,
                            color: lqStyle.text,
                          }}
                        >
                          {lqLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {call.review?.weighted_score != null
                          ? call.review.weighted_score.toFixed(2)
                          : "\u2014"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {call.review ? (
                          <Link
                            href={`/calls/${call.id}`}
                            className="text-[var(--primary)] hover:underline text-xs font-semibold"
                          >
                            Reviewed
                          </Link>
                        ) : (
                          <Link
                            href={`/calls/${call.id}`}
                            className="text-[var(--danger)] hover:underline text-xs font-semibold"
                          >
                            Needs Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
