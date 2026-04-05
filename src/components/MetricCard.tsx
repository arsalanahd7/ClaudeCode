interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "amber";
}

const colorMap = {
  blue: "text-[var(--primary)]",
  green: "text-[var(--success)]",
  red: "text-[var(--danger)]",
  amber: "text-[var(--warning)]",
};

export default function MetricCard({ label, value, subtitle, color = "blue" }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
    </div>
  );
}
