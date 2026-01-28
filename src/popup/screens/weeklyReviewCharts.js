/**
 * Weekly Review Charts and Comparisons
 * US-072: Daily breakdown and week comparison
 */

import { state } from '../state.js';
import {
  isGoalCompleted,
  getTodayDateString,
  getWeekStartDateString,
  filterHistoryByDateRange,
  groupHistoryByDate
} from '../../utils/models.js';
import { getIcon } from '../utils/icons.js';

// =============================================================================
// Daily Breakdown Chart
// =============================================================================

/**
 * Render the daily breakdown chart for the week
 * @param {Array} history - History entries
 * @param {Array} currentGoals - Current goals array
 */
export function renderDailyBreakdown(history, currentGoals) {
  const breakdownEl = document.getElementById('daily-breakdown');
  if (!breakdownEl) return;

  const today = getTodayDateString();
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (Mon-Sun of current week)
  const weekStart = getWeekStartDateString();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = '<div class="breakdown-bars">';

  // Generate 7 days from week start
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart + 'T00:00:00');
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    let completed = 0;
    let total = 0;
    let percentage = 0;

    if (isToday) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else if (!isFuture) {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    percentage = total > 0 ? (completed / total) * 100 : 0;

    // Determine bar color class
    let barColorClass = 'bar-empty';
    if (!isFuture && total > 0) {
      if (percentage >= 80) {
        barColorClass = 'bar-excellent';
      } else if (percentage >= 50) {
        barColorClass = 'bar-good';
      } else if (percentage > 0) {
        barColorClass = 'bar-low';
      }
    }

    html += `
      <div class="breakdown-day ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
        <div class="breakdown-bar-wrapper">
          <div class="breakdown-bar ${barColorClass}" style="height: ${percentage}%"></div>
          ${!isFuture ? `<span class="breakdown-hover-value">${Math.round(percentage)}%</span>` : ''}
        </div>
        <span class="breakdown-label">${dayNames[i]}</span>
      </div>
    `;
  }

  html += '</div>';
  breakdownEl.innerHTML = html;
}

// =============================================================================
// Week Comparison
// =============================================================================

/**
 * Update the week-over-week comparison
 * @param {Array} history - History entries
 */
export function updateWeekComparison(history) {
  const comparisonCardEl = document.getElementById('comparison-card');
  if (!comparisonCardEl) return;

  // Calculate this week's stats
  const today = getTodayDateString();
  const thisWeekStart = getWeekStartDateString();
  const thisWeekHistory = filterHistoryByDateRange(history, thisWeekStart, today);
  const thisWeekPast = thisWeekHistory.filter(entry => entry.date !== today);

  let thisWeekCompleted = thisWeekPast.filter(entry => entry.completed).length;
  let thisWeekTotal = thisWeekPast.length;

  // Add today's data from current goals
  const todayCompleted = state.goals.filter(goal => isGoalCompleted(goal)).length;
  thisWeekCompleted += todayCompleted;
  thisWeekTotal += state.goals.length;

  // Calculate previous week's stats
  const prevWeekStart = new Date(thisWeekStart + 'T00:00:00');
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

  const prevWeekEnd = new Date(thisWeekStart + 'T00:00:00');
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

  const prevWeekHistory = filterHistoryByDateRange(history, prevWeekStartStr, prevWeekEndStr);
  const prevWeekCompleted = prevWeekHistory.filter(entry => entry.completed).length;
  const prevWeekTotal = prevWeekHistory.length;

  // Calculate rates
  const thisWeekRate = thisWeekTotal > 0 ? (thisWeekCompleted / thisWeekTotal) * 100 : 0;
  const prevWeekRate = prevWeekTotal > 0 ? (prevWeekCompleted / prevWeekTotal) * 100 : 0;

  // Calculate difference
  const rateDiff = thisWeekRate - prevWeekRate;
  const isImproved = rateDiff > 0;
  const isDeclined = rateDiff < 0;

  let comparisonHtml = '';

  if (prevWeekTotal === 0) {
    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-message">No data from previous week</div>
      </div>
    `;
  } else {
    const diffIcon = isImproved ? getIcon('trending-up', 20) : isDeclined ? getIcon('trending-down', 20) : getIcon('arrow-right', 20);
    const diffClass = isImproved ? 'improved' : isDeclined ? 'declined' : 'same';
    const diffText = isImproved
      ? `+${Math.round(Math.abs(rateDiff))}% improvement`
      : isDeclined
        ? `-${Math.round(Math.abs(rateDiff))}% from last week`
        : 'Same as last week';

    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-icon">${diffIcon}</div>
        <div class="comparison-stats">
          <div class="comparison-diff ${diffClass}">${diffText}</div>
          <div class="comparison-detail">
            This week: ${Math.round(thisWeekRate)}% vs Last week: ${Math.round(prevWeekRate)}%
          </div>
        </div>
      </div>
    `;
  }

  comparisonCardEl.innerHTML = comparisonHtml;
}
