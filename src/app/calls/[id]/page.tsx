"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Call, CallReview, RubricCategory } from "@/lib/types";
import {
  RUBRIC_CATEGORIES,
  RUBRIC_LABELS,
  LEAD_QUALITY_LABELS,
  calculateWeightedScore,
  getScoreBand,
  getScoreBandColor,
} from "@/lib/coaching";

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

function formatOutcome(outcome: string): string {
  if (outcome === "follow_up") return "Follow Up";
  if (outcome === "no_show") return "No Show";
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [review, setReview] = useState<CallReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for rubric scores
  const [scores, setScores] = useState<Record<RubricCategory, number | null>>({
    discovery: null,
    objection_handling: null,
    closing_mechanics: null,
    value_framing: null,
    call_control: null,
    dm_strategy: null,
  });
  const [notes, setNotes] = useState<Record<RubricCategory, string>>({
    discovery: "",
    objection_handling: "",
    closing_mechanics: "",
    value_framing: "",
    call_control: "",
    dm_strategy: "",
  });
  const [topStrength, setTopStrength] = useState("");
  const [topDevArea, setTopDevArea] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");

  const load = useCallback(async () => {
    const { data: callData } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (callData) {
      setCall(callData as Call);
    }

    const { data: reviewData } = await supabase
      .from("call_reviews")
      .select("*")
      .eq("call_id", callId)
      .maybeSingle();

    if (reviewData) {
      const r = reviewData as CallReview;
      setReview(r);
      // Populate form with existing review data
      setScores({
        discovery: r.discovery_score,
        objection_handling: r.objection_handling_score,
        closing_mechanics: r.closing_mechanics_score,
        value_framing: r.value_framing_score,
        call_control: r.call_control_score,
        dm_strategy: r.dm_strategy_score,
      });
      setNotes({
        discovery: r.discovery_notes || "",
        objection_handling: r.objection_handling_notes || "",
        closing_mechanics: r.closing_mechanics_notes || "",
        value_framing: r.value_framing_notes || "",
        call_control: r.call_control_notes || "",
        dm_strategy: r.dm_strategy_notes || "",
      });
      setTopStrength(r.top_strength || "");
      setTopDevArea(r.top_development_area || "");
      setRecommendedAction(r.recommended_action || "");
      setRecordingUrl(r.call_recording_url || "");
    }

    setLoading(false);
  }, [callId]);

  useEffect(() => {
    load();
  }, [load]);

  // Calculate weighted score from current form state
  const computedWeightedScore = call
    ? calculateWeightedScore(
        {
          discovery_score: scores.discovery,
          objection_handling_score: scores.objection_handling,
          closing_mechanics_score: scores.closing_mechanics,
          value_framing_score: scores.value_framing,
          call_control_score: scores.call_control,
          dm_strategy_score: scores.dm_strategy,
        },
        call.decision_maker_present
      )
    : null;

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!call) return;
    setSaving(true);

    const reviewPayload: Omit<CallReview, "id" | "reviewed_at"> = {
      call_id: callId,
      reviewer_id: "manager",
      call_recording_url: recordingUrl,
      discovery_score: scores.discovery,
      objection_handling_score: scores.objection_handling,
      closing_mechanics_score: scores.closing_mechanics,
      value_framing_score: scores.value_framing,
      call_control_score: scores.call_control,
      dm_strategy_score: scores.dm_strategy,
      discovery_notes: notes.discovery,
      objection_handling_notes: notes.objection_handling,
      closing_mechanics_notes: notes.closing_mechanics,
      value_framing_notes: notes.value_framing,
      call_control_notes: notes.call_control,
      dm_strategy_notes: notes.dm_strategy,
      weighted_score: computedWeightedScore,
      top_strength: topStrength,
      top_development_area: topDevArea,
      recommended_action: recommendedAction,
    };

    if (review?.id) {
      // Update existing review
      await supabase
        .from("call_reviews")
        .update(reviewPayload)
        .eq("id", review.id);
    } else {
      // Insert new review
      await supabase.from("call_reviews").insert([reviewPayload]);
    }

    setSaving(false);
    setEditing(false);
    await load();
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading call details...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--danger)] font-semibold">Call not found.</p>
        <Link
          href="/calls"
          className="text-[var(--primary)] hover:underline text-sm mt-2 inline-block"
        >
          Back to Call Log
        </Link>
      </div>
    );
  }

  const outcomeStyle = OUTCOME_COLORS[call.outcome] || OUTCOME_COLORS.lost;
  const lqStyle = LEAD_QUALITY_COLORS[call.lead_quality] || LEAD_QUALITY_COLORS[1];
  const lqLabel = LEAD_QUALITY_LABELS[call.lead_quality] || "Unknown";
  const showForm = !review || editing;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link */}
      <Link
        href="/calls"
        className="text-[var(--primary)] hover:underline text-sm font-semibold inline-flex items-center gap-1 mb-6"
      >
        &larr; Back to Call Log
      </Link>

      {/* Call Info Card */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold text-[var(--primary)]">
            {call.contact_name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: outcomeStyle.bg,
                color: outcomeStyle.text,
              }}
            >
              {formatOutcome(call.outcome)}
            </span>
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: lqStyle.bg,
                color: lqStyle.text,
              }}
            >
              {lqLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-[var(--muted)] block">Date</span>
            <span className="font-semibold">{call.call_date}</span>
          </div>
          <div>
            <span className="text-[var(--muted)] block">Rep</span>
            <span className="font-semibold">{call.user_name}</span>
          </div>
          <div>
            <span className="text-[var(--muted)] block">Revenue</span>
            <span className="font-semibold">
              ${(call.revenue || 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[var(--muted)] block">Enrolled</span>
            <span className="font-semibold">
              {call.enrolled ? "Yes" : "No"}
            </span>
          </div>
        </div>

        {/* Pre-call condition badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {call.decision_maker_present && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-bg)] text-[var(--primary)]">
              DM Present
            </span>
          )}
          {call.webinar_watched && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-bg)] text-[var(--primary)]">
              Webinar Watched
            </span>
          )}
          {call.pcced && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-bg)] text-[var(--primary)]">
              PCC
            </span>
          )}
        </div>

        {/* Rep Notes */}
        {call.rep_notes && (
          <div className="mt-4">
            <span className="text-[var(--muted)] text-sm block mb-1">
              Rep Notes
            </span>
            <p className="text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-3">
              {call.rep_notes}
            </p>
          </div>
        )}
      </div>

      {/* Review Section */}
      {review && !editing ? (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--primary)]">
              Call Review
            </h2>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-semibold text-[var(--primary)] border border-[var(--primary)] rounded-lg hover:bg-[var(--primary-bg)] transition-colors"
            >
              Edit Review
            </button>
          </div>

          {/* Weighted Score */}
          {review.weighted_score != null && (
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold" style={{ color: getScoreBandColor(getScoreBand(review.weighted_score)) }}>
                  {review.weighted_score.toFixed(2)}
                </span>
                <span
                  className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      getScoreBand(review.weighted_score) === "Strong"
                        ? "var(--success-bg)"
                        : getScoreBand(review.weighted_score) === "Developing"
                        ? "#fef3c7"
                        : "var(--danger-bg)",
                    color: getScoreBandColor(getScoreBand(review.weighted_score)),
                  }}
                >
                  {getScoreBand(review.weighted_score)}
                </span>
              </div>
            </div>
          )}

          {/* Category Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {RUBRIC_CATEGORIES.map((cat) => {
              const scoreKey = `${cat}_score` as keyof CallReview;
              const notesKey = `${cat}_notes` as keyof CallReview;
              const score = review[scoreKey] as number | null;
              const catNotes = review[notesKey] as string;

              return (
                <div
                  key={cat}
                  className="border border-[var(--card-border)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {RUBRIC_LABELS[cat]}
                    </span>
                    <span className="text-lg font-bold" style={{ color: score != null ? getScoreBandColor(getScoreBand(score)) : "var(--muted)" }}>
                      {score != null ? score : "\u2014"}
                    </span>
                  </div>
                  {catNotes && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {catNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Strength / Dev Area / Action */}
          <div className="space-y-3">
            {review.top_strength && (
              <div>
                <span className="text-sm font-semibold text-[var(--primary)] block">
                  Top Strength
                </span>
                <p className="text-sm">{review.top_strength}</p>
              </div>
            )}
            {review.top_development_area && (
              <div>
                <span className="text-sm font-semibold text-[var(--warning)] block">
                  Top Development Area
                </span>
                <p className="text-sm">{review.top_development_area}</p>
              </div>
            )}
            {review.recommended_action && (
              <div>
                <span className="text-sm font-semibold text-[var(--foreground)] block">
                  Recommended Action
                </span>
                <p className="text-sm">{review.recommended_action}</p>
              </div>
            )}
            {review.call_recording_url && (
              <div>
                <span className="text-sm font-semibold text-[var(--foreground)] block">
                  Recording
                </span>
                <a
                  href={review.call_recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--primary)] hover:underline break-all"
                >
                  {review.call_recording_url}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Review Form (new or editing) */
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-4">
            {review ? "Edit Review" : "Score This Call"}
          </h2>

          <form onSubmit={handleSubmitReview}>
            {/* Recording URL */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Recording URL
              </label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="https://..."
              />
            </div>

            {/* Rubric Categories */}
            <div className="space-y-5">
              {RUBRIC_CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="border border-[var(--card-border)] rounded-lg p-4"
                >
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-2">
                    {RUBRIC_LABELS[cat]}
                  </label>

                  {/* Score Radio Buttons */}
                  <div className="flex items-center gap-3 mb-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label
                        key={val}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`score_${cat}`}
                          value={val}
                          checked={scores[cat] === val}
                          onChange={() =>
                            setScores((prev) => ({ ...prev, [cat]: val }))
                          }
                          className="accent-[var(--primary)]"
                        />
                        <span className="text-sm font-semibold">{val}</span>
                      </label>
                    ))}
                    {scores[cat] != null && (
                      <button
                        type="button"
                        onClick={() =>
                          setScores((prev) => ({ ...prev, [cat]: null }))
                        }
                        className="text-xs text-[var(--muted)] hover:text-[var(--danger)] ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  <textarea
                    value={notes[cat]}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder={`Notes on ${RUBRIC_LABELS[cat].toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>

            {/* Computed Weighted Score */}
            {computedWeightedScore != null && (
              <div className="mt-5 p-4 bg-[var(--primary-bg)] rounded-lg border border-[var(--primary)]">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    Weighted Score:
                  </span>
                  <span className="text-2xl font-bold" style={{ color: getScoreBandColor(getScoreBand(computedWeightedScore)) }}>
                    {computedWeightedScore.toFixed(2)}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        getScoreBand(computedWeightedScore) === "Strong"
                          ? "var(--success-bg)"
                          : getScoreBand(computedWeightedScore) === "Developing"
                          ? "#fef3c7"
                          : "var(--danger-bg)",
                      color: getScoreBandColor(getScoreBand(computedWeightedScore)),
                    }}
                  >
                    {getScoreBand(computedWeightedScore)}
                  </span>
                </div>
              </div>
            )}

            {/* Summary Fields */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Top Strength
                </label>
                <input
                  type="text"
                  value={topStrength}
                  onChange={(e) => setTopStrength(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="What did the rep do well?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Top Development Area
                </label>
                <input
                  type="text"
                  value={topDevArea}
                  onChange={(e) => setTopDevArea(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Primary area for improvement"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Recommended Action
                </label>
                <textarea
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Specific next steps for the rep..."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : review
                  ? "Update Review"
                  : "Submit Review"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 border border-[var(--input-border)] rounded-lg font-semibold text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
