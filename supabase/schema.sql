-- AdmissionPrep Sales Performance Tracker - Supabase Schema v5
-- Run this in your Supabase SQL Editor

-- Drop old tables if migrating (order matters for FK constraints)
drop table if exists rep_coaching_profiles;
drop table if exists coaching_sessions;
drop table if exists call_reviews;
drop table if exists calls;
drop table if exists imported_deals;
drop table if exists shift_entries;
drop table if exists historical_calls;

-- Shift entries (end-of-shift submissions)
create table shift_entries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_name text not null,
  created_at timestamptz default now(),
  shift_date date not null default current_date,

  -- Revenue & enrollments
  revenue_collected numeric default 0,
  enrollments integer default 0,

  -- Calls in Schedule → branches
  calls_in_schedule integer not null default 0,
  calls_occurred integer not null default 0,

  -- Occurred outcomes
  won integer not null default 0,
  lost integer not null default 0,
  follow_ups integer not null default 0,

  -- Non-occurred breakdown
  no_shows integer not null default 0,
  reschedules integer not null default 0,
  cancellations integer not null default 0,

  -- Derived from per-call table
  decision_maker_calls integer not null default 0,
  webinar_watched_calls integer not null default 0,
  pcced_calls integer not null default 0,

  -- Per-call detail (stored as JSON array)
  call_details jsonb default '[]',

  -- Overall shift notes
  win_notes text default '',
  loss_notes text default '',

  -- Reschedule tracking
  reschedule_names text default '',

  -- Reflection
  time_reflection text default '',

  -- Pre-shift goals (set before the shift begins)
  pre_shift_revenue_goal numeric default 0,
  pre_shift_enrollments_goal integer default 0,
  pre_shift_calls_goal integer default 0,

  -- PCC outreach attempts made during the shift
  pcc_attempts integer not null default 0
);

create index idx_shift_entries_user_id on shift_entries(user_id);
create index idx_shift_entries_created_at on shift_entries(created_at desc);
create index idx_shift_entries_shift_date on shift_entries(shift_date desc);

-- Historical calls (manual retroactive input)
create table historical_calls (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_name text not null,
  call_date date not null,
  contact_name text default '',
  outcome text not null default 'won',
  revenue numeric default 0,
  enrolled boolean default false,
  webinar_watched boolean default false,
  decision_maker_present boolean default false,
  pcced boolean default false,
  notes text default ''
);

create index idx_historical_calls_user_id on historical_calls(user_id);
create index idx_historical_calls_date on historical_calls(call_date desc);

-- Imported deals (from HubSpot CSV)
create table imported_deals (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_name text not null,
  contact_name text default '',
  close_date text not null,
  deal_stage text default '',
  outcome text not null default 'won',
  amount numeric default 0,
  excluded boolean default false,
  raw_stage text default '',
  created_at timestamptz default now()
);

create index idx_imported_deals_user_id on imported_deals(user_id);
create index idx_imported_deals_close_date on imported_deals(close_date);


-- ═══════════════════════════════════════════════
-- COACHING & CALL REVIEW SYSTEM (v5)
-- ═══════════════════════════════════════════════

-- Normalize calls into first-class rows
-- (replaces call_details JSONB buried in shift_entries)
create table calls (
  id                     uuid default gen_random_uuid() primary key,
  user_id                text not null,
  user_name              text not null,
  shift_entry_id         uuid references shift_entries(id) on delete set null,
  call_date              date not null,
  contact_name           text default '',
  outcome                text not null check (outcome in (
                           'won','lost','follow_up',
                           'no_show','rescheduled','cancelled'
                         )),
  revenue                numeric default 0,
  enrolled               boolean default false,
  webinar_watched        boolean default false,
  decision_maker_present boolean default false,
  pcced                  boolean default false,
  lead_quality           integer default 2 check (lead_quality between 1 and 3),
  rep_notes              text default '',
  created_at             timestamptz default now()
);

create index idx_calls_user_id   on calls(user_id);
create index idx_calls_call_date on calls(call_date desc);
create index idx_calls_outcome   on calls(outcome);

-- Core behavioral scoring layer
create table call_reviews (
  id                        uuid default gen_random_uuid() primary key,
  call_id                   uuid references calls(id) on delete cascade,
  reviewer_id               text not null,
  reviewed_at               timestamptz default now(),
  call_recording_url        text default '',

  -- Rubric scores: 1–5 integer
  discovery_score           integer check (discovery_score between 1 and 5),
  objection_handling_score  integer check (objection_handling_score between 1 and 5),
  closing_mechanics_score   integer check (closing_mechanics_score between 1 and 5),
  value_framing_score       integer check (value_framing_score between 1 and 5),
  call_control_score        integer check (call_control_score between 1 and 5),
  dm_strategy_score         integer check (dm_strategy_score between 1 and 5),

  -- Per-category coaching notes
  discovery_notes           text default '',
  objection_handling_notes  text default '',
  closing_mechanics_notes   text default '',
  value_framing_notes       text default '',
  call_control_notes        text default '',
  dm_strategy_notes         text default '',

  -- Computed on insert/update by application layer
  weighted_score            numeric(4,2),

  top_strength              text default '',
  top_development_area      text default '',
  recommended_action        text default ''
);

create index idx_call_reviews_call_id   on call_reviews(call_id);
create index idx_call_reviews_reviewer  on call_reviews(reviewer_id);
create index idx_call_reviews_reviewed  on call_reviews(reviewed_at desc);

-- Coaching session log
create table coaching_sessions (
  id                  uuid default gen_random_uuid() primary key,
  rep_id              text not null,
  rep_name            text not null,
  manager_id          text not null,
  session_date        date not null,
  call_review_ids     uuid[] default '{}',
  primary_focus       text not null,
  secondary_focus     text default '',
  session_notes       text default '',
  rep_commitments     text default '',
  manager_commitments text default '',
  follow_up_date      date,
  follow_up_completed boolean default false,
  follow_up_notes     text default '',
  created_at          timestamptz default now()
);

create index idx_coaching_rep_id       on coaching_sessions(rep_id);
create index idx_coaching_session_date on coaching_sessions(session_date desc);

-- Rep coaching state (system-maintained)
create table rep_coaching_profiles (
  id                  uuid default gen_random_uuid() primary key,
  rep_id              text not null unique,
  rep_name            text not null,
  priority_1_category text default '',
  priority_1_notes    text default '',
  priority_2_category text default '',
  priority_2_notes    text default '',
  rep_archetype       text default '',
  baseline_scores     jsonb default '{}',
  current_scores      jsonb default '{}',
  score_trends        jsonb default '{}',
  last_reviewed_at    date,
  last_session_date   date,
  updated_at          timestamptz default now()
);

