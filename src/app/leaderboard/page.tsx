"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry } from "@/lib/types";
import { calculateLeaderboard } from "@/lib/metrics";
import LeaderboardComponent from "@/components/Leaderboard";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("shift_entries").select("*");
      if (data) {
        setEntries(data as ShiftEntry[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const leaderboard = calculateLeaderboard(entries);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Leaderboard</h1>
        <p className="text-[var(--muted)] mt-1">
          Ranked by composite score: 50% revenue + 30% close rate + 20% show rate
        </p>
      </div>

      {loading ? (
        <p className="text-[var(--muted)] italic">Loading leaderboard...</p>
      ) : (
        <LeaderboardComponent entries={leaderboard} />
      )}
    </div>
  );
}
