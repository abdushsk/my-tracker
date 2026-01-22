/**
 * Achievements Feature (US-080)
 * Achievement badges, progress tracking, and unlock notifications
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { launchConfetti } from './celebrations.js';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
  getAchievementProgressPercentage,
  isGoalCompleted,
  GOAL_TYPES,
  groupHistoryByDate
} from '../../utils/models.js';
import {
  getHistory,
  getActivityLog,
  updateAchievement,
  unlockAchievement
} from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  attachNavigationListeners: null,
  awardAchievementXP: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerAchievementsCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Achievement Screen Rendering
// =============================================================================

/**
 * Render the Achievements screen
 * Shows all achievements (locked and unlocked) with progress indicators
 */
export function renderAchievementsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.ACHIEVEMENTS]);
  if (!screen) return;

  // Group achievements by category
  const achievementsByCategory = {};
  for (const category of Object.values(ACHIEVEMENT_CATEGORIES)) {
    achievementsByCategory[category] = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === category);
  }

  // Get unlocked count
  const unlockedCount = state.achievements.filter(a => a.unlockedAt !== null).length;
  const totalCount = ACHIEVEMENT_DEFINITIONS.length;

  // Category labels for display
  const categoryLabels = {
    [ACHIEVEMENT_CATEGORIES.STREAKS]: 'Streaks',
    [ACHIEVEMENT_CATEGORIES.COMPLETIONS]: 'Completions',
    [ACHIEVEMENT_CATEGORIES.MILESTONES]: 'Milestones',
    [ACHIEVEMENT_CATEGORIES.SPECIAL]: 'Special'
  };

  screen.innerHTML = `
    <div class="achievements-screen">
      <header class="screen-header achievements-header">
        <button class="back-btn" data-screen="${SCREENS.REPORTS}" title="Back to Reports">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 class="achievements-title">Achievements</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="achievements-content">
        <!-- Summary Card -->
        <section class="achievements-section summary-section">
          <div class="achievements-summary-card">
            <div class="achievements-summary-icon">🏆</div>
            <div class="achievements-summary-info">
              <span class="achievements-summary-value">${unlockedCount} / ${totalCount}</span>
              <span class="achievements-summary-label">Achievements Unlocked</span>
            </div>
            <div class="achievements-summary-progress">
              <div class="achievements-summary-bar">
                <div class="achievements-summary-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Achievement Categories -->
        ${Object.entries(achievementsByCategory).map(([category, achievements]) => `
          <section class="achievements-section category-section">
            <h2 class="section-title">${categoryLabels[category]}</h2>
            <div class="achievements-grid">
              ${achievements.map(achievement => renderAchievementBadge(achievement)).join('')}
            </div>
          </section>
        `).join('')}
      </main>
    </div>
  `;

  // Attach navigation event listeners
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }
}

/**
 * Render a single achievement badge
 * @param {Object} definition - Achievement definition object
 * @returns {string} HTML string for the badge
 */
export function renderAchievementBadge(definition) {
  const progress = state.achievements.find(a => a.id === definition.id) || { progress: 0, unlockedAt: null };
  const isUnlocked = progress.unlockedAt !== null;
  const progressPercent = getAchievementProgressPercentage(definition.id, progress.progress);
  const target = definition.condition?.target || 1;

  // Format unlock date if unlocked
  let unlockDateStr = '';
  if (isUnlocked && progress.unlockedAt) {
    const date = new Date(progress.unlockedAt);
    unlockDateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return `
    <div class="achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}" data-achievement-id="${definition.id}">
      <div class="achievement-icon ${isUnlocked ? '' : 'grayscale'}">${definition.icon}</div>
      <div class="achievement-info">
        <span class="achievement-title">${definition.title}</span>
        <span class="achievement-description">${definition.description}</span>
        ${isUnlocked ? `
          <span class="achievement-unlock-date">Unlocked ${unlockDateStr}</span>
        ` : `
          <div class="achievement-progress">
            <div class="achievement-progress-bar">
              <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="achievement-progress-text">${progress.progress} / ${target}</span>
          </div>
        `}
      </div>
      ${isUnlocked ? '<div class="achievement-check">✓</div>' : ''}
    </div>
  `;
}

// =============================================================================
// Achievement Checking Logic
// =============================================================================

/**
 * Check and unlock achievements based on current state and trigger
 * Called after goal completions, goal creation, etc.
 * @param {string} trigger - What triggered the check (e.g., 'goal_complete', 'goal_create')
 * @param {Object} context - Additional context about the trigger
 * @returns {Promise<boolean>} Whether any achievement was unlocked
 */
export async function checkAchievements(trigger, context = {}) {
  const history = await getHistory();
  await getActivityLog(); // Keep for future use
  let achievementUnlocked = false;

  for (const achievement of state.achievements) {
    if (achievement.unlockedAt !== null) continue; // Already unlocked

    const definition = getAchievementDefinition(achievement.id);
    if (!definition) continue;

    const condition = definition.condition;
    let newProgress = achievement.progress;
    let shouldUnlock = false;

    switch (condition.type) {
      case 'total_completions':
        // Count total completions from history
        newProgress = history.filter(h => h.completed).length;
        shouldUnlock = newProgress >= condition.target;
        break;

      case 'total_goals_created':
        // Count total goals ever created (active + archived)
        newProgress = state.goals.length + state.archivedGoals.length;
        shouldUnlock = newProgress >= condition.target;
        break;

      case 'streak':
        // Check current or best streak
        const maxStreak = Math.max(
          state.streakData?.currentStreak || 0,
          state.streakData?.bestStreak || 0
        );
        newProgress = maxStreak;
        shouldUnlock = maxStreak >= condition.target;
        break;

      case 'all_goals_completed_day':
        // Check if all goals were completed today
        if (trigger === 'goal_complete' && state.goals.length > 0) {
          const allCompleted = state.goals.every(g => isGoalCompleted(g));
          if (allCompleted) {
            newProgress = 1;
            shouldUnlock = true;
          }
        }
        break;

      case 'perfect_days':
        // Count consecutive perfect days
        newProgress = countPerfectDays(history, state.goals);
        shouldUnlock = newProgress >= condition.target;
        break;

      case 'complete_before_hour':
        // Check if a goal was completed before specified hour
        if (trigger === 'goal_complete') {
          const hourBefore = new Date().getHours();
          if (hourBefore < condition.target) {
            newProgress = 1;
            shouldUnlock = true;
          }
        }
        break;

      case 'complete_after_hour':
        // Check if a goal was completed after specified hour
        if (trigger === 'goal_complete') {
          const hourAfter = new Date().getHours();
          if (hourAfter >= condition.target) {
            newProgress = 1;
            shouldUnlock = true;
          }
        }
        break;

      case 'timer_hours':
        // Check accumulated timer hours for context goal
        if (trigger === 'goal_complete' && context.goal?.type === GOAL_TYPES.TIMER) {
          const timerHours = context.goal.progress / 3600;
          newProgress = Math.floor(timerHours);
          shouldUnlock = timerHours >= condition.target;
        }
        break;

      case 'counter_target':
        // Check if a counter goal reached target
        if (context.goal?.type === GOAL_TYPES.COUNTER) {
          newProgress = Math.max(newProgress, context.goal.progress);
          shouldUnlock = context.goal.progress >= condition.target;
        }
        break;

      case 'all_types_completed_day':
        // Check if user completed all three goal types today
        if (trigger === 'goal_complete') {
          const completedTypes = new Set();
          for (const goal of state.goals) {
            if (isGoalCompleted(goal)) {
              completedTypes.add(goal.type);
            }
          }
          if (completedTypes.size >= 3) {
            newProgress = 1;
            shouldUnlock = true;
          }
        }
        break;

      case 'categories_used':
        // Count distinct categories used in completed goals
        const categoriesUsed = new Set();
        for (const h of history) {
          if (h.completed) {
            const goal = state.goals.find(g => g.id === h.goalId) ||
                         state.archivedGoals.find(g => g.id === h.goalId);
            if (goal?.category) {
              categoriesUsed.add(goal.category);
            }
          }
        }
        newProgress = categoriesUsed.size;
        shouldUnlock = categoriesUsed.size >= condition.target;
        break;
    }

    // Update progress
    if (newProgress !== achievement.progress) {
      achievement.progress = newProgress;
      await updateAchievement(achievement.id, { progress: newProgress });
    }

    // Unlock if condition met
    if (shouldUnlock) {
      achievement.unlockedAt = Date.now();
      await unlockAchievement(achievement.id);
      achievementUnlocked = true;

      // Show unlock notification
      showAchievementUnlockNotification(definition);
    }
  }

  return achievementUnlocked;
}

/**
 * Count consecutive days where all goals were completed
 * @param {Array} history - History entries
 * @param {Array} goals - Current goals
 * @returns {number} Number of consecutive perfect days
 */
export function countPerfectDays(history, goals) {
  if (goals.length === 0) return 0;

  const historyByDate = groupHistoryByDate(history);
  let perfectDays = 0;
  let currentDate = new Date();

  // Check backwards from today
  for (let i = 0; i < 30; i++) { // Check up to 30 days back
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayHistory = historyByDate[dateStr] || [];

    // Check if all goals were completed on this day
    const allCompleted = dayHistory.length > 0 && dayHistory.every(h => h.completed);

    if (allCompleted) {
      perfectDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return perfectDays;
}

// =============================================================================
// Achievement Notifications
// =============================================================================

/**
 * Show achievement unlock notification
 * @param {Object} definition - Achievement definition
 */
export function showAchievementUnlockNotification(definition) {
  // Create toast notification
  const existingToast = document.querySelector('.achievement-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-content">
      <div class="achievement-toast-icon">${definition.icon}</div>
      <div class="achievement-toast-info">
        <span class="achievement-toast-label">Achievement Unlocked!</span>
        <span class="achievement-toast-title">${definition.title}</span>
      </div>
    </div>
  `;

  document.getElementById('app').appendChild(toast);

  // Play sound
  if (state.settings?.soundEnabled) {
    playSound(SOUNDS.COMPLETE);
  }

  // Trigger confetti
  launchConfetti({ intensity: 'high', duration: 2500 });

  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
