import { ShiftEntry, Metrics, Insight, AIInsight, LeaderboardEntry, CumulativeStats, CallDetail, HistoricalCall } from './types';

export function calculateMetrics(entry: ShiftEntry): Metrics {
  const co = entry.calls_occurred || 1;
  const cs = entry.calls_in_schedule || 1;
  const nonOccurred = entry.no_shows + entry.reschedules + entry.cancellations;

  return {
    close_rate: entry.won / co,
    follow_up_rate: entry.follow_ups / co,
    show_rate: co / cs,
    non_occurred_rate: nonOccurred / cs,
    decision_maker_rate: entry.decision_maker_calls / co,
    webinar_rate: entry.webinar_watched_calls / co,
    pcc_rate: entry.pcced_calls / co,
    won_rate: entry.won / co,
  };
}

export function calculateCumulativeStats(
  entries: ShiftEntry[],
  historicalCalls: HistoricalCall[]
): CumulativeStats {
  // Aggregate from shift entries
  let totalRevenue = 0;
  let totalCallsOccurred = 0;
  let totalWonCalls = 0;
  let totalEnrollments = 0;
  let totalPcced = 0;
  let totalNoShows = 0;
  let totalReschedules = 0;
  let totalCancellations = 0;

  // For webinar/DM win rate analysis
  let webinarWins = 0;
  let webinarTotal = 0;
  let dmWins = 0;
  let dmTotal = 0;
  let nonWebinarWins = 0;
  let nonWebinarTotal = 0;
  let nonDmWins = 0;
  let nonDmTotal = 0;

  for (const entry of entries) {
    totalRevenue += entry.revenue_collected || 0;
    totalCallsOccurred += entry.calls_occurred || 0;
    totalWonCalls += entry.won || 0;
    totalEnrollments += entry.enrollments || 0;
    totalPcced += entry.pcced_calls || 0;
    totalNoShows += entry.no_shows || 0;
    totalReschedules += entry.reschedules || 0;
    totalCancellations += entry.cancellations || 0;

    if (entry.call_details) {
      for (const call of entry.call_details) {
        if (call.webinar_watched) {
          webinarTotal++;
          if (call.outcome === 'won') webinarWins++;
        } else {
          nonWebinarTotal++;
          if (call.outcome === 'won') nonWebinarWins++;
        }
        if (call.decision_maker_present) {
          dmTotal++;
          if (call.outcome === 'won') dmWins++;
        } else {
          nonDmTotal++;
          if (call.outcome === 'won') nonDmWins++;
        }
      }
    }
  }

  // Add historical calls
  for (const call of historicalCalls) {
    totalRevenue += call.revenue || 0;
    totalCallsOccurred++;
    if (call.outcome === 'won') totalWonCalls++;
    if (call.enrolled) totalEnrollments++;
    if (call.pcced) totalPcced++;

    if (call.webinar_watched) {
      webinarTotal++;
      if (call.outcome === 'won') webinarWins++;
    } else {
      nonWebinarTotal++;
      if (call.outcome === 'won') nonWebinarWins++;
    }
    if (call.decision_maker_present) {
      dmTotal++;
      if (call.outcome === 'won') dmWins++;
    } else {
      nonDmTotal++;
      if (call.outcome === 'won') nonDmWins++;
    }
  }

  return {
    total_revenue: totalRevenue,
    total_calls_occurred: totalCallsOccurred,
    total_won_calls: totalWonCalls,
    total_enrollments: totalEnrollments,
    avg_aov: totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0,
    avg_close_rate: totalCallsOccurred > 0 ? totalWonCalls / totalCallsOccurred : 0,
    total_pcced: totalPcced,
    total_no_shows: totalNoShows,
    total_reschedules: totalReschedules,
    total_cancellations: totalCancellations,
    webinar_win_rate: webinarTotal > 0 ? webinarWins / webinarTotal : 0,
    dm_win_rate: dmTotal > 0 ? dmWins / dmTotal : 0,
    non_webinar_win_rate: nonWebinarTotal > 0 ? nonWebinarWins / nonWebinarTotal : 0,
    non_dm_win_rate: nonDmTotal > 0 ? nonDmWins / nonDmTotal : 0,
  };
}

export function filterEntriesByDate(
  entries: ShiftEntry[],
  filter: string
): ShiftEntry[] {
  if (filter === 'all') return entries;

  const now = new Date();

  // Handle specific month filter like "2025-11"
  if (/^\d{4}-\d{2}$/.test(filter)) {
    const [year, month] = filter.split('-').map(Number);
    return entries.filter((e) => {
      const d = new Date(e.shift_date || e.created_at || '');
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }

  const cutoff = getDateCutoff(now, filter);
  if (!cutoff) return entries;

  return entries.filter((e) => {
    const entryDate = new Date(e.shift_date || e.created_at || '');
    return entryDate >= cutoff;
  });
}

export function filterHistoricalByDate(
  calls: HistoricalCall[],
  filter: string
): HistoricalCall[] {
  if (filter === 'all') return calls;

  const now = new Date();

  // Handle specific month filter like "2025-11"
  if (/^\d{4}-\d{2}$/.test(filter)) {
    const [year, month] = filter.split('-').map(Number);
    return calls.filter((c) => {
      const d = new Date(c.call_date);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }

  const cutoff = getDateCutoff(now, filter);
  if (!cutoff) return calls;

  return calls.filter((c) => new Date(c.call_date) >= cutoff);
}

function getDateCutoff(now: Date, filter: string): Date | null {
  // Handle "Nmonths" pattern (2months, 3months, ..., 11months)
  const monthMatch = filter.match(/^(\d+)months$/);
  if (monthMatch) {
    const n = parseInt(monthMatch[1]);
    return new Date(now.getFullYear(), now.getMonth() - n, now.getDate());
  }

  switch (filter) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    default:
      return null;
  }
}

export function generateInsights(metrics: Metrics, cumulative: CumulativeStats): Insight[] {
  const insights: Insight[] = [];

  if (metrics.close_rate < 0.2) {
    insights.push({ flag: 'Close rate below 20% on calls — review discovery and closing mechanics', severity: 'critical' });
  }
  if (metrics.show_rate < 0.55) {
    insights.push({ flag: 'Show rate below 55% — tighten booking confirmations and PCC outreach', severity: 'critical' });
  }
  if (metrics.decision_maker_rate < 0.7) {
    insights.push({ flag: 'Less than 70% of calls have DM present — confirm DM attendance at booking', severity: 'warning' });
  }
  if (metrics.webinar_rate < 0.7) {
    insights.push({ flag: 'Less than 70% of prospects watched the webinar — make it a booking prerequisite', severity: 'warning' });
  }
  if (metrics.follow_up_rate > 0.4) {
    insights.push({ flag: 'Over 40% of calls defer to follow-up — push harder for on-call decisions', severity: 'warning' });
  }
  if (metrics.non_occurred_rate > 0.3) {
    insights.push({ flag: 'Over 30% of scheduled calls didn\u2019t occur — review booking quality', severity: 'warning' });
  }

  // Webinar/DM effect insights
  if (cumulative.webinar_win_rate > 0 && cumulative.non_webinar_win_rate > 0) {
    const lift = ((cumulative.webinar_win_rate - cumulative.non_webinar_win_rate) / cumulative.non_webinar_win_rate) * 100;
    if (lift > 10) {
      insights.push({
        flag: `Webinar watchers close ${lift.toFixed(0)}% better than non-watchers`,
        severity: 'info',
      });
    }
  }

  if (cumulative.dm_win_rate > 0 && cumulative.non_dm_win_rate > 0) {
    const lift = ((cumulative.dm_win_rate - cumulative.non_dm_win_rate) / cumulative.non_dm_win_rate) * 100;
    if (lift > 10) {
      insights.push({
        flag: `Decision maker presence lifts close rate by ${lift.toFixed(0)}%`,
        severity: 'info',
      });
    }
  }

  const totalNonOccurred = cumulative.total_no_shows + cumulative.total_reschedules + cumulative.total_cancellations;
  if (totalNonOccurred > 5) {
    insights.push({
      flag: `${totalNonOccurred} total non-occurred calls (${cumulative.total_no_shows} no-shows, ${cumulative.total_reschedules} reschedules, ${cumulative.total_cancellations} cancellations)`,
      severity: 'warning',
    });
  }

  if (cumulative.total_pcced > 0) {
    insights.push({
      flag: `${cumulative.total_pcced} calls PCCed across all shifts`,
      severity: 'info',
    });
  }

  return insights;
}

export function generateAIInsight(metrics: Metrics, callDetails: CallDetail[], cumulative: CumulativeStats, pccScheduledRate?: number): AIInsight {
  const problems: string[] = [];
  const actions: string[] = [];
  const positives: string[] = [];

  const callsWithoutDM = callDetails.filter(c => !c.decision_maker_present);
  const callsWithoutWebinar = callDetails.filter(c => !c.webinar_watched);
  const followUpCalls = callDetails.filter(c => c.outcome === 'follow_up');

  if (metrics.close_rate < 0.2) {
    problems.push('Your call close rate is below 20%');
    actions.push('Focus on closing during the call — avoid deferring to follow-ups');
  }

  if (metrics.show_rate < 0.55) {
    problems.push('Show rate below 55% — nearly half your booked calls aren\u2019t happening');
    actions.push('Send confirmation messages 24h and 1h before each call');
    actions.push('Increase perceived value in booking confirmations');
  }

  // 0 calls without DM = good
  if (callsWithoutDM.length === 0 && callDetails.length > 0) {
    positives.push('All calls had a decision maker present — excellent!');
  } else if (metrics.decision_maker_rate < 0.9) {
    problems.push(`${callsWithoutDM.length} call(s) had no decision maker present`);
    actions.push('Confirm decision maker attendance during scheduling');
    const names = callsWithoutDM.map(c => c.contact_name).filter(Boolean);
    if (names.length > 0) {
      actions.push(`Follow up with: ${names.join(', ')} — reschedule with DM present`);
    }
  }

  // 0 calls without webinar = good
  if (callsWithoutWebinar.length === 0 && callDetails.length > 0) {
    positives.push('All prospects watched the webinar — great prep!');
  } else if (metrics.webinar_rate < 0.8) {
    problems.push(`${callsWithoutWebinar.length} call(s) had prospects who didn't watch the webinar`);
    actions.push('Make webinar completion a prerequisite before booking');
  }

  if (followUpCalls.length > 0 && metrics.follow_up_rate > 0.4) {
    problems.push(`${followUpCalls.length} call(s) ended in follow-up`);
    actions.push('Push urgency harder — ask "What happens if you don\'t act on this now?"');
  }

  // Flag if <60% of scheduled calls are PCCd
  if (pccScheduledRate !== undefined && pccScheduledRate < 0.6) {
    problems.push(`Only ${(pccScheduledRate * 100).toFixed(0)}% of scheduled calls are PCCd (target: 60%+)`);
    actions.push('Increase PCC completion — call every scheduled prospect before their appointment');
  } else if (pccScheduledRate !== undefined && pccScheduledRate >= 0.6) {
    positives.push(`${(pccScheduledRate * 100).toFixed(0)}% of scheduled calls are PCCd — solid outreach!`);
  }

  // Cumulative insights
  if (cumulative.webinar_win_rate > cumulative.non_webinar_win_rate * 1.2) {
    actions.push(`Webinar watchers close at ${(cumulative.webinar_win_rate * 100).toFixed(0)}% vs ${(cumulative.non_webinar_win_rate * 100).toFixed(0)}% — enforce webinar watching`);
  }

  if (problems.length === 0) {
    const goodActions = positives.length > 0 ? positives : ['Maintain your current approach'];
    goodActions.push('Look for ways to increase deal size');
    goodActions.push('Coach teammates on what\'s working');
    return {
      diagnosis: 'Strong performance across the board',
      explanation: 'Your metrics are healthy. Keep executing your current process consistently.',
      actions: goodActions.slice(0, 5),
    };
  }

  const diagnosis = problems.length === 1 ? problems[0] : `${problems.length} areas need attention`;
  const explanation = problems.join('. ') + '.';

  // Mix positives into actions
  const allActions = [...positives.map(p => `✓ ${p}`), ...actions];

  return { diagnosis, explanation, actions: allActions.slice(0, 6) };
}

export function calculateLeaderboard(entries: ShiftEntry[]): LeaderboardEntry[] {
  const userMap = new Map<string, ShiftEntry[]>();

  for (const entry of entries) {
    const existing = userMap.get(entry.user_id) || [];
    existing.push(entry);
    userMap.set(entry.user_id, existing);
  }

  const leaderboard: LeaderboardEntry[] = [];

  for (const [user_id, userEntries] of userMap) {
    const totalRevenue = userEntries.reduce((sum, e) => sum + (e.revenue_collected || 0), 0);
    const totalWon = userEntries.reduce((sum, e) => sum + e.won, 0);
    const totalOccurred = userEntries.reduce((sum, e) => sum + e.calls_occurred, 0);
    const totalScheduled = userEntries.reduce((sum, e) => sum + e.calls_in_schedule, 0);

    const avgCloseRate = totalOccurred > 0 ? totalWon / totalOccurred : 0;
    const avgShowRate = totalScheduled > 0 ? totalOccurred / totalScheduled : 0;

    const maxRevenue = Math.max(...entries.map(e => e.revenue_collected || 0), 1);
    const normalizedRevenue = totalRevenue / maxRevenue;

    const score = normalizedRevenue * 0.5 + avgCloseRate * 0.3 + avgShowRate * 0.2;

    leaderboard.push({
      user_id,
      user_name: userEntries[0].user_name,
      total_revenue: totalRevenue,
      avg_close_rate: avgCloseRate,
      avg_show_rate: avgShowRate,
      score,
      entries_count: userEntries.length,
    });
  }

  return leaderboard.sort((a, b) => b.score - a.score);
}
