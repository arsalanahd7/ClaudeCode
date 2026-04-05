import { ShiftEntry, Metrics, Insight, AIInsight, LeaderboardEntry, CumulativeStats, CallDetail, HistoricalCall } from './types';

export function calculateMetrics(entry: ShiftEntry): Metrics {
  const co = entry.calls_occurred || 1;
  const cs = entry.calls_in_schedule || 1;
  const nonOccurred = entry.no_shows + entry.reschedules + entry.cancellations;

  return {
    close_rate: entry.one_calls / co,
    follow_up_rate: entry.follow_ups / co,
    show_rate: co / cs,
    non_occurred_rate: nonOccurred / cs,
    decision_maker_rate: entry.decision_maker_calls / co,
    webinar_rate: entry.webinar_watched_calls / co,
    pcc_rate: entry.pcced_calls / co,
    one_call_rate: entry.one_calls / co,
  };
}

export function calculateCumulativeStats(
  entries: ShiftEntry[],
  historicalCalls: HistoricalCall[]
): CumulativeStats {
  // Aggregate from shift entries
  let totalRevenue = 0;
  let totalCallsOccurred = 0;
  let totalOneCalls = 0;
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
    totalOneCalls += entry.one_calls || 0;
    totalEnrollments += entry.enrollments || 0;
    totalPcced += entry.pcced_calls || 0;
    totalNoShows += entry.no_shows || 0;
    totalReschedules += entry.reschedules || 0;
    totalCancellations += entry.cancellations || 0;

    if (entry.call_details) {
      for (const call of entry.call_details) {
        if (call.webinar_watched) {
          webinarTotal++;
          if (call.outcome === 'one') webinarWins++;
        } else {
          nonWebinarTotal++;
          if (call.outcome === 'one') nonWebinarWins++;
        }
        if (call.decision_maker_present) {
          dmTotal++;
          if (call.outcome === 'one') dmWins++;
        } else {
          nonDmTotal++;
          if (call.outcome === 'one') nonDmWins++;
        }
      }
    }
  }

  // Add historical calls
  for (const call of historicalCalls) {
    totalRevenue += call.revenue || 0;
    totalCallsOccurred++;
    if (call.outcome === 'one') totalOneCalls++;
    if (call.enrolled) totalEnrollments++;
    if (call.pcced) totalPcced++;

    if (call.webinar_watched) {
      webinarTotal++;
      if (call.outcome === 'one') webinarWins++;
    } else {
      nonWebinarTotal++;
      if (call.outcome === 'one') nonWebinarWins++;
    }
    if (call.decision_maker_present) {
      dmTotal++;
      if (call.outcome === 'one') dmWins++;
    } else {
      nonDmTotal++;
      if (call.outcome === 'one') nonDmWins++;
    }
  }

  return {
    total_revenue: totalRevenue,
    total_calls_occurred: totalCallsOccurred,
    total_one_calls: totalOneCalls,
    total_enrollments: totalEnrollments,
    avg_aov: totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0,
    avg_close_rate: totalCallsOccurred > 0 ? totalOneCalls / totalCallsOccurred : 0,
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
  let cutoff: Date;

  switch (filter) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'year':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return entries;
  }

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
  let cutoff: Date;

  switch (filter) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'year':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return calls;
  }

  return calls.filter((c) => new Date(c.call_date) >= cutoff);
}

export function generateInsights(metrics: Metrics, cumulative: CumulativeStats): Insight[] {
  const insights: Insight[] = [];

  if (metrics.close_rate < 0.3) {
    insights.push({ flag: 'Focus on closing on-call', severity: 'critical' });
  }
  if (metrics.show_rate < 0.7) {
    insights.push({ flag: 'Improve reminders / lead prep', severity: 'critical' });
  }
  if (metrics.decision_maker_rate < 0.9) {
    insights.push({ flag: 'Always involve decision makers', severity: 'warning' });
  }
  if (metrics.webinar_rate < 0.8) {
    insights.push({ flag: 'Ensure prospects watch webinar', severity: 'warning' });
  }
  if (metrics.follow_up_rate > 0.5) {
    insights.push({ flag: 'High follow-up ratio — push for on-call decisions', severity: 'warning' });
  }
  if (metrics.non_occurred_rate > 0.3) {
    insights.push({ flag: 'High non-occurred rate — review scheduling process', severity: 'warning' });
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

export function generateAIInsight(metrics: Metrics, callDetails: CallDetail[], cumulative: CumulativeStats): AIInsight {
  const problems: string[] = [];
  const actions: string[] = [];

  const callsWithoutDM = callDetails.filter(c => !c.decision_maker_present);
  const callsWithoutWebinar = callDetails.filter(c => !c.webinar_watched);
  const followUpCalls = callDetails.filter(c => c.outcome === 'follow_up');
  const pccedCalls = callDetails.filter(c => c.pcced);

  if (metrics.close_rate < 0.3) {
    problems.push('Your close rate is below 30%');
    actions.push('Focus on closing during the call — avoid deferring to follow-ups');
  }

  if (metrics.show_rate < 0.7) {
    problems.push('More than 30% of scheduled calls are not occurring');
    actions.push('Send confirmation messages 24h and 1h before each call');
    actions.push('Increase perceived value in booking confirmations');
  }

  if (metrics.decision_maker_rate < 0.9) {
    problems.push(`${callsWithoutDM.length} call(s) had no decision maker present`);
    actions.push('Confirm decision maker attendance during scheduling');
    const names = callsWithoutDM.map(c => c.contact_name).filter(Boolean);
    if (names.length > 0) {
      actions.push(`Follow up with: ${names.join(', ')} — reschedule with DM present`);
    }
  }

  if (metrics.webinar_rate < 0.8) {
    problems.push(`${callsWithoutWebinar.length} call(s) had prospects who didn't watch the webinar`);
    actions.push('Make webinar completion a prerequisite before booking');
  }

  if (followUpCalls.length > 0 && metrics.follow_up_rate > 0.4) {
    problems.push(`${followUpCalls.length} call(s) ended in follow-up`);
    actions.push('Push urgency harder — ask "What happens if you don\'t act on this now?"');
  }

  if (pccedCalls.length > 0) {
    problems.push(`${pccedCalls.length} call(s) were PCCed`);
    actions.push('Review PCC patterns — are they happening with specific lead types?');
  }

  // Cumulative insights
  if (cumulative.webinar_win_rate > cumulative.non_webinar_win_rate * 1.2) {
    actions.push(`Webinar watchers close at ${(cumulative.webinar_win_rate * 100).toFixed(0)}% vs ${(cumulative.non_webinar_win_rate * 100).toFixed(0)}% — enforce webinar watching`);
  }

  if (problems.length === 0) {
    return {
      diagnosis: 'Strong performance across the board',
      explanation: 'Your metrics are healthy. Keep executing your current process consistently.',
      actions: ['Maintain your current approach', 'Look for ways to increase deal size', 'Coach teammates on what\'s working'],
    };
  }

  const diagnosis = problems.length === 1 ? problems[0] : `${problems.length} areas need attention`;
  const explanation = problems.join('. ') + '.';

  return { diagnosis, explanation, actions: actions.slice(0, 5) };
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
    const totalOne = userEntries.reduce((sum, e) => sum + e.one_calls, 0);
    const totalOccurred = userEntries.reduce((sum, e) => sum + e.calls_occurred, 0);
    const totalScheduled = userEntries.reduce((sum, e) => sum + e.calls_in_schedule, 0);

    const avgCloseRate = totalOccurred > 0 ? totalOne / totalOccurred : 0;
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
