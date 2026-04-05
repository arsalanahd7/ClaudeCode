import { AIInsight } from "@/lib/types";

interface AIInsightPanelProps {
  insight: AIInsight;
}

export default function AIInsightPanel({ insight }: AIInsightPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wide mb-3">AI Coaching</h3>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">{insight.diagnosis}</p>
          <p className="text-sm text-[var(--muted)] mt-1 italic">{insight.explanation}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-[var(--muted)] uppercase mb-2">Recommended Actions</p>
          <ul className="space-y-2">
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
