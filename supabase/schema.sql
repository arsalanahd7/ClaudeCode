-- AdmissionPrep Sales Performance Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Drop old table if migrating from v1
drop table if exists shift_entries;

create table shift_entries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_name text not null,
  created_at timestamptz default now(),

  -- Cumulative all-time fields
  total_revenue_since_start numeric default 0,
  total_calls_since_start integer default 0,

  -- This shift
  revenue_collected numeric default 0,

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

  -- Per-call detail (stored as JSON array)
  call_details jsonb default '[]',

  -- Overall shift notes
  win_notes text default '',
  loss_notes text default ''
);

create index idx_shift_entries_user_id on shift_entries(user_id);
create index idx_shift_entries_created_at on shift_entries(created_at desc);
