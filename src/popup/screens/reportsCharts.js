/**
 * Reports Charts and Heatmaps
 * US-047: Weekly Chart
 * US-049: Activity Timeline Heatmap
 */

import {
  getActivityLog
} from '../../utils/storage.js';
import {
  getTodayDateString,
  getDateStringDaysAgo,
  groupHistoryByDate,
  getActivityByHourForDateRange,
  isGoalCompleted
} from '../../utils/models.js';

// =============================================================================
// Weekly Chart
// =============================================================================

/**
 * Render the weekly chart showing completion rates for the last 7 days
 * US-047: Weekly Chart Implementation
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 */
export function renderWeeklyChart(history, currentGoals) {
  const chartBarsContainer = document.getElementById('chart-bars');
  const chartLabelsContainer = document.getElementById('chart-labels');

  if (!chartBarsContainer || !chartLabelsContainer) return;

  // Calculate chart data for last 7 days
  const chartData = calculateWeeklyChartData(history, currentGoals);

  // Day abbreviations (Mon-Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Clear existing content
  chartBarsContainer.innerHTML = '';
  chartLabelsContainer.innerHTML = '';

  // Render bars and labels
  chartData.forEach((dayData, index) => {
    // Create bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';

    // Create the bar
    const bar = document.createElement('div');
    bar.className = 'chart-bar';

    // Apply color class based on percentage
    if (dayData.percentage === 0) {
      bar.classList.add('chart-bar-empty');
    } else if (dayData.percentage >= 80) {
      bar.classList.add('chart-bar-excellent');
    } else if (dayData.percentage >= 50) {
      bar.classList.add('chart-bar-moderate');
    } else {
      bar.classList.add('chart-bar-low');
    }

    // Set bar height based on percentage (minimum 4px for visibility)
    const barHeight = dayData.percentage > 0 ? Math.max(4, dayData.percentage) : 0;
    bar.style.height = `${barHeight}%`;

    // Add tooltip with details
    bar.setAttribute('title', `${dayData.completed}/${dayData.total} completed (${Math.round(dayData.percentage)}%)`);
    bar.setAttribute('data-percentage', Math.round(dayData.percentage));

    barContainer.appendChild(bar);
    chartBarsContainer.appendChild(barContainer);

    // Create label
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = dayNames[dayData.dayOfWeek];

    // Mark today's label
    if (dayData.isToday) {
      label.classList.add('chart-label-today');
    }

    chartLabelsContainer.appendChild(label);
  });
}

/**
 * Calculate chart data for the last 7 days
 * US-047: Data calculation for weekly chart
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Array} Array of objects with completed, total, percentage, dayOfWeek, isToday
 */
function calculateWeeklyChartData(history, currentGoals) {
  const today = getTodayDateString();
  const chartData = [];

  // Group history by date for efficient lookup
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (starting from 6 days ago to today)
  // Use getDateStringDaysAgo for consistent local timezone handling
  for (let i = 6; i >= 0; i--) {
    const dateStr = getDateStringDaysAgo(i);
    // Parse with noon time to avoid timezone edge cases
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to Mon=0, Sun=6

    let completed = 0;
    let total = 0;

    if (dateStr === today) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    const percentage = total > 0 ? (completed / total) * 100 : 0;

    chartData.push({
      date: dateStr,
      dayOfWeek,
      completed,
      total,
      percentage,
      isToday: dateStr === today
    });
  }

  return chartData;
}

// =============================================================================
// Activity Heatmap
// =============================================================================

/**
 * Render the activity heatmap showing when user worked on goals
 * US-049: Activity Timeline - Heatmap
 *
 * Display grid: rows = days (last 7), columns = hours (0-23)
 * Cell color intensity = activity level
 * Focus on timer goals showing when user worked
 */
export async function renderActivityHeatmap() {
  const gridContainer = document.getElementById('heatmap-grid');
  const hourLabelsContainer = document.getElementById('heatmap-hour-labels');
  const dayLabelsContainer = document.getElementById('heatmap-day-labels');

  if (!gridContainer || !hourLabelsContainer || !dayLabelsContainer) return;

  // Get activity log data
  const activityLog = await getActivityLog();

  // Calculate date range (last 7 days)
  const today = getTodayDateString();
  const startDate = getDateStringDaysAgo(6);

  // Get activity data grouped by date and hour
  const activityByDateAndHour = getActivityByHourForDateRange(activityLog, null, startDate, today);

  // Find max activity for normalization (for color intensity)
  let maxActivity = 0;
  Object.values(activityByDateAndHour).forEach(dayData => {
    dayData.forEach(hourData => {
      // For timer goals, use duration; for others, use count
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;
      if (activityLevel > maxActivity) {
        maxActivity = activityLevel;
      }
    });
  });

  // Render hour labels (showing every 3rd hour for compact display)
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];
  hourLabelsContainer.innerHTML = hourLabels.map(hour => {
    const displayHour = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
    return `<span class="heatmap-hour-label" style="grid-column: ${hour + 1}">${displayHour}</span>`;
  }).join('');

  // Generate list of dates for last 7 days (oldest to newest)
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(getDateStringDaysAgo(i));
  }

  // Render day labels with 2-letter uppercase abbreviations
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  dayLabelsContainer.innerHTML = dates.map(dateStr => {
    // Parse with noon time to avoid timezone edge cases
    const date = new Date(dateStr + 'T12:00:00');
    const dayName = dayNames[date.getDay()];
    const isToday = dateStr === today;
    return `<span class="heatmap-day-label${isToday ? ' heatmap-day-today' : ''}">${dayName}</span>`;
  }).join('');

  // Render heatmap grid (7 rows x 24 columns)
  let gridHTML = '';
  dates.forEach((dateStr, rowIndex) => {
    const dayData = activityByDateAndHour[dateStr] || [];

    for (let hour = 0; hour < 24; hour++) {
      const hourData = dayData[hour] || { count: 0, duration: 0 };

      // Calculate activity level (use duration for timers, count for others)
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;

      // Normalize to 0-4 scale for color intensity
      const intensityLevel = maxActivity > 0
        ? Math.min(4, Math.ceil((activityLevel / maxActivity) * 4))
        : 0;

      // Format tooltip text
      const tooltipParts = [];
      if (hourData.count > 0) {
        tooltipParts.push(`${hourData.count} action${hourData.count !== 1 ? 's' : ''}`);
      }
      if (hourData.duration > 0) {
        const minutes = Math.round(hourData.duration / 60);
        tooltipParts.push(`${minutes} min`);
      }
      const tooltipText = tooltipParts.length > 0
        ? tooltipParts.join(', ')
        : 'No activity';

      const hourDisplay = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      // Parse with noon time to avoid timezone edge cases
      const date = new Date(dateStr + 'T12:00:00');
      const dayDisplay = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      gridHTML += `<div class="heatmap-cell level-${intensityLevel}"
        data-date="${dateStr}"
        data-hour="${hour}"
        data-tooltip="${dayDisplay}, ${hourDisplay}: ${tooltipText}"
        title="${dayDisplay}, ${hourDisplay}: ${tooltipText}"></div>`;
    }
  });

  gridContainer.innerHTML = gridHTML;
}
