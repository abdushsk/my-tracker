/**
 * Statistics Chart Module (US-071)
 * 30-day progress chart rendering for individual goals
 */

import {
  isGoalCompleted,
  getTodayDateString,
  getDateStringDaysAgo
} from '../../utils/models.js';

// =============================================================================
// 30-Day Progress Chart
// =============================================================================

/**
 * Render the 30-day progress chart for a specific goal
 * @param {Array} goalHistory - History entries for this goal
 * @param {Object} goal - The goal object
 */
export function renderGoal30DayChart(goalHistory, goal) {
  const barsContainer = document.getElementById('progress-chart-bars');
  const labelsContainer = document.getElementById('progress-chart-labels');

  if (!barsContainer || !labelsContainer) return;

  // Generate data for last 30 days
  const chartData = [];
  const today = getTodayDateString();

  // Create a map of date -> history entry
  const historyByDate = {};
  goalHistory.forEach(entry => {
    historyByDate[entry.date] = entry;
  });

  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const dateStr = getDateStringDaysAgo(i);
    const date = new Date(dateStr);
    const dayOfMonth = date.getDate();
    const isToday = dateStr === today;

    let progress = 0;
    let target = goal.target;
    let completed = false;
    let hasData = false;

    if (dateStr === today) {
      // Use current goal data for today
      progress = goal.progress;
      completed = isGoalCompleted(goal);
      hasData = progress > 0 || completed;
    } else if (historyByDate[dateStr]) {
      // Use history data
      const entry = historyByDate[dateStr];
      progress = entry.progress;
      target = entry.target;
      completed = entry.completed;
      hasData = true;
    }

    const percentage = target > 0 ? Math.min(100, (progress / target) * 100) : 0;

    chartData.push({
      date: dateStr,
      dayOfMonth,
      progress,
      target,
      percentage,
      completed,
      hasData,
      isToday
    });
  }

  // Render bars
  barsContainer.innerHTML = chartData.map(day => {
    const barHeight = day.hasData ? Math.max(5, day.percentage) : 0;

    let barClass = 'progress-bar';
    if (day.completed) {
      barClass += ' bar-completed';
    } else if (day.hasData && day.percentage > 0) {
      barClass += ' bar-partial';
    } else {
      barClass += ' bar-missed';
    }

    if (day.isToday) {
      barClass += ' bar-today';
    }

    const tooltipText = day.hasData
      ? `${day.date}: ${Math.round(day.percentage)}%${day.completed ? ' (Completed)' : ''}`
      : `${day.date}: No data`;

    return `
      <div class="progress-bar-container" title="${tooltipText}">
        <div class="${barClass}" style="height: ${barHeight}%"></div>
      </div>
    `;
  }).join('');

  // Render labels (show start, end, and every 5th date in between)
  labelsContainer.innerHTML = chartData.map((day, index) => {
    // Show label for: starting date (0), ending date (29), and every 5th date (5, 10, 15, 20, 25)
    const isStartDate = index === 0;
    const isEndDate = index === 29;
    const isEveryFifth = index > 0 && index < 29 && index % 5 === 0;
    const showLabel = isStartDate || isEndDate || isEveryFifth;

    return `<span class="progress-chart-label ${showLabel ? '' : 'hidden'} ${day.isToday ? 'label-today' : ''}">${day.dayOfMonth}</span>`;
  }).join('');
}
