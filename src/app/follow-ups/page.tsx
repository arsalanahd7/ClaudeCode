"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, CallDetail } from "@/lib/types";

interface FollowUpCall {
  shiftId: string;
  shiftDate: string;
  callIndex: number;
  call: CallDetail;
}

export default function FollowUpsPage() {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("shift_entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setEntries(data as ShiftEntry[]);
    setLoading(false);
  }

  // Extract all follow-up calls from all shift entries
  const followUps: FollowUpCall[] = [];
  for (const entry of entries) {
    if (!entry.call_details) continue;
    entry.call_details.forEach((call, index) => {
      if (call.outcome === "follow_up") {
        followUps.push({
          shiftId: entry.id!,
          shiftDate: entry.shift_date,
          callIndex: index,
          call,
        });
      }
    });
  }

  async function resolveFollowUp(
    fu: FollowUpCall,
    newOutcome: "won" | "lost"
  ) {
    setUpdating(`${fu.shiftId}-${fu.callIndex}`);

    const entry = entries.find((e) => e.id === fu.shiftId);
    if (!entry) return;

    // Update the call detail outcome
    const updatedDetails = [...(entry.call_details || [])];
    updatedDetails[fu.callIndex] = {
      ...updatedDetails[fu.callIndex],
      outcome: newOutcome,
    };

    // Recalculate won/lost/follow_ups counts
    const wonCount = updatedDetails.filter((c) => c.outcome === "won").length;
    const lostCount = updatedDetails.filter((c) => c.outcome === "lost").length;
    const followUpCount = updatedDetails.filter(
      (c) => c.outcome === "follow_up"
    ).length;

    // Recalculate derived stats
    const dmCalls = updatedDetails.filter(
      (c) => c.decision_maker_present
    ).length;
    const webinarCalls = updatedDetails.filter(
      (c) => c.webinar_watched
    ).length;
    const pccedCalls = updatedDetails.filter((c) => c.pcced).length;

    const { error } = await supabase
      .from("shift_entries")
      .update({
        call_details: updatedDetails,
        won: wonCount,
        lost: lostCount,
        follow_ups: followUpCount,
        decision_maker_calls: dmCalls,
        webinar_watched_calls: webinarCalls,
        pcced_calls: pccedCalls,
      })
      .eq("id", fu.shiftId);

    if (!error) {
      await loadData();
    }
    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[var(--muted)] italic">Loading follow-ups...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Follow-Ups</h1>
        <p className="text-[var(--muted)] mt-1">
          {followUps.length} call{followUps.length !== 1 ? "s" : ""} in
          follow-up. Resolve each as Won or Lost.
        </p>
      </div>

      {followUps.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-8 text-center">
          <p className="text-[var(--muted)] italic">
            No follow-up calls right now. All calls have been resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {followUps.map((fu) => {
            const key = `${fu.shiftId}-${fu.callIndex}`;
            const isUpdating = updating === key;

            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-[var(--card-border)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[var(--foreground)]">
                        {fu.call.contact_name || "Unknown Contact"}
                      </h3>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--warning-bg)] text-[var(--warning)]">
                        Follow-Up
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Shift: {fu.shiftDate || "—"}
                      {fu.call.webinar_watched && " · Webinar ✓"}
                      {fu.call.decision_maker_present && " · DM Present ✓"}
                      {fu.call.pcced && " · PCCed ✓"}
                    </p>
                    {fu.call.notes ? (
                      <div className="bg-[var(--primary-bg)] rounded-lg p-3 mt-2">
                        <p className="text-xs text-[var(--muted)] uppercase font-bold mb-1">
                          Notes
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {fu.call.notes}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted)] italic mt-1">
                        No notes recorded
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolveFollowUp(fu, "won")}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "..." : "Won"}
                    </button>
                    <button
                      onClick={() => resolveFollowUp(fu, "lost")}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-[var(--danger)] hover:opacity-80 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "..." : "Lost"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
