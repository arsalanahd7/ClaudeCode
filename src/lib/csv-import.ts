export interface ImportedDeal {
  id?: string;
  user_id: string;
  user_name: string;
  contact_name: string;
  close_date: string;
  deal_stage: string;
  outcome: 'won' | 'lost';
  amount: number;
  raw_stage: string;
}

export interface ImportStats {
  total_rows: number;
  total_deals: number;
  total_won: number;
  total_lost: number;
  total_revenue: number;
  close_rate: number;
}

export function mapDealStage(stage: string): 'won' | 'lost' {
  const normalized = stage.toLowerCase().trim();
  if (normalized.includes('closed won') || normalized === 'won') return 'won';
  // Everything else is a loss
  return 'lost';
}

export function calculateImportStats(deals: ImportedDeal[]): ImportStats {
  const won = deals.filter((d) => d.outcome === 'won');
  const lost = deals.filter((d) => d.outcome === 'lost');

  const totalWon = won.length;
  const totalLost = lost.length;
  const totalRevenue = won.reduce((sum, d) => sum + d.amount, 0);
  const total = totalWon + totalLost;

  return {
    total_rows: deals.length,
    total_deals: total,
    total_won: totalWon,
    total_lost: totalLost,
    total_revenue: totalRevenue,
    close_rate: total > 0 ? totalWon / total : 0,
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
