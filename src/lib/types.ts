export interface CallDetail {
  contact_name: string;
  webinar_watched: boolean;
  decision_maker_present: boolean;
  outcome: 'won' | 'lost' | 'follow_up';
  pcced: boolean;
  notes: string;
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
