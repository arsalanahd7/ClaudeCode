"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftEntry, HistoricalCall } from "@/lib/types";

const TEAM_MEMBERS = [
  "Arsalan",
  "David",
  "A-M",
  "Shyla",
  "Madison",
  "Arry",
  "Jason",
  "Ann-Marie",
  "Irene",
];

export default function SettingsPage() {
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [defaultName, setDefaultName] = useState("");
  const [showMonthlyBreakdownDefault, setShowMonthlyBreakdownDefault] = useState(false);
  const [saved, setSaved] = useState(false);

  // Backfill state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null);

  useEffect(() => {
    setMonthlyTarget(localStorage.getItem("monthlyTarget") || "");
    setDefaultName(localStorage.getItem("defaultName") || "");
    setShowMonthlyBreakdownDefault(localStorage.getItem("showMonthlyBreakdownDefault") === "true");
  }, []);

  function saveAll() {
    localStorage.setItem("monthlyTarget", monthlyTarget);
    localStorage.setItem("defaultName", defaultName);
    localStorage.setItem("showMonthlyBreakdownDefault", String(showMonthlyBreakdownDefault));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function backfillCalls() {
    setSyncing(true);
    setSyncResult(null);
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // 1. Fetch all shift_entries
    const { data: shifts } = await supabase
      .from("shift_entries")
      .select("id, user_id, user_name, shift_date, call_details")
      .order("created_at", { ascending: true });

    // 2. Fetch existing calls with shift_entry_id to check what's already synced
    const { data: existingCalls } = await supabase
      .from("calls")
      .select("shift_entry_id")
      .not("shift_entry_id", "is", null);

    const syncedShiftIds = new Set(
      (existingCalls || []).map((c: { shift_entry_id: string }) => c.shift_entry_id)
    );

    // 3. Insert calls for unsynced shift entries
    for (const shift of (shifts || []) as ShiftEntry[]) {
      if (syncedShiftIds.has(shift.id!)) {
        skipped++;
        continue;
      }
      if (!shift.call_details || shift.call_details.length === 0) {
        skipped++;
        continue;
      }

      const callRows = shift.call_details.map((cd) => ({
        user_id: shift.user_id,
        user_name: shift.user_name,
        shift_entry_id: shift.id,
        call_date: shift.shift_date,
        contact_name: cd.contact_name,
        outcome: cd.outcome,
        revenue: 0,
        enrolled: cd.outcome === "won",
        webinar_watched: cd.webinar_watched,
        decision_maker_present: cd.decision_maker_present,
        pcced: cd.pcced,
        lead_quality: 2,
        rep_notes: cd.outcome === "won" ? (cd.win_on_call || "") : (cd.lose_on_call || ""),
      }));

      const { error } = await supabase.from("calls").insert(callRows);
      if (error) {
        errors++;
      } else {
        synced += callRows.length;
      }
    }

    // 4. Backfill from historical_calls table
    const { data: historical } = await supabase
      .from("historical_calls")
      .select("*")
      .order("call_date", { ascending: true });

    // Check for existing historical calls already in calls table (no shift_entry_id, match by user_id + call_date + contact_name)
    const { data: existingManual } = await supabase
      .from("calls")
      .select("user_id, call_date, contact_name")
      .is("shift_entry_id", null);

    const manualKeys = new Set(
      (existingManual || []).map(
        (c: { user_id: string; call_date: string; contact_name: string }) =>
          `${c.user_id}|${c.call_date}|${c.contact_name}`
      )
    );

    for (const hc of (historical || []) as HistoricalCall[]) {
      const key = `${hc.user_id}|${hc.call_date}|${hc.contact_name}`;
      if (manualKeys.has(key)) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from("calls").insert([{
        user_id: hc.user_id,
        user_name: hc.user_name,
        call_date: hc.call_date,
        contact_name: hc.contact_name,
        outcome: hc.outcome,
        revenue: hc.revenue || 0,
        enrolled: hc.enrolled || hc.outcome === "won",
        webinar_watched: hc.webinar_watched,
        decision_maker_present: hc.decision_maker_present,
        pcced: hc.pcced,
        lead_quality: 2,
        rep_notes: hc.notes || "",
      }]);

      if (error) {
        errors++;
      } else {
        synced++;
      }
    }

    setSyncResult({ synced, skipped, errors });
    setSyncing(false);
  }

  function clearAllLocal() {
    if (!confirm("Clear all local preferences? This cannot be undone.")) return;
    localStorage.removeItem("monthlyTarget");
    localStorage.removeItem("defaultName");
    localStorage.removeItem("showMonthlyBreakdownDefault");
    setMonthlyTarget("");
    setDefaultName("");
    setShowMonthlyBreakdownDefault(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Advanced Settings</h1>
        <p className="text-[var(--muted)] mt-1">
          Configure your defaults and preferences. Settings are saved locally to this browser.
        </p>
      </div>

      <div className="space-y-6">
        {/* Revenue Target */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Monthly Revenue Target</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            The target amount shown on the dashboard progress bar.
          </p>
          <label className="block text-sm font-semibold mb-1.5">Target ($)</label>
          <input
            type="number"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="0"
            min={0}
          />
        </div>

        {/* Default Name */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Default Name</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Which team member you typically log shifts as.
          </p>
          <label className="block text-sm font-semibold mb-1.5">Name</label>
          <select
            value={defaultName}
            onChange={(e) => setDefaultName(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">None</option>
            {TEAM_MEMBERS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Display Preferences */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Display Preferences</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Control how the dashboard renders by default.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showMonthlyBreakdownDefault}
              onChange={(e) => setShowMonthlyBreakdownDefault(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">Expand monthly breakdown by default</span>
          </label>
        </div>

        {/* Call Sync / Backfill */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--primary)] mb-1">Sync Calls to Coaching System</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Backfill all existing shift call details and historical calls into the coaching calls table.
            This is safe to run multiple times — it skips entries that are already synced.
          </p>
          <button
            onClick={backfillCalls}
            disabled={syncing}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync All Calls"}
          </button>
          {syncResult && (
            <div className={`mt-3 px-4 py-3 rounded-lg text-sm border ${
              syncResult.errors > 0
                ? "bg-[var(--warning-bg)] border-[var(--warning)] text-[var(--warning)]"
                : "bg-[var(--success-bg)] border-[var(--success)] text-[var(--success)]"
            }`}>
              <strong>{syncResult.synced}</strong> calls synced,{" "}
              <strong>{syncResult.skipped}</strong> already existed
              {syncResult.errors > 0 && (
                <>, <strong className="text-[var(--danger)]">{syncResult.errors}</strong> errors</>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={saveAll}
            className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={clearAllLocal}
            className="px-6 py-3 border border-[var(--danger)] text-[var(--danger)] font-semibold rounded-lg hover:bg-[var(--danger-bg)] transition-colors"
          >
            Clear All
          </button>
        </div>

        {saved && (
          <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">
            Settings saved.
          </div>
        )}
      </div>
    </div>
  );
}
