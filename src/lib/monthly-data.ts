// Hardcoded monthly performance data provided by user
// Enrollments = won calls, close rate = won / occurred, AOV = revenue / won

export interface MonthlyData {
  month: string;       // "YYYY-MM" format
  label: string;       // Display name
  revenue: number;
  enrollments: number; // = won calls
  calls_occurred: number;
}

export const MONTHLY_DATA: MonthlyData[] = [
  { month: "2025-02", label: "February 2025",  revenue: 3750,   enrollments: 1,  calls_occurred: 3  },
  { month: "2025-03", label: "March 2025",     revenue: 17750,  enrollments: 5,  calls_occurred: 36 },
  { month: "2025-04", label: "April 2025",     revenue: 28250,  enrollments: 8,  calls_occurred: 41 },
  { month: "2025-05", label: "May 2025",       revenue: 15250,  enrollments: 4,  calls_occurred: 23 },
  { month: "2025-06", label: "June 2025",      revenue: 25600,  enrollments: 6,  calls_occurred: 37 },
  { month: "2025-07", label: "July 2025",      revenue: 33500,  enrollments: 8,  calls_occurred: 44 },
  { month: "2025-08", label: "August 2025",    revenue: 42866,  enrollments: 11, calls_occurred: 66 },
  { month: "2025-09", label: "September 2025", revenue: 40000,  enrollments: 10, calls_occurred: 42 },
  { month: "2025-10", label: "October 2025",   revenue: 11250,  enrollments: 3,  calls_occurred: 31 },
  { month: "2025-11", label: "November 2025",  revenue: 14200,  enrollments: 4,  calls_occurred: 28 },
  { month: "2025-12", label: "December 2025",  revenue: 0,      enrollments: 0,  calls_occurred: 6  },
  { month: "2026-01", label: "January 2026",   revenue: 7000,   enrollments: 2,  calls_occurred: 13 },
  { month: "2026-02", label: "February 2026",  revenue: 0,      enrollments: 0,  calls_occurred: 17 },
  { month: "2026-03", label: "March 2026",     revenue: 26500,  enrollments: 7,  calls_occurred: 24 },
];

// Cumulative totals (Feb 2025 – Mar 2026):
// Revenue: $265,916  |  Enrollments: 69  |  Calls Occurred: 411
// AOV: $3,854  |  Close Rate: 16.8%

export function filterMonthlyData(data: MonthlyData[], filter: string): MonthlyData[] {
  if (filter === "all") return data;

  const now = new Date(2026, 3, 6); // April 6, 2026 (today's date)
  let cutoff: Date;

  switch (filter) {
    case "week":
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "3months":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case "6months":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case "year":
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default: {
      // Specific month filter like "2025-08"
      if (/^\d{4}-\d{2}$/.test(filter)) {
        return data.filter((d) => d.month === filter);
      }
      return data;
    }
  }

  return data.filter((d) => {
    const [year, month] = d.month.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    return monthDate >= cutoff;
  });
}

export function aggregateMonthlyData(months: MonthlyData[]) {
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalEnrollments = months.reduce((s, m) => s + m.enrollments, 0);
  const totalOccurred = months.reduce((s, m) => s + m.calls_occurred, 0);
  const totalLost = totalOccurred - totalEnrollments;
  // 70% show rate assumption
  const totalScheduled = totalOccurred > 0 ? Math.round(totalOccurred / 0.70) : 0;
  const avgAov = totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0;
  const closeRate = totalOccurred > 0 ? totalEnrollments / totalOccurred : 0;
  const showRate = totalScheduled > 0 ? totalOccurred / totalScheduled : 0;
  const didntOccur = totalScheduled - totalOccurred;

  return {
    totalRevenue,
    totalEnrollments,
    totalOccurred,
    totalLost,
    totalScheduled,
    avgAov,
    closeRate,
    showRate,
    didntOccur,
  };
}
