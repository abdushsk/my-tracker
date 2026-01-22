/**
 * Reports Streak Calculations
 * US-045: Streak Counter Implementation
 */

import { state } from '../state.js';
import {
  getHistory,
  getStreakData,
  saveStreakData
} from '../../utils/storage.js';
import {
  getTodayDateString,
  getDateStringDaysAgo,
  groupHistoryByDate,
  isGoalCompleted
} from '../../utils/models.js';
import { checkAchievements } from '../features/achievements.js';

// =============================================================================
// Streak Display
// =============================================================================

/**
 * Calculate and update streak data
 * US-045: Streak Counter Implementation
 *
 * Streak = consecutive days where ALL daily goals were completed
 * Breaks if any goal was missed on a day
 */
export async function updateStreakDisplay() {
  const currentStreakEl = document.getElementById('current-streak-value');
  const bestStreakEl = document.getElementById('best-streak-value');
  const currentStreakCard = document.querySelector('.current-streak-card');

  if (!currentStreakEl || !bestStreakEl) return;

  // Get history data
  const history = await getHistory();

  // Calculate streak from history
  const { currentStreak, bestStreak } = calculateStreakFromHistory(history, state.goals);

  // Update the display
  currentStreakEl.textContent = currentStreak;
  bestStreakEl.textContent = bestStreak;

  // Update the active class on the current streak card
  if (currentStreakCard) {
    if (currentStreak > 0) {
      currentStreakCard.classList.add('active');
    } else {
      currentStreakCard.classList.remove('active');
    }
  }

  // Update state and save to storage if streak changed
  const storedStreakData = await getStreakData();
  if (storedStreakData.currentStreak !== currentStreak || storedStreakData.bestStreak !== bestStreak) {
    const newStreakData = {
      currentStreak,
      bestStreak,
      lastCompletionDate: currentStreak > 0 ? getTodayDateString() : storedStreakData.lastCompletionDate
    };
    state.streakData = newStreakData;
    await saveStreakData(newStreakData);

    // US-080: Check streak-related achievements when streak is updated
    checkAchievements('streak_update', { streak: currentStreak, bestStreak });
  }
}

// =============================================================================
// Streak Calculation
// =============================================================================

/**
 * Calculate streak from history data
 * US-045: Core streak calculation logic
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with currentStreak and bestStreak numbers
 */
export function calculateStreakFromHistory(history, currentGoals) {
  const today = getTodayDateString();

  // Group history by date
  const historyByDate = groupHistoryByDate(history);

  // Build list of all unique dates in history, sorted in descending order (most recent first)
  const allDates = [...new Set(history.map(entry => entry.date))].sort().reverse();

  // Calculate whether today is fully completed (all daily goals)
  const dailyGoals = currentGoals.filter(goal => goal.timeframe === 'daily');
  const todayFullyCompleted = dailyGoals.length > 0 &&
    dailyGoals.every(goal => isGoalCompleted(goal));

  // Build a map of date -> whether ALL daily goals were completed that day
  const completionByDate = {};

  // Process historical data
  for (const [date, entries] of Object.entries(historyByDate)) {
    // Only consider daily goals for streak calculation
    const dailyEntries = entries.filter(entry => entry.timeframe === 'daily');
    if (dailyEntries.length === 0) {
      // No daily goals on this day - skip it
      continue;
    }
    // All daily goals must be completed
    const allCompleted = dailyEntries.every(entry => entry.completed);
    completionByDate[date] = allCompleted;
  }

  // Add today's status if there are daily goals
  if (dailyGoals.length > 0) {
    completionByDate[today] = todayFullyCompleted;
  }

  // Calculate current streak (consecutive days from today or yesterday going backwards)
  let currentStreak = 0;
  let checkDate = new Date();

  // If today isn't fully completed yet, start checking from yesterday
  // This allows users to maintain streak even if they haven't finished today yet
  if (!todayFullyCompleted) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive completed days
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];

    // If we have data for this date and it was completed, increment streak
    if (completionByDate[dateStr] === true) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (completionByDate[dateStr] === false) {
      // Day exists in data but wasn't completed - streak breaks
      break;
    } else {
      // No data for this date - assume no daily goals existed, check previous day
      // But limit how far back we go (90 days max)
      const daysDiff = Math.floor((Date.now() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // If today is fully completed, add it to the streak if we didn't count it yet
  if (todayFullyCompleted && !completionByDate[getDateStringDaysAgo(1)]) {
    // Today is the start of a new streak
    currentStreak = Math.max(currentStreak, 1);
  }

  // Calculate best streak ever
  // Go through all dates in order and find the longest consecutive run
  let bestStreak = currentStreak;
  let tempStreak = 0;

  // Get all dates with completion data, sorted ascending
  const sortedDates = Object.keys(completionByDate).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (completionByDate[date]) {
      // Check if this is consecutive with previous day
      if (i > 0) {
        const prevDate = sortedDates[i - 1];
        const currentDateObj = new Date(date);
        const prevDateObj = new Date(prevDate);
        const dayDiff = Math.floor((currentDateObj - prevDateObj) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1 && completionByDate[prevDate]) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Also compare with stored best streak (in case history was cleared)
  const storedBestStreak = state.streakData?.bestStreak || 0;
  bestStreak = Math.max(bestStreak, storedBestStreak);

  return { currentStreak, bestStreak };
}
