export interface ImportedDeal {
  id?: string;
  user_id: string;
  user_name: string;
  contact_name: string;
  close_date: string;
  deal_stage: string;
  outcome: 'won' | 'lost' | 'excluded';
  amount: number;
  excluded: boolean; // true if non-occur, appointment, or webinar engagement
  raw_stage: string; // original stage name from CSV
}

export interface ImportStats {
  total_rows: number;
  total_deals: number; // won + lost (actionable)
  total_won: number;
  total_lost: number;
  total_excluded: number;
  total_revenue: number;
  close_rate_all: number; // won / (won + lost + excluded)
  close_rate_actionable: number; // won / (won + lost) — excludes non-occur/appointment/webinar
}

// Stages to exclude from actionable close rate
export const EXCLUDED_STAGES = [
  'appointment scheduled',
  'appointment',
  'non-occur',
  'non occur',
  'no show',
  'no-show',
  'cancelled',
  'canceled',
  'rescheduled',
  'webinar engagement',
  'webinar',
];

export function isExcludedStage(stage: string): boolean {
  const normalized = stage.toLowerCase().trim();
  return EXCLUDED_STAGES.some(
    (s) => normalized.includes(s) || s.includes(normalized)
  );
}

export function mapDealStage(stage: string): 'won' | 'lost' | 'excluded' {
  const normalized = stage.toLowerCase().trim();
  if (normalized.includes('closed won') || normalized === 'won') return 'won';
  if (normalized.includes('closed lost') || normalized === 'lost') return 'lost';
  if (isExcludedStage(normalized)) return 'excluded';
  // Default: treat unknown stages as lost (they had a call but didn't close)
  return 'lost';
}

export function calculateImportStats(deals: ImportedDeal[]): ImportStats {
  const won = deals.filter((d) => d.outcome === 'won');
  const lost = deals.filter((d) => d.outcome === 'lost');
  const excluded = deals.filter((d) => d.outcome === 'excluded');

  const totalWon = won.length;
  const totalLost = lost.length;
  const totalExcluded = excluded.length;
  const totalRevenue = won.reduce((sum, d) => sum + d.amount, 0);

  const allTotal = totalWon + totalLost + totalExcluded;
  const actionableTotal = totalWon + totalLost;

  return {
    total_rows: deals.length,
    total_deals: actionableTotal,
    total_won: totalWon,
    total_lost: totalLost,
    total_excluded: totalExcluded,
    total_revenue: totalRevenue,
    close_rate_all: allTotal > 0 ? totalWon / allTotal : 0,
    close_rate_actionable: actionableTotal > 0 ? totalWon / actionableTotal : 0,
  };
}

export function filterDealsByDate(deals: ImportedDeal[], filter: string): ImportedDeal[] {
  if (filter === 'all') return deals;

  const now = new Date();
  let cutoff: Date;

  switch (filter) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'year':
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default: {
      // Check for specific month format: "2025-04"
      if (/^\d{4}-\d{2}$/.test(filter)) {
        const [year, month] = filter.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        return deals.filter((d) => {
          const date = new Date(d.close_date);
          return date >= start && date <= end;
        });
      }
      return deals;
    }
  }

  return deals.filter((d) => new Date(d.close_date) >= cutoff);
}

export function getAvailableMonths(deals: ImportedDeal[]): string[] {
  const months = new Set<string>();
  for (const deal of deals) {
    if (deal.close_date) {
      const date = new Date(deal.close_date);
      if (!isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
      }
    }
  }
  return Array.from(months).sort().reverse();
}
