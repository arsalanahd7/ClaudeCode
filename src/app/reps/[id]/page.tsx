"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Call,
  CallReview,
  CoachingSession,
  RepCoachingProfile,
  RubricCategory,
} from "@/lib/types";
import {
  calculateCategoryAverages,
  deriveCoachingPriorities,
  calculateTrendDelta,
  getScoreBand,
  getScoreBandColor,
  getTrendDirection,
  getTrendLabel,
  getTrendColor,
  RUBRIC_LABELS,
  RUBRIC_CATEGORIES,
} from "@/lib/coaching";

const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  won: { bg: "var(--success-bg)", text: "var(--primary)" },
  lost: { bg: "var(--danger-bg)", text: "var(--danger)" },
  follow_up: { bg: "#fef3c7", text: "#92400e" },
  no_show: { bg: "#f3f4f6", text: "#6b7280" },
  rescheduled: { bg: "#f3f4f6", text: "#6b7280" },
  cancelled: { bg: "#f3f4f6", text: "#6b7280" },
};

function formatOutcome(outcome: string): string {
  if (outcome === "follow_up") return "Follow Up";
  if (outcome === "no_show") return "No Show";
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RepProfilePage() {
  const params = useParams<{ id: string }>();
  const repId = decodeURIComponent(params.id as string);

  const [calls, setCalls] = useState<Call[]>([]);
  const [reviews, setReviews] = useState<CallReview[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [profile, setProfile] = useState<RepCoachingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [callsRes, sessionsRes, profileRes] = await Promise.all([
        supabase
          .from("calls")
          .select("*")
          .eq("user_id", repId)
          .order("call_date", { ascending: false }),
        supabase
          .from("coaching_sessions")
          .select("*")
          .eq("rep_id", repId)
          .order("session_date", { ascending: false }),
        supabase
          .from("rep_coaching_profiles")
          .select("*")
          .eq("rep_id", repId)
          .maybeSingle(),
      ]);

      const callData = (callsRes.data as Call[]) || [];
      setCalls(callData);
      if (profileRes.data) setProfile(profileRes.data as RepCoachingProfile);
      if (sessionsRes.data)
        setSessions(sessionsRes.data as CoachingSession[]);

      // Fetch reviews for this rep's calls
      const callIds = callData.map((c) => c.id).filter(Boolean) as string[];
      if (callIds.length > 0) {
        const { data: reviewData } = await supabase
          .from("call_reviews")
          .select("*")
          .in("call_id", callIds)
          .order("reviewed_at", { ascending: false });
        if (reviewData) setReviews(reviewData as CallReview[]);
      }

      setLoading(false);
    }
    load();
  }, [repId]);

  // Derive rep name from first call or profile
  const repName = useMemo(() => {
    if (profile?.rep_name) return profile.rep_name;
    if (calls.length > 0) return calls[0].user_name;
    return repId;
  }, [profile, calls, repId]);

  // Build call_id -> review lookup
  const reviewByCallId = useMemo(() => {
    const map = new Map<string, CallReview>();
    for (const r of reviews) {
      map.set(r.call_id, r);
    }
    return map;
  }, [reviews]);

  // Weighted average (last 10 reviews)
  const { weightedAvg, scoreBand, scoreBandColor } = useMemo(() => {
    const last10 = reviews.slice(0, 10);
    const scores = last10
      .map((r) => r.weighted_score)
      .filter((s): s is number => s != null);
    const avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : null;
    const band = avg != null ? getScoreBand(avg) : null;
    const color = band ? getScoreBandColor(band) : null;
    return { weightedAvg: avg, scoreBand: band, scoreBandColor: color };
  }, [reviews]);

  // Trend
  const trend = useMemo(() => {
    const last10 = reviews.slice(0, 10);
    return calculateTrendDelta(last10);
  }, [reviews]);

  const trendDir = trend.delta != null ? getTrendDirection(trend.delta) : null;

  // Category averages & coaching priorities
  const catAvgs = useMemo(() => calculateCategoryAverages(reviews), [reviews]);
  const priorities = useMemo(() => deriveCoachingPriorities(catAvgs), [catAvgs]);

  // Calls limited to last 30 days
  const recentCalls = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return calls.filter((c) => new Date(c.call_date) >= cutoff);
  }, [calls]);

  // Open commitments
  const openSessions = useMemo(
    () => sessions.filter((s) => !s.follow_up_completed),
    [sessions]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading rep profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link */}
      <Link
        href="/reps"
        className="text-[var(--primary)] hover:underline text-sm font-semibold inline-flex items-center gap-1 mb-6"
      >
        &larr; Back to Reps
      </Link>

      {/* Overview Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">
              {repName}
            </h1>
            {profile?.rep_archetype && (
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-bg)] text-[var(--primary)]">
                {profile.rep_archetype}
              </span>
            )}
          </div>

          {/* Score + Trend */}
          <div className="flex items-center gap-4">
            {weightedAvg != null ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl font-bold"
                  style={{ color: scoreBandColor ?? undefined }}
                >
                  {weightedAvg.toFixed(2)}
                </span>
                {scoreBand && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: scoreBandColor ?? undefined,
                      backgroundColor:
                        scoreBand === "Strong"
                          ? "var(--success-bg)"
                          : scoreBand === "Developing"
                          ? "#fef3cd"
                          : "var(--danger-bg)",
                    }}
                  >
                    {scoreBand}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-3xl font-bold text-[var(--muted)]">--</span>
            )}

            {trendDir && trend.delta != null && (
              <span
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: getTrendColor(trendDir) }}
              >
                {trendDir === "improving"
                  ? "\u25B2"
                  : trendDir === "declining"
                  ? "\u25BC"
                  : "\u25B6"}{" "}
                {getTrendLabel(trendDir)} ({trend.delta > 0 ? "+" : ""}
                {trend.delta.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Top 2 Coaching Priorities */}
        {priorities.length > 0 && (
          <div className="mt-3">
            <span className="text-sm font-semibold text-[var(--muted)] block mb-2">
              Coaching Priorities
            </span>
            <div className="flex flex-wrap gap-3">
              {priorities.map((p, i) => (
                <div
                  key={p.category}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)]"
                >
                  <span className="text-xs font-bold text-[var(--muted)]">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {RUBRIC_LABELS[p.category]}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color:
                        p.avg >= 4
                          ? "var(--primary)"
                          : p.avg >= 3
                          ? "#b8860b"
                          : "var(--danger)",
                    }}
                  >
                    {p.avg.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-4">
          Category Breakdown
        </h2>
        <div className="space-y-4">
          {RUBRIC_CATEGORIES.map((cat) => {
            const avg = catAvgs[cat as keyof typeof catAvgs] as number | null;
            const count = catAvgs.counts[cat];
            const insufficient = count < 3;
            const barColor =
              avg == null
                ? "var(--muted)"
                : avg >= 4
                ? "var(--primary)"
                : avg >= 3
                ? "#b8860b"
                : "var(--danger)";
            const barWidth = avg != null ? (avg / 5) * 100 : 0;

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {RUBRIC_LABELS[cat]}
                  </span>
                  {insufficient ? (
                    <span className="text-xs text-[var(--muted)] italic">
                      Insufficient data ({count} review{count !== 1 ? "s" : ""})
                    </span>
                  ) : (
                    <span
                      className="text-sm font-bold"
                      style={{ color: barColor }}
                    >
                      {avg != null ? avg.toFixed(2) : "--"}
                    </span>
                  )}
                </div>
                <div className="w-full h-3 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--input-border)]">
                  {!insufficient && avg != null && (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call History Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-1">
          Call History
        </h2>
        <p className="text-[var(--muted)] text-sm mb-4">
          Last 30 days &mdash; {recentCalls.length} call
          {recentCalls.length !== 1 ? "s" : ""}
        </p>

        {recentCalls.length === 0 ? (
          <p className="text-[var(--muted)] italic text-center py-6">
            No calls in the last 30 days.
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
                    Outcome
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">
                    Score
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => {
                  const rev = call.id ? reviewByCallId.get(call.id) : null;
                  const outcomeStyle =
                    OUTCOME_COLORS[call.outcome] || OUTCOME_COLORS.lost;

                  return (
                    <tr
                      key={call.id}
                      className="border-b border-[var(--card-border)] last:border-0"
                    >
                      <td className="py-2 px-3">
                        {formatDate(call.call_date)}
                      </td>
                      <td className="py-2 px-3 font-semibold">
                        {call.contact_name}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: outcomeStyle.bg,
                            color: outcomeStyle.text,
                          }}
                        >
                          {formatOutcome(call.outcome)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {rev && rev.weighted_score != null ? (
                          <span
                            className="font-bold"
                            style={{
                              color: getScoreBandColor(
                                getScoreBand(rev.weighted_score)
                              ),
                            }}
                          >
                            {rev.weighted_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">&mdash;</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {rev ? (
                          <Link
                            href={`/calls/${call.id}`}
                            className="text-[var(--primary)] hover:underline text-xs font-semibold"
                          >
                            View
                          </Link>
                        ) : (
                          <Link
                            href={`/calls/${call.id}`}
                            className="text-[var(--warning)] hover:underline text-xs font-semibold"
                          >
                            Review
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

      {/* Coaching Sessions Section */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        <h2 className="text-lg font-bold text-[var(--primary)] mb-1">
          Coaching Sessions
        </h2>
        <p className="text-[var(--muted)] text-sm mb-4">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          {openSessions.length > 0 && (
            <span className="text-[var(--danger)] font-semibold ml-2">
              ({openSessions.length} open commitment
              {openSessions.length !== 1 ? "s" : ""})
            </span>
          )}
        </p>

        {sessions.length === 0 ? (
          <p className="text-[var(--muted)] italic text-center py-6">
            No coaching sessions recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isOpen = !session.follow_up_completed;
              return (
                <div
                  key={session.id}
                  className="border rounded-lg p-4"
                  style={{
                    borderColor: isOpen
                      ? "var(--danger)"
                      : "var(--card-border)",
                    backgroundColor: isOpen ? "var(--danger-bg)" : "white",
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[var(--foreground)]">
                        {formatDate(session.session_date)}
                      </span>
                      {isOpen && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]">
                          Open
                        </span>
                      )}
                      {!isOpen && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--primary)]">
                          Completed
                        </span>
                      )}
                    </div>
                    {session.follow_up_date && (
                      <span className="text-xs text-[var(--muted)]">
                        Follow-up: {formatDate(session.follow_up_date)}
                      </span>
                    )}
                  </div>

                  <div className="text-sm mb-2">
                    <span className="text-[var(--muted)]">Focus: </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {session.primary_focus}
                    </span>
                    {session.secondary_focus && (
                      <span className="text-[var(--muted)]">
                        {" "}/ {session.secondary_focus}
                      </span>
                    )}
                  </div>

                  {session.rep_commitments && (
                    <div className="text-sm mb-1">
                      <span className="text-[var(--muted)]">Commitment: </span>
                      <span className="text-[var(--foreground)]">
                        {session.rep_commitments}
                      </span>
                    </div>
                  )}

                  {session.follow_up_notes && (
                    <div className="text-sm">
                      <span className="text-[var(--muted)]">
                        Follow-up notes:{" "}
                      </span>
                      <span className="text-[var(--foreground)]">
                        {session.follow_up_notes}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
