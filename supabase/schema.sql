-- Sales Performance Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

create table if not exists shift_entries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_name text not null,
  created_at timestamptz default now(),

  calls_scheduled integer not null default 0,
  calls_completed integer not null default 0,
  no_shows integer not null default 0,
  reschedules integer not null default 0,
  cancellations integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  follow_ups integer not null default 0,
  decision_maker_calls integer not null default 0,
  webinar_watched_calls integer not null default 0,

  weak_stages text[] default '{}',
  win_notes text default '',
  loss_notes text default '',
  revenue numeric default 0
);

-- Index for fast user lookups and sorting
create index if not exists idx_shift_entries_user_id on shift_entries(user_id);
create index if not exists idx_shift_entries_created_at on shift_entries(created_at desc);

-- Enable Row Level Security (optional - enable if you want per-user access control)
-- alter table shift_entries enable row level security;

-- Policy: allow all authenticated users to read all entries (for leaderboard)
-- create policy "Anyone can read shift entries" on shift_entries for select using (true);

-- Policy: users can only insert their own entries
-- create policy "Users can insert own entries" on shift_entries for insert with check (true);
