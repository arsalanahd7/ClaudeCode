import { CallReview, RubricCategory } from "./types";

// ── Rubric Weights ──
export const RUBRIC_WEIGHTS: Record<RubricCategory, number> = {
  discovery: 0.25,
  objection_handling: 0.22,
  closing_mechanics: 0.20,
  value_framing: 0.18,
  call_control: 0.10,
  dm_strategy: 0.05,
};

// When DM was present, redistribute dm_strategy weight to discovery
export const RUBRIC_WEIGHTS_DM_PRESENT: Record<RubricCategory, number> = {
  discovery: 0.30,
  objection_handling: 0.22,
  closing_mechanics: 0.20,
  value_framing: 0.18,
  call_control: 0.10,
  dm_strategy: 0,
};

export const RUBRIC_LABELS: Record<RubricCategory, string> = {
  discovery: "Discovery & Pain Amplification",
  objection_handling: "Objection Handling",
  closing_mechanics: "Closing Mechanics",
  value_framing: "Value Framing & Personalization",
  call_control: "Call Control & Structure",
  dm_strategy: "Decision Maker Strategy",
};

export const RUBRIC_CATEGORIES: RubricCategory[] = [
  "discovery",
  "objection_handling",
  "closing_mechanics",
  "value_framing",
  "call_control",
  "dm_strategy",
];

export const FOCUS_OPTIONS = RUBRIC_CATEGORIES.map((c) => ({
  value: c,
  label: RUBRIC_LABELS[c],
}));

// ── Score Calculation ──

export function calculateWeightedScore(
  review: Pick<CallReview, 'discovery_score' | 'objection_handling_score' | 'closing_mechanics_score' | 'value_framing_score' | 'call_control_score' | 'dm_strategy_score'>,
  dmPresent: boolean
): number | null {
  const weights = dmPresent ? RUBRIC_WEIGHTS_DM_PRESENT : RUBRIC_WEIGHTS;
  const scores: [RubricCategory, number | null][] = [
    ["discovery", review.discovery_score],
    ["objection_handling", review.objection_handling_score],
    ["closing_mechanics", review.closing_mechanics_score],
    ["value_framing", review.value_framing_score],
    ["call_control", review.call_control_score],
    ["dm_strategy", review.dm_strategy_score],
  ];

  let total = 0;
  let totalWeight = 0;
  for (const [cat, score] of scores) {
    if (score != null && weights[cat] > 0) {
      total += score * weights[cat];
      totalWeight += weights[cat];
    }
  }

  if (totalWeight === 0) return null;
  // Normalize in case some scores are missing
  return Math.round((total / totalWeight) * 100) / 100;
}

// ── Score Band ──

export type ScoreBand = "Strong" | "Developing" | "Intervention";

export function getScoreBand(score: number): ScoreBand {
  if (score >= 4.0) return "Strong";
  if (score >= 3.0) return "Developing";
  return "Intervention";
}

export function getScoreBandColor(band: ScoreBand): string {
  switch (band) {
    case "Strong": return "var(--primary)";
    case "Developing": return "#b8860b";
    case "Intervention": return "var(--danger)";
  }
}

// ── Trend Delta ──

export type TrendDirection = "improving" | "flat" | "declining";

export function getTrendDirection(delta: number): TrendDirection {
  if (delta >= 0.3) return "improving";
  if (delta <= -0.1) return "declining";
  return "flat";
}

export function getTrendLabel(dir: TrendDirection): string {
  switch (dir) {
    case "improving": return "Improving";
    case "flat": return "Flat";
    case "declining": return "Declining";
  }
}

export function getTrendColor(dir: TrendDirection): string {
  switch (dir) {
    case "improving": return "var(--primary)";
    case "flat": return "#b8860b";
    case "declining": return "var(--danger)";
  }
}

// ── Category Averages from Reviews ──

export interface CategoryAverages {
  discovery: number | null;
  objection_handling: number | null;
  closing_mechanics: number | null;
  value_framing: number | null;
  call_control: number | null;
  dm_strategy: number | null;
  counts: Record<RubricCategory, number>;
}

export function calculateCategoryAverages(reviews: CallReview[]): CategoryAverages {
  const sums: Record<RubricCategory, number> = {
    discovery: 0, objection_handling: 0, closing_mechanics: 0,
    value_framing: 0, call_control: 0, dm_strategy: 0,
  };
  const counts: Record<RubricCategory, number> = {
    discovery: 0, objection_handling: 0, closing_mechanics: 0,
    value_framing: 0, call_control: 0, dm_strategy: 0,
  };

  for (const r of reviews) {
    for (const cat of RUBRIC_CATEGORIES) {
      const key = `${cat}_score` as keyof CallReview;
      const val = r[key] as number | null;
      if (val != null) {
        sums[cat] += val;
        counts[cat]++;
      }
    }
  }

  const avg = (cat: RubricCategory) =>
    counts[cat] >= 1 ? Math.round((sums[cat] / counts[cat]) * 100) / 100 : null;

  return {
    discovery: avg("discovery"),
    objection_handling: avg("objection_handling"),
    closing_mechanics: avg("closing_mechanics"),
    value_framing: avg("value_framing"),
    call_control: avg("call_control"),
    dm_strategy: avg("dm_strategy"),
    counts,
  };
}

// ── Coaching Priorities ──
// Returns bottom 2 categories by average (with >= 3 data points)

export function deriveCoachingPriorities(
  avgs: CategoryAverages
): { category: RubricCategory; avg: number }[] {
  const valid: { category: RubricCategory; avg: number }[] = [];
  for (const cat of RUBRIC_CATEGORIES) {
    const val = avgs[cat as keyof CategoryAverages];
    if (typeof val === "number" && avgs.counts[cat] >= 3) {
      valid.push({ category: cat, avg: val });
    }
  }
  valid.sort((a, b) => a.avg - b.avg);
  return valid.slice(0, 2);
}

// ── Trend Calculation (last 5 vs prior 5) ──

export function calculateTrendDelta(
  reviews: CallReview[] // sorted by reviewed_at desc
): { recent: number | null; prior: number | null; delta: number | null } {
  const recent = reviews.slice(0, 5);
  const prior = reviews.slice(5, 10);

  const avgScore = (arr: CallReview[]) => {
    const valid = arr.filter((r) => r.weighted_score != null);
    if (valid.length === 0) return null;
    return valid.reduce((s, r) => s + (r.weighted_score || 0), 0) / valid.length;
  };

  const recentAvg = avgScore(recent);
  const priorAvg = avgScore(prior);

  return {
    recent: recentAvg != null ? Math.round(recentAvg * 100) / 100 : null,
    prior: priorAvg != null ? Math.round(priorAvg * 100) / 100 : null,
    delta:
      recentAvg != null && priorAvg != null
        ? Math.round((recentAvg - priorAvg) * 100) / 100
        : null,
  };
}

export const LEAD_QUALITY_LABELS: Record<number, string> = {
  1: "Cold",
  2: "Warm",
  3: "Hot",
};
