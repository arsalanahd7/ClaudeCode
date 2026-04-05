import ShiftForm from "@/components/ShiftForm";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">End of Shift</h1>
        <p className="text-[var(--muted)] mt-1">Log your daily sales performance. Takes about 2 minutes.</p>
      </div>
      <ShiftForm />
    </div>
  );
}
