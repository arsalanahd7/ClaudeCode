import { Suspense } from "react";
import EditShiftForm from "@/components/EditShiftForm";

export default function EditShiftPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Edit Shift</h1>
        <p className="text-[var(--muted)] mt-1">Update the details of a previous shift.</p>
      </div>
      <Suspense fallback={<p className="text-[var(--muted)] italic">Loading...</p>}>
        <EditShiftForm />
      </Suspense>
    </div>
  );
}
