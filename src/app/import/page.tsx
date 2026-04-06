import CsvUploader from "@/components/CsvUploader";

export default function ImportPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Import HubSpot Data</h1>
        <p className="text-[var(--muted)] mt-1">
          Upload a CSV export from HubSpot to import historical deal data. The system auto-maps columns, calculates close rates, and saves to your dashboard.
        </p>
      </div>
      <CsvUploader />
    </div>
  );
}
