import { Insight } from "@/lib/types";

interface InsightPanelProps {
  insights: Insight[];
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        <h3 className="font-semibold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Leaks Detected</h3>
        <p className="text-[var(--success)] text-sm">No leaks detected — great work!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-semibold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Leaks Detected</h3>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 text-sm ${
              insight.severity === "critical" ? "text-[var(--danger)]" : "text-[var(--warning)]"
            }`}
          >
            <span className="mt-0.5">{insight.severity === "critical" ? "!!!" : "!"}</span>
            <span>{insight.flag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
