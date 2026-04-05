import { AIInsight } from "@/lib/types";

interface AIInsightPanelProps {
  insight: AIInsight;
}

export default function AIInsightPanel({ insight }: AIInsightPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-semibold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">AI Suggestions</h3>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{insight.diagnosis}</p>
          <p className="text-sm text-[var(--muted)] mt-1">{insight.explanation}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase mb-2">Recommended Actions</p>
          <ul className="space-y-1.5">
            {insight.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[var(--primary)] font-bold mt-0.5">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
