interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "green" | "red" | "amber" | "default";
}

const colorMap = {
  green: "text-[var(--primary)]",
  red: "text-[var(--danger)]",
  amber: "text-[var(--warning)]",
  default: "text-[var(--foreground)]",
};

export default function MetricCard({ label, value, subtitle, color = "default" }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-[var(--muted-light)] mt-1">{subtitle}</p>}
    </div>
  );
}
