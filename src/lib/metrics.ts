import { ShiftEntry, Metrics, Insight, AIInsight, LeaderboardEntry } from './types';

export function calculateMetrics(entry: ShiftEntry): Metrics {
  const cc = entry.calls_completed || 1;
  const cs = entry.calls_scheduled || 1;
  return {
    close_rate: entry.won / cc,
    show_rate: cc / cs,
    follow_up_rate: entry.follow_ups / cc,
    decision_maker_rate: entry.decision_maker_calls / cc,
    webinar_rate: entry.webinar_watched_calls / cc,
  };
}

export function generateInsights(metrics: Metrics, weakStages: string[]): Insight[] {
  const insights: Insight[] = [];

  if (metrics.close_rate < 0.3) {
    insights.push({ flag: 'Low closing performance', severity: 'critical' });
  }
  if (metrics.show_rate < 0.7) {
    insights.push({ flag: 'Low show rate', severity: 'critical' });
  }
  if (metrics.decision_maker_rate < 0.9) {
    insights.push({ flag: 'Missing decision makers on calls', severity: 'warning' });
  }
  if (metrics.webinar_rate < 0.8) {
    insights.push({ flag: 'Low preparation level (webinar watch rate)', severity: 'warning' });
  }
  if (metrics.follow_up_rate > 0.5) {
    insights.push({ flag: 'High follow-up ratio — deals not closing on first attempt', severity: 'warning' });
  }

  for (const stage of weakStages) {
    insights.push({ flag: `Weak stage: ${stage.replace(/_/g, ' ')}`, severity: 'warning' });
  }

  return insights;
}

export function generateAIInsight(metrics: Metrics, weakStages: string[], insights: Insight[]): AIInsight {
  const problems: string[] = [];
  const actions: string[] = [];

  if (metrics.close_rate < 0.3) {
    problems.push('Your close rate is below 30%');
    if (weakStages.includes('closing')) {
      actions.push('Practice trial closes earlier in the conversation to test buyer readiness');
    }
    if (weakStages.includes('objection_handling')) {
      actions.push('Prepare rebuttals for the top 5 objections you hear most often');
    }
    if (!weakStages.includes('closing') && !weakStages.includes('objection_handling')) {
      actions.push('Review your lost deal notes to identify recurring patterns');
    }
  }

  if (metrics.show_rate < 0.7) {
    problems.push('More than 30% of your scheduled calls are not happening');
    actions.push('Send confirmation messages 24h and 1h before each call');
    actions.push('Increase perceived value in booking confirmations — give them a reason to show up');
  }

  if (metrics.decision_maker_rate < 0.9) {
    problems.push('Too many calls are without the decision maker present');
    actions.push('Confirm decision maker attendance during scheduling');
    actions.push('Ask "Who else needs to be on this call to make a decision?" when booking');
  }

  if (metrics.webinar_rate < 0.8) {
    problems.push('Prospects are coming to calls unprepared');
    actions.push('Make webinar completion a prerequisite before booking');
    actions.push('Send a short recap video for those who skip the webinar');
  }

  if (weakStages.includes('urgency')) {
    problems.push('You are struggling to create urgency');
    actions.push('Ask "What happens if you don\'t solve this in the next 90 days?"');
    actions.push('Tie the cost of inaction to their specific pain points');
  }

  if (weakStages.includes('pain')) {
    problems.push('Pain discovery is weak');
    actions.push('Spend more time asking about consequences — "How is this affecting your revenue/team/time?"');
  }

  if (weakStages.includes('rapport')) {
    problems.push('Rapport building needs improvement');
    actions.push('Research prospects beforehand and reference something personal in the first 60 seconds');
  }

  if (weakStages.includes('agenda_control')) {
    problems.push('You are losing control of the call agenda');
    actions.push('Set a clear agenda at the start: "Here\'s what I\'d like to cover — does that work for you?"');
  }

  if (weakStages.includes('commitment')) {
    problems.push('Getting commitment is a weak point');
    actions.push('Use micro-commitments throughout the call to build momentum toward the close');
  }

  if (problems.length === 0) {
    return {
      diagnosis: 'Strong performance across the board',
      explanation: 'Your metrics are healthy. Keep executing your current process consistently.',
      actions: ['Maintain your current approach', 'Look for ways to mentor teammates', 'Focus on increasing deal size'],
    };
  }

  const diagnosis = problems.length === 1
    ? `Primary issue: ${problems[0]}`
    : `Multiple areas need attention: ${problems.length} issues identified`;

  const explanation = problems.join('. ') + '. These are interconnected — improving one often lifts the others.';

  if (actions.length === 0) {
    actions.push('Review your recent call recordings for patterns');
    actions.push('Schedule a coaching session to work on identified weak areas');
  }

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
    const totalRevenue = userEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const totalWon = userEntries.reduce((sum, e) => sum + e.won, 0);
    const totalCompleted = userEntries.reduce((sum, e) => sum + e.calls_completed, 0);
    const totalScheduled = userEntries.reduce((sum, e) => sum + e.calls_scheduled, 0);

    const avgCloseRate = totalCompleted > 0 ? totalWon / totalCompleted : 0;
    const avgShowRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;

    const maxRevenue = Math.max(...entries.map(e => e.revenue || 0), 1);
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
