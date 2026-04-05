-- AdmissionPrep Sales Performance Tracker - Supabase Schema v3
-- Run this in your Supabase SQL Editor

-- Drop old tables if migrating
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
  one_calls integer not null default 0,
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
  loss_notes text default ''
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
  outcome text not null default 'one',
  revenue numeric default 0,
  enrolled boolean default false,
  webinar_watched boolean default false,
  decision_maker_present boolean default false,
  pcced boolean default false,
  notes text default ''
);

create index idx_historical_calls_user_id on historical_calls(user_id);
create index idx_historical_calls_date on historical_calls(call_date desc);
