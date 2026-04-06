"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import {
  ImportedDeal,
  mapDealStage,
  calculateImportStats,
  filterDealsByDate,
  getAvailableMonths,
} from "@/lib/csv-import";

type Step = "upload" | "mapping" | "processing" | "results";

interface ColumnMapping {
  close_date: string;
  deal_stage: string;
  amount: string;
  contact_name: string;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[parseInt(month)]} ${year}`;
}

export default function CsvUploader() {
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    close_date: "",
    deal_stage: "",
    amount: "",
    contact_name: "",
  });
  const [userName, setUserName] = useState("");
  const [deals, setDeals] = useState<ImportedDeal[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError("CSV file is empty.");
          return;
        }
        const headers = Object.keys(data[0]);
        setCsvHeaders(headers);
        setCsvData(data);

        // Auto-detect common column names
        const autoMap: ColumnMapping = { close_date: "", deal_stage: "", amount: "", contact_name: "" };
        for (const h of headers) {
          const lower = h.toLowerCase();
          if (lower.includes("close") && lower.includes("date")) autoMap.close_date = h;
          else if (lower.includes("deal") && lower.includes("stage")) autoMap.deal_stage = h;
          else if (lower === "amount" || lower.includes("amount") || lower.includes("revenue")) autoMap.amount = h;
          else if (lower.includes("contact") || lower.includes("name")) autoMap.contact_name = h;
        }
        setMapping(autoMap);
        setStep("mapping");
      },
    });
  }, []);

  function processData() {
    if (!mapping.close_date || !mapping.deal_stage || !mapping.amount) {
      setError("Please map Close Date, Deal Stage, and Amount columns.");
      return;
    }
    if (!userName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    setStep("processing");
    const userId = userName.toLowerCase().replace(/\s+/g, "_");

    const imported: ImportedDeal[] = [];

    for (const row of csvData) {
      const rawStage = row[mapping.deal_stage] || "";
      const outcome = mapDealStage(rawStage);
      const amountStr = (row[mapping.amount] || "0").replace(/[^0-9.-]/g, "");
      const amount = parseFloat(amountStr) || 0;
      const closeDate = row[mapping.close_date] || "";
      const contactName = mapping.contact_name ? row[mapping.contact_name] || "" : "";

      imported.push({
        user_id: userId,
        user_name: userName,
        contact_name: contactName,
        close_date: closeDate,
        deal_stage: rawStage,
        outcome,
        amount: outcome === "won" ? amount : 0,
        raw_stage: rawStage,
      });
    }

    setDeals(imported);
    setStep("results");
  }

  async function saveToSupabase() {
    setSaving(true);
    setError("");

    // Batch insert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < deals.length; i += chunkSize) {
      const chunk = deals.slice(i, i + chunkSize).map((d) => ({
        user_id: d.user_id,
        user_name: d.user_name,
        contact_name: d.contact_name,
        close_date: d.close_date,
        deal_stage: d.deal_stage,
        outcome: d.outcome,
        amount: d.amount,
        raw_stage: d.raw_stage,
      }));

      const { error: dbError } = await supabase.from("imported_deals").insert(chunk);
      if (dbError) {
        setError(`Save error at row ${i}: ${dbError.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
  }

  function reset() {
    setStep("upload");
    setCsvHeaders([]);
    setCsvData([]);
    setDeals([]);
    setMapping({ close_date: "", deal_stage: "", amount: "", contact_name: "" });
    setError("");
    setSaved(false);
    setTimeFilter("all");
    if (fileRef.current) fileRef.current.value = "";
  }

  // Filter and stats
  const filteredDeals = filterDealsByDate(deals, timeFilter);
  const stats = calculateImportStats(filteredDeals);
  const availableMonths = getAvailableMonths(deals);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-8 text-center">
          <h2 className="text-xl font-bold text-[var(--primary)] mb-2">Upload HubSpot CSV</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Export your deals from HubSpot as CSV and upload here. The system will map columns, calculate stats, and import into your dashboard.
          </p>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-left">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent mb-4"
              placeholder="e.g. John Smith"
            />
          </div>

          <label className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg cursor-pointer transition-colors">
            Upload HubSpot CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-xl font-bold text-[var(--primary)] mb-1">Map Your Columns</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            We found {csvData.length} rows and {csvHeaders.length} columns. Match each field to the correct CSV column.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { key: "close_date" as const, label: "Close Date", required: true },
              { key: "deal_stage" as const, label: "Deal Stage", required: true },
              { key: "amount" as const, label: "Amount / Revenue", required: true },
              { key: "contact_name" as const, label: "Contact Name", required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-semibold mb-1.5">
                  {label} {required && <span className="text-[var(--danger)]">*</span>}
                </label>
                <select
                  value={mapping[key]}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">— Select column —</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wide mb-2">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-[var(--primary)]">
                    {csvHeaders.slice(0, 6).map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-bold text-[var(--primary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)]">
                      {csvHeaders.slice(0, 6).map((h) => (
                        <td key={h} className="py-1.5 px-2 truncate max-w-[150px]">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={processData}
              className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors"
            >
              Process {csvData.length} Rows
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 border border-[var(--card-border)] rounded-lg text-[var(--muted)] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-8 text-center">
          <p className="text-[var(--muted)] italic">Processing {csvData.length} rows...</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === "results" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-2.5 border border-[var(--input-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">This Year</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
            <span className="text-sm text-[var(--muted)]">
              Showing {filteredDeals.length} of {deals.length} deals
            </span>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <p className="text-xs text-[var(--muted)] uppercase">Total Revenue</p>
              <p className="text-2xl font-bold text-[var(--primary)]">${stats.total_revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <p className="text-xs text-[var(--muted)] uppercase">Won Calls</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{stats.total_won}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
              <p className="text-xs text-[var(--muted)] uppercase">Lost Calls</p>
              <p className="text-2xl font-bold text-[var(--danger)]">{stats.total_lost}</p>
            </div>
            <div className="bg-[var(--primary-bg)] rounded-xl border border-[var(--primary)] p-5">
              <p className="text-xs text-[var(--muted)] uppercase mb-1">Close Rate</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{(stats.close_rate * 100).toFixed(1)}%</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                {stats.total_won} won / {stats.total_deals} total
              </p>
            </div>
          </div>

          {/* Deals Table */}
          <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
            <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">
              Imported Deals ({filteredDeals.length})
            </h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b-2 border-[var(--primary)]">
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Date</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Contact</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Stage</th>
                    <th className="text-left py-2 px-3 font-bold text-[var(--primary)]">Outcome</th>
                    <th className="text-right py-2 px-3 font-bold text-[var(--primary)]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-2 px-3">{deal.close_date}</td>
                      <td className="py-2 px-3">{deal.contact_name || "—"}</td>
                      <td className="py-2 px-3 text-xs text-[var(--muted)]">{deal.raw_stage}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          deal.outcome === "won"
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : "bg-[var(--danger-bg)] text-[var(--danger)]"
                        }`}>
                          {deal.outcome === "won" ? "Won" : "Lost"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {deal.amount > 0 ? `$${deal.amount.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save + Reset */}
          <div className="flex gap-3">
            {!saved ? (
              <button
                onClick={saveToSupabase}
                disabled={saving}
                className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save ${deals.length} Deals to Dashboard`}
              </button>
            ) : (
              <div className="bg-[var(--success-bg)] text-[var(--success)] px-4 py-3 rounded-lg text-sm border border-[var(--success)]">
                {deals.length} deals saved successfully! They will appear in your Cumulative Performance.
              </div>
            )}
            <button
              onClick={reset}
              className="px-6 py-3 border border-[var(--card-border)] rounded-lg text-[var(--muted)] hover:bg-gray-50 transition-colors"
            >
              Upload Another
            </button>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm border border-[var(--danger)]">
          {error}
        </div>
      )}
    </div>
  );
}
