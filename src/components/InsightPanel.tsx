import { Insight } from "@/lib/types";

interface InsightPanelProps {
  insights: Insight[];
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Coaching Nudges</h3>
        <p className="text-[var(--primary)] text-sm italic">No issues detected — excellent work.</p>
      </div>
    );
  }

  const severityColor = {
    critical: "text-[var(--danger)]",
    warning: "text-[var(--warning)]",
    info: "text-[var(--primary)]",
  };

  const dotColor = {
    critical: "bg-[var(--danger)]",
    warning: "bg-[var(--warning)]",
    info: "bg-[var(--primary)]",
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">Insights</h3>
      <ul className="space-y-2.5">
        {insights.map((insight, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 text-sm ${severityColor[insight.severity]}`}
          >
            <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor[insight.severity]}`} />
            <span>{insight.flag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
