"use client";

import { useEffect, useState } from "react";

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
