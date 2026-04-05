import { ShiftEntry, Metrics, Insight, AIInsight, LeaderboardEntry, CallDetail } from './types';

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
  };
}

export function generateInsights(metrics: Metrics): Insight[] {
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

  return insights;
}

export function generateAIInsight(metrics: Metrics, callDetails: CallDetail[]): AIInsight {
  const problems: string[] = [];
  const actions: string[] = [];

  // Analyze per-call data
  const callsWithoutDM = callDetails.filter(c => !c.decision_maker_present);
  const callsWithoutWebinar = callDetails.filter(c => !c.webinar_watched);
  const lostCalls = callDetails.filter(c => c.outcome === 'lost');
  const followUpCalls = callDetails.filter(c => c.outcome === 'follow_up');

  if (metrics.close_rate < 0.3) {
    problems.push('Your close rate is below 30%');
    actions.push('Focus on closing during the call — avoid deferring to follow-ups');

    if (lostCalls.length > 0) {
      const lossNotes = lostCalls
        .filter(c => c.loss_notes)
        .map(c => c.loss_notes);
      if (lossNotes.length > 0) {
        actions.push('Review your loss patterns — recurring themes in your notes suggest areas to drill');
      }
    }
  }

  if (metrics.show_rate < 0.7) {
    problems.push('More than 30% of scheduled calls are not occurring');
    actions.push('Send confirmation messages 24h and 1h before each call');
    actions.push('Increase perceived value in booking confirmations');
  }

  if (metrics.decision_maker_rate < 0.9) {
    problems.push(`${callsWithoutDM.length} call(s) had no decision maker present`);
    actions.push('Confirm decision maker attendance during scheduling');
    actions.push('Ask "Who else needs to be involved in this decision?" when booking');

    if (callsWithoutDM.length > 0) {
      const names = callsWithoutDM.map(c => c.contact_name).filter(Boolean);
      if (names.length > 0) {
        actions.push(`Follow up with: ${names.join(', ')} — reschedule with DM present`);
      }
    }
  }

  if (metrics.webinar_rate < 0.8) {
    problems.push(`${callsWithoutWebinar.length} call(s) had prospects who didn't watch the webinar`);
    actions.push('Make webinar completion a prerequisite before booking');
    actions.push('Send a short recap for those who skip the webinar');
  }

  if (followUpCalls.length > 0 && metrics.follow_up_rate > 0.4) {
    problems.push(`${followUpCalls.length} call(s) ended in follow-up instead of a decision`);
    actions.push('Push urgency harder — ask "What happens if you don\'t act on this now?"');
    actions.push('Use micro-commitments during the call to build toward a close');
  }

  if (problems.length === 0) {
    return {
      diagnosis: 'Strong performance across the board',
      explanation: 'Your metrics are healthy. Keep executing your current process consistently.',
      actions: ['Maintain your current approach', 'Look for ways to increase deal size', 'Coach teammates on what\'s working'],
    };
  }

  const diagnosis = problems.length === 1
    ? problems[0]
    : `${problems.length} areas need attention`;

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
