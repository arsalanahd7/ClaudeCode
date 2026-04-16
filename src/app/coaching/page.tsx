"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CoachingSession } from "@/lib/types";
import { RUBRIC_LABELS, FOCUS_OPTIONS } from "@/lib/coaching";

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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(followUpDate: string | null): boolean {
  if (!followUpDate) return false;
  return followUpDate < todayStr();
}

function focusLabel(value: string): string {
  return RUBRIC_LABELS[value as keyof typeof RUBRIC_LABELS] || value;
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function StatusBadge({ session }: { session: CoachingSession }) {
  if (session.follow_up_completed) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--success-bg)] text-[var(--success)]">
        Completed
      </span>
    );
  }
  if (isOverdue(session.follow_up_date)) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary-bg)] text-[var(--warning)]">
      Pending
    </span>
  );
}

export default function CoachingPage() {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Open commitments state
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Session log expanded rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // New session form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rep_name: "",
    session_date: todayStr(),
    primary_focus: "",
    secondary_focus: "",
    session_notes: "",
    rep_commitments: "",
    manager_commitments: "",
    follow_up_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from("coaching_sessions")
      .select("*")
      .order("session_date", { ascending: false });

    if (data) {
      setSessions(data as CoachingSession[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Open commitments: follow_up_completed = false, ordered by follow_up_date asc
  const openCommitments = sessions
    .filter((s) => !s.follow_up_completed && s.follow_up_date)
    .sort((a, b) => (a.follow_up_date || "").localeCompare(b.follow_up_date || ""));

  async function completeFollowUp(sessionId: string) {
    setSavingFollowUp(true);
    await supabase
      .from("coaching_sessions")
      .update({
        follow_up_completed: true,
        follow_up_notes: followUpNotes,
      })
      .eq("id", sessionId);
    setExpandedFollowUp(null);
    setFollowUpNotes("");
    setSavingFollowUp(false);
    await loadSessions();
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.rep_name || !formData.primary_focus) return;
    setSubmitting(true);

    const newSession: Omit<CoachingSession, "id" | "created_at"> = {
      rep_id: formData.rep_name.toLowerCase().replace(/[^a-z]/g, "_"),
      rep_name: formData.rep_name,
      manager_id: "manager",
      session_date: formData.session_date,
      call_review_ids: [],
      primary_focus: formData.primary_focus,
      secondary_focus: formData.secondary_focus,
      session_notes: formData.session_notes,
      rep_commitments: formData.rep_commitments,
      manager_commitments: formData.manager_commitments,
      follow_up_date: formData.follow_up_date || null,
      follow_up_completed: false,
      follow_up_notes: "",
    };

    await supabase.from("coaching_sessions").insert([newSession]);

    setFormData({
      rep_name: "",
      session_date: todayStr(),
      primary_focus: "",
      secondary_focus: "",
      session_notes: "",
      rep_commitments: "",
      manager_commitments: "",
      follow_up_date: "",
    });
    setShowForm(false);
    setSubmitting(false);
    await loadSessions();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading coaching sessions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Coaching Sessions</h1>
        <p className="text-[var(--muted)] mt-1">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {/* Section 1: Open Commitments */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">Open Commitments</h2>
        {openCommitments.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <p className="text-[var(--muted)] italic text-center py-4">
              No open commitments. All follow-ups are complete.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {openCommitments.map((session) => {
              const overdue = isOverdue(session.follow_up_date);
              const isExpanded = expandedFollowUp === session.id;

              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl border-2 p-5 ${
                    overdue
                      ? "border-[var(--danger)]"
                      : "border-[var(--card-border)]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[var(--foreground)]">
                          {session.rep_name}
                        </span>
                        {overdue && (
                          <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--muted)] mb-2">
                        Session: {session.session_date} | Focus:{" "}
                        {focusLabel(session.primary_focus)}
                      </p>
                      <p className="text-sm text-[var(--foreground)]">
                        <span className="font-semibold">Rep Commitment:</span>{" "}
                        {session.rep_commitments || "None specified"}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        Follow-up by: {session.follow_up_date}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedFollowUp(null);
                          setFollowUpNotes("");
                        } else {
                          setExpandedFollowUp(session.id || null);
                          setFollowUpNotes("");
                        }
                      }}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                    >
                      {isExpanded ? "Cancel" : "Complete Follow-Up"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                      <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                        Follow-Up Notes
                      </label>
                      <textarea
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        rows={3}
                        placeholder="How did the follow-up go? Did the rep meet their commitment?"
                        className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
                      />
                      <button
                        onClick={() => session.id && completeFollowUp(session.id)}
                        disabled={savingFollowUp}
                        className="mt-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                      >
                        {savingFollowUp ? "Saving..." : "Save & Complete"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Session Log */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">Session Log</h2>
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          {sessions.length === 0 ? (
            <p className="text-[var(--muted)] italic text-center py-8">
              No coaching sessions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--primary)]">
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Date</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Rep</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Focus Area</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Commitments</th>
                    <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">Follow-up</th>
                    <th className="text-center py-2 px-3 font-bold text-[var(--primary)]">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isExpanded = expandedRow === session.id;
                    return (
                      <tr key={session.id} className="border-b border-[var(--card-border)] last:border-0">
                        <td className="py-2 px-3">{session.session_date}</td>
                        <td className="py-2 px-3 font-semibold">{session.rep_name}</td>
                        <td className="py-2 px-3">{focusLabel(session.primary_focus)}</td>
                        <td className="py-2 px-3 max-w-[200px]">
                          {truncate(session.rep_commitments, 50)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <StatusBadge session={session} />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : session.id || null)
                            }
                            className="text-[var(--primary)] hover:underline text-xs font-semibold"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Expanded details rendered below the table rows */}
              {sessions.map((session) => {
                if (expandedRow !== session.id) return null;
                return (
                  <div
                    key={`detail-${session.id}`}
                    className="mt-2 mb-4 p-4 bg-gray-50 rounded-lg border border-[var(--card-border)]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-[var(--primary)] mb-1">Session Notes</p>
                        <p className="text-[var(--foreground)] whitespace-pre-wrap">
                          {session.session_notes || "No notes recorded."}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--primary)] mb-1">Focus Areas</p>
                        <p className="text-[var(--foreground)]">
                          Primary: {focusLabel(session.primary_focus)}
                        </p>
                        {session.secondary_focus && (
                          <p className="text-[var(--foreground)]">
                            Secondary: {focusLabel(session.secondary_focus)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--primary)] mb-1">Rep Commitments</p>
                        <p className="text-[var(--foreground)] whitespace-pre-wrap">
                          {session.rep_commitments || "None specified."}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--primary)] mb-1">Manager Commitments</p>
                        <p className="text-[var(--foreground)] whitespace-pre-wrap">
                          {session.manager_commitments || "None specified."}
                        </p>
                      </div>
                      {session.follow_up_notes && (
                        <div className="md:col-span-2">
                          <p className="font-semibold text-[var(--primary)] mb-1">Follow-Up Notes</p>
                          <p className="text-[var(--foreground)] whitespace-pre-wrap">
                            {session.follow_up_notes}
                          </p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <p className="text-xs text-[var(--muted)]">
                          Follow-up date: {session.follow_up_date || "Not set"} |{" "}
                          Status:{" "}
                          {session.follow_up_completed
                            ? "Completed"
                            : isOverdue(session.follow_up_date)
                            ? "Overdue"
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: New Session Form */}
      <div className="mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
        >
          {showForm ? "Cancel" : "Create New Session"}
        </button>

        {showForm && (
          <form
            onSubmit={handleCreateSession}
            className="mt-4 bg-white rounded-xl border border-[var(--card-border)] p-5"
          >
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">
              New Coaching Session
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Rep Select */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Rep *
                </label>
                <select
                  value={formData.rep_name}
                  onChange={(e) =>
                    setFormData({ ...formData, rep_name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select rep...</option>
                  {TEAM_MEMBERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Date */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) =>
                    setFormData({ ...formData, session_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Primary Focus */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Primary Focus *
                </label>
                <select
                  value={formData.primary_focus}
                  onChange={(e) =>
                    setFormData({ ...formData, primary_focus: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select focus area...</option>
                  {FOCUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Focus */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Secondary Focus (optional)
                </label>
                <select
                  value={formData.secondary_focus}
                  onChange={(e) =>
                    setFormData({ ...formData, secondary_focus: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">None</option>
                  {FOCUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Follow-Up Date
                </label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) =>
                    setFormData({ ...formData, follow_up_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            {/* Session Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Session Notes
              </label>
              <textarea
                value={formData.session_notes}
                onChange={(e) =>
                  setFormData({ ...formData, session_notes: e.target.value })
                }
                rows={3}
                placeholder="Key observations, discussion points, call review highlights..."
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
              />
            </div>

            {/* Rep Commitments */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Rep Commitments
              </label>
              <textarea
                value={formData.rep_commitments}
                onChange={(e) =>
                  setFormData({ ...formData, rep_commitments: e.target.value })
                }
                rows={2}
                placeholder="I will ask the cost-of-inaction question on every call"
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
              />
            </div>

            {/* Manager Commitments */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Manager Commitments
              </label>
              <textarea
                value={formData.manager_commitments}
                onChange={(e) =>
                  setFormData({ ...formData, manager_commitments: e.target.value })
                }
                rows={2}
                placeholder="I will pull one call per week and score discovery only"
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.rep_name || !formData.primary_focus}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Session"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
