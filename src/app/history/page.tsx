import HistoricalCallForm from "@/components/HistoricalCallForm";

export default function HistoryPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Manual Input</h1>
        <p className="text-[var(--muted)] mt-1">
          Add historical calls retroactively. Enter the date, outcome, and details for any past call.
        </p>
      </div>
      <HistoricalCallForm />
    </div>
  );
}
