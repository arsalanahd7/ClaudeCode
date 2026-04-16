export interface CallDetail {
  contact_name: string;
  webinar_watched: boolean;
  decision_maker_present: boolean;
  outcome: 'won' | 'lost' | 'follow_up';
  pcced: boolean;
  notes: string;
  win_on_call?: string;
  lose_on_call?: string;
}

export interface ShiftEntry {
  id?: string;
  user_id: string;
  user_name: string;
  created_at?: string;
  shift_date: string;

  // This shift revenue & enrollments
  revenue_collected: number;
  enrollments: number;

  // Calls in Schedule → branches
  calls_in_schedule: number;

  // Calls Occurred (sub of Calls in Schedule)
  calls_occurred: number;
  won: number;
  lost: number;
  follow_ups: number;

  // Non-Occurred (sub of Calls in Schedule)
  no_shows: number;
  reschedules: number;
  cancellations: number;

  // Derived from per-call table
  decision_maker_calls: number;
  webinar_watched_calls: number;
  pcced_calls: number;

  // Per-call detail table
  call_details: CallDetail[];

  // Overall shift notes
  win_notes: string;
  loss_notes: string;

  // Reschedule tracking
  reschedule_names?: string;

  // Reflection
  time_reflection?: string;

  // Pre-shift goals (set before the shift)
  pre_shift_revenue_goal?: number;
  pre_shift_enrollments_goal?: number;
  pre_shift_calls_goal?: number;

  // PCC outreach attempts during the shift (separate from pcced_calls in schedule)
  pcc_attempts?: number;
}

export interface HistoricalCall {
  id?: string;
  user_id: string;
  user_name: string;
  call_date: string;
  contact_name: string;
  outcome: 'won' | 'lost' | 'follow_up';
  revenue: number;
  enrolled: boolean;
  webinar_watched: boolean;
  decision_maker_present: boolean;
  pcced: boolean;
  notes: string;
}

export interface CumulativeStats {
  total_revenue: number;
  total_calls_occurred: number;
  total_won_calls: number;
  total_enrollments: number;
  avg_aov: number;
  avg_close_rate: number;
  total_pcced: number;
  total_no_shows: number;
  total_reschedules: number;
  total_cancellations: number;
  webinar_win_rate: number;
  dm_win_rate: number;
  non_webinar_win_rate: number;
  non_dm_win_rate: number;
}

export interface Metrics {
  close_rate: number;
  follow_up_rate: number;
  show_rate: number;
  non_occurred_rate: number;
  decision_maker_rate: number;
  webinar_rate: number;
  pcc_rate: number;
  won_rate: number;
}

export interface Insight {
  flag: string;
  severity: 'warning' | 'critical' | 'info';
}

export interface AIInsight {
  diagnosis: string;
  explanation: string;
  actions: string[];
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  total_revenue: number;
  avg_close_rate: number;
  avg_show_rate: number;
  score: number;
  entries_count: number;
}

// ── Coaching & Call Review System ──

export type CallOutcome = 'won' | 'lost' | 'follow_up' | 'no_show' | 'rescheduled' | 'cancelled';

export interface Call {
  id?: string;
  user_id: string;
  user_name: string;
  shift_entry_id?: string;
  call_date: string;
  contact_name: string;
  outcome: CallOutcome;
  revenue: number;
  enrolled: boolean;
  webinar_watched: boolean;
  decision_maker_present: boolean;
  pcced: boolean;
  lead_quality: 1 | 2 | 3; // 1=cold, 2=warm, 3=hot
  rep_notes: string;
  created_at?: string;
}

export type RubricCategory =
  | 'discovery'
  | 'objection_handling'
  | 'closing_mechanics'
  | 'value_framing'
  | 'call_control'
  | 'dm_strategy';

export interface CallReview {
  id?: string;
  call_id: string;
  reviewer_id: string;
  reviewed_at?: string;
  call_recording_url: string;

  discovery_score: number | null;
  objection_handling_score: number | null;
  closing_mechanics_score: number | null;
  value_framing_score: number | null;
  call_control_score: number | null;
  dm_strategy_score: number | null;

  discovery_notes: string;
  objection_handling_notes: string;
  closing_mechanics_notes: string;
  value_framing_notes: string;
  call_control_notes: string;
  dm_strategy_notes: string;

  weighted_score: number | null;

  top_strength: string;
  top_development_area: string;
  recommended_action: string;
}

export interface CoachingSession {
  id?: string;
  rep_id: string;
  rep_name: string;
  manager_id: string;
  session_date: string;
  call_review_ids: string[];
  primary_focus: string;
  secondary_focus: string;
  session_notes: string;
  rep_commitments: string;
  manager_commitments: string;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  follow_up_notes: string;
  created_at?: string;
}

export interface RepCoachingProfile {
  id?: string;
  rep_id: string;
  rep_name: string;
  priority_1_category: string;
  priority_1_notes: string;
  priority_2_category: string;
  priority_2_notes: string;
  rep_archetype: string;
  baseline_scores: Record<string, number>;
  current_scores: Record<string, number>;
  score_trends: Record<string, string>;
  last_reviewed_at: string | null;
  last_session_date: string | null;
  updated_at?: string;
}
