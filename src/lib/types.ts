export const WEAK_STAGE_OPTIONS = [
  'rapport',
  'agenda_control',
  'pain',
  'urgency',
  'commitment',
  'objection_handling',
  'closing',
] as const;

export type WeakStage = (typeof WEAK_STAGE_OPTIONS)[number];

export interface ShiftEntry {
  id?: string;
  user_id: string;
  user_name: string;
  created_at?: string;

  calls_scheduled: number;
  calls_completed: number;
  no_shows: number;
  reschedules: number;
  cancellations: number;
  won: number;
  lost: number;
  follow_ups: number;
  decision_maker_calls: number;
  webinar_watched_calls: number;

  weak_stages: WeakStage[];
  win_notes: string;
  loss_notes: string;

  revenue?: number;
}

export interface Metrics {
  close_rate: number;
  show_rate: number;
  follow_up_rate: number;
  decision_maker_rate: number;
  webinar_rate: number;
}

export interface Insight {
  flag: string;
  severity: 'warning' | 'critical';
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
