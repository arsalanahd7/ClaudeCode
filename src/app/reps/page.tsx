"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Call, CallReview, RubricCategory } from "@/lib/types";
import {
  calculateWeightedScore,
  calculateCategoryAverages,
  deriveCoachingPriorities,
  calculateTrendDelta,
  getScoreBand,
  getScoreBandColor,
  getTrendDirection,
  getTrendLabel,
  getTrendColor,
  RUBRIC_LABELS,
} from "@/lib/coaching";

type SortOption = "score" | "name" | "trend";

interface RepData {
  user_id: string;
  user_name: string;
  calls: Call[];
  reviews: CallReview[];
  reviewedCallIds: Set<string>;
}

interface RepCard {
  user_id: string;
  user_name: string;
  weightedAvg: number | null;
  scoreBand: string | null;
  scoreBandColor: string | null;
  trendDelta: number | null;
  trendDirection: string | null;
  trendLabel: string | null;
  trendColor: string | null;
  topPriority: { category: RubricCategory; avg: number } | null;
  reviewedCount: number;
  totalCount: number;
  stale: boolean; // no reviewed calls in last 14 days
}

export default function RepsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [reviews, setReviews] = useState<CallReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("score");

  useEffect(() => {
    async function load() {
      const [callsRes, reviewsRes] = await Promise.all([
        supabase.from("calls").select("*"),
        supabase.from("call_reviews").select("*").order("reviewed_at", { ascending: false }),
      ]);
      if (callsRes.data) setCalls(callsRes.data as Call[]);
      if (reviewsRes.data) setReviews(reviewsRes.data as CallReview[]);
      setLoading(false);
    }
    load();
  }, []);

  const repCards: RepCard[] = useMemo(() => {
    // Group calls by user_id
    const repMap = new Map<string, RepData>();
    for (const call of calls) {
      if (!repMap.has(call.user_id)) {
        repMap.set(call.user_id, {
          user_id: call.user_id,
          user_name: call.user_name,
          calls: [],
          reviews: [],
          reviewedCallIds: new Set(),
        });
      }
      repMap.get(call.user_id)!.calls.push(call);
    }

    // Build a call_id -> call lookup
    const callById = new Map<string, Call>();
    for (const call of calls) {
      if (call.id) callById.set(call.id, call);
    }

    // Assign reviews to their rep
    for (const review of reviews) {
      const call = callById.get(review.call_id);
      if (call && repMap.has(call.user_id)) {
        const rep = repMap.get(call.user_id)!;
        rep.reviews.push(review);
        rep.reviewedCallIds.add(review.call_id);
      }
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    return Array.from(repMap.values()).map((rep) => {
      // Reviews are already sorted by reviewed_at desc (from the query)
      const last10Reviews = rep.reviews.slice(0, 10);

      // Calculate weighted average of last 10 reviews
      let weightedAvg: number | null = null;
      if (last10Reviews.length > 0) {
        const scores = last10Reviews
          .map((r) => r.weighted_score)
          .filter((s): s is number => s != null);
        if (scores.length > 0) {
          weightedAvg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
        }
      }

      // Score band
      const scoreBand = weightedAvg != null ? getScoreBand(weightedAvg) : null;
      const scoreBandColor = scoreBand ? getScoreBandColor(scoreBand) : null;

      // Trend delta (last 5 vs prior 5)
      const trend = calculateTrendDelta(last10Reviews);
      const trendDir = trend.delta != null ? getTrendDirection(trend.delta) : null;

      // Top coaching priority
      const catAvgs = calculateCategoryAverages(rep.reviews);
      const priorities = deriveCoachingPriorities(catAvgs);
      const topPriority = priorities.length > 0 ? priorities[0] : null;

      // Stale flag: no reviewed call in last 14 days
      const hasRecentReview = rep.reviews.some((r) => {
        if (!r.reviewed_at) return false;
        return new Date(r.reviewed_at) >= fourteenDaysAgo;
      });

      return {
        user_id: rep.user_id,
        user_name: rep.user_name,
        weightedAvg,
        scoreBand,
        scoreBandColor,
        trendDelta: trend.delta,
        trendDirection: trendDir,
        trendLabel: trendDir ? getTrendLabel(trendDir) : null,
        trendColor: trendDir ? getTrendColor(trendDir) : null,
        topPriority,
        reviewedCount: rep.reviewedCallIds.size,
        totalCount: rep.calls.length,
        stale: rep.reviews.length > 0 && !hasRecentReview,
      };
    });
  }, [calls, reviews]);

  const sortedCards = useMemo(() => {
    const sorted = [...repCards];
    switch (sortBy) {
      case "score":
        sorted.sort((a, b) => (b.weightedAvg ?? -1) - (a.weightedAvg ?? -1));
        break;
      case "name":
        sorted.sort((a, b) => a.user_name.localeCompare(b.user_name));
        break;
      case "trend":
        sorted.sort((a, b) => (b.trendDelta ?? -999) - (a.trendDelta ?? -999));
        break;
    }
    return sorted;
  }, [repCards, sortBy]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading reps...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Rep Overview</h1>
          <p className="text-[var(--muted)] mt-1">
            {repCards.length} rep{repCards.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="score">Sort by Score</option>
          <option value="name">Sort by Name</option>
          <option value="trend">Sort by Trend</option>
        </select>
      </div>

      {/* Rep Cards */}
      {sortedCards.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-8">
          <p className="text-[var(--muted)] italic text-center">
            No reps found. Call data will appear here once calls are recorded.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCards.map((rep) => (
            <Link
              key={rep.user_id}
              href={`/reps/${encodeURIComponent(rep.user_id)}`}
              className="block bg-white rounded-xl border border-[var(--card-border)] p-5 hover:border-[var(--primary)] transition-colors"
            >
              {/* Name + Stale Flag */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-[var(--foreground)] truncate">
                  {rep.user_name}
                </h2>
                {rep.stale && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
                    Stale
                  </span>
                )}
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-3 mb-3">
                {rep.weightedAvg != null ? (
                  <span
                    className="text-2xl font-bold"
                    style={{ color: rep.scoreBandColor ?? undefined }}
                  >
                    {rep.weightedAvg.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-[var(--muted)]">--</span>
                )}
                {rep.scoreBand && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: rep.scoreBandColor ?? undefined,
                      backgroundColor:
                        rep.scoreBand === "Strong"
                          ? "var(--success-bg)"
                          : rep.scoreBand === "Developing"
                          ? "#fef3cd"
                          : "var(--danger-bg)",
                    }}
                  >
                    {rep.scoreBand}
                  </span>
                )}
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="text-[var(--muted)]">Trend:</span>
                {rep.trendDelta != null && rep.trendDirection && rep.trendLabel ? (
                  <span
                    className="font-semibold flex items-center gap-1"
                    style={{ color: rep.trendColor ?? undefined }}
                  >
                    {rep.trendDirection === "improving"
                      ? "\u25B2"
                      : rep.trendDirection === "declining"
                      ? "\u25BC"
                      : "\u25B6"}{" "}
                    {rep.trendLabel} ({rep.trendDelta > 0 ? "+" : ""}
                    {rep.trendDelta.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-[var(--muted)] italic">Insufficient data</span>
                )}
              </div>

              {/* Top Priority */}
              <div className="text-sm mb-3">
                <span className="text-[var(--muted)]">Top Priority: </span>
                {rep.topPriority ? (
                  <span className="font-semibold text-[var(--foreground)]">
                    {RUBRIC_LABELS[rep.topPriority.category]} ({rep.topPriority.avg.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-[var(--muted)] italic">Needs more data</span>
                )}
              </div>

              {/* Review Count */}
              <div className="text-sm text-[var(--muted)]">
                {rep.reviewedCount} / {rep.totalCount} calls reviewed
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
