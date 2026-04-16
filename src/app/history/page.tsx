import HistoricalCallForm from "@/components/HistoricalCallForm";

export default function HistoryPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Manual Input</h1>
        <p className="text-[var(--muted)] mt-1">
          Add monthly performance data. Enter the month, revenue, calls occurred, and enrollments.
          Metrics like DM rate, webinar rate, and PCC rate are derived automatically.
        </p>
      </div>
      <HistoricalCallForm />
    </div>
  );
}
