/**
 * Level and XP System Feature (US-083)
 * XP awarding, level progression, and level-up celebrations
 */

import { state } from '../state.js';
import {
  XP_SOURCES,
  isGoalCompleted,
  calculateGoalCompletionXP,
  getPerfectDayXP,
  getAchievementXP,
  getChallengeXP,
  getLevelTitle
} from '../../utils/models.js';
import { addXP, markFirstGoalBonusAwarded } from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// XP Awarding Functions
// =============================================================================

/**
 * Award XP for completing a goal
 * Handles base XP, bonuses, and level-up detection
 * @param {Object} goal - The completed goal
 * @param {boolean} wasJustCompleted - Whether this is a new completion (not re-render)
 */
export async function awardGoalCompletionXP(goal, wasJustCompleted = true) {
  if (!wasJustCompleted) return;

  // Check if this is the first goal completion ever
  const isFirstGoal = !state.xpData.firstGoalBonusAwarded;
  const currentStreak = state.streakData?.currentStreak || 0;

  // Calculate XP
  const xpCalc = calculateGoalCompletionXP(goal, currentStreak, isFirstGoal);

  // Award base XP
  const result = await addXP(
    xpCalc.totalXP,
    XP_SOURCES.GOAL_COMPLETION,
    `Completed: ${goal.title}`,
    { goalId: goal.id, goalType: goal.type }
  );

  // Mark first goal bonus as awarded if applicable
  if (isFirstGoal) {
    await markFirstGoalBonusAwarded();
    state.xpData.firstGoalBonusAwarded = true;
  }

  // Update local state
  if (result.success) {
    state.xpData.totalXP = result.totalXP;
    if (result.leveledUp) {
      state.xpData.currentLevel = result.newLevel;
    }
  }

  // XP toast disabled for cleaner UX
  // showXPToast(xpCalc.totalXP, xpCalc.bonuses);

  // Check for level-up
  if (result.leveledUp) {
    showLevelUpNotification(result.newLevel, result.oldLevel);
  }

  // Check if ALL goals are now completed (perfect day bonus)
  const allCompleted = state.goals.length > 0 && state.goals.every(g => isGoalCompleted(g));
  if (allCompleted) {
    await awardPerfectDayXP();
  }
}

/**
 * Award XP for a perfect day (all goals completed)
 */
export async function awardPerfectDayXP() {
  const xp = getPerfectDayXP();
  const result = await addXP(
    xp,
    XP_SOURCES.PERFECT_DAY,
    'Perfect day - all goals completed!',
    null
  );

  if (result.success) {
    state.xpData.totalXP = result.totalXP;
    if (result.leveledUp) {
      state.xpData.currentLevel = result.newLevel;
      showLevelUpNotification(result.newLevel, result.oldLevel);
    }
    // XP toast disabled for cleaner UX
    // showXPToast(xp, [{ type: 'perfect_day', amount: xp, description: 'Perfect Day!' }]);
  }
}

/**
 * Award XP for unlocking an achievement
 * @param {string} achievementId - The unlocked achievement ID
 */
export async function awardAchievementXP(achievementId) {
  const xp = getAchievementXP();
  const result = await addXP(
    xp,
    XP_SOURCES.ACHIEVEMENT,
    `Achievement unlocked`,
    { achievementId }
  );

  if (result.success) {
    state.xpData.totalXP = result.totalXP;
    if (result.leveledUp) {
      state.xpData.currentLevel = result.newLevel;
      // Delay level-up notification to not overlap with achievement notification
      setTimeout(() => {
        showLevelUpNotification(result.newLevel, result.oldLevel);
      }, 2000);
    }
  }
}

/**
 * Award XP for completing a daily challenge
 * @param {string} difficulty - Challenge difficulty
 */
export async function awardChallengeXP(difficulty) {
  const xp = getChallengeXP(difficulty);
  const result = await addXP(
    xp,
    XP_SOURCES.CHALLENGE,
    `Daily challenge completed`,
    { difficulty }
  );

  if (result.success) {
    state.xpData.totalXP = result.totalXP;
    if (result.leveledUp) {
      state.xpData.currentLevel = result.newLevel;
      setTimeout(() => {
        showLevelUpNotification(result.newLevel, result.oldLevel);
      }, 2000);
    }
    // XP toast disabled for cleaner UX
    // showXPToast(xp, [{ type: 'challenge', amount: xp, description: 'Challenge Complete!' }]);
  }
}

// =============================================================================
// XP and Level Notifications
// =============================================================================

/**
 * Show XP gain toast notification
 * @param {number} totalXP - Total XP gained
 * @param {Array} bonuses - Array of bonus entries
 */
export function showXPToast(totalXP, bonuses = []) {
  // Remove existing XP toast
  const existingToast = document.querySelector('.xp-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const bonusText = bonuses.length > 0
    ? bonuses.map(b => `+${b.amount} ${b.description}`).join(' ')
    : '';

  const toast = document.createElement('div');
  toast.className = 'xp-toast';
  toast.innerHTML = `
    <div class="xp-toast-content">
      <span class="xp-toast-icon">+</span>
      <span class="xp-toast-amount">${totalXP} XP</span>
      ${bonusText ? `<span class="xp-toast-bonus">${bonusText}</span>` : ''}
    </div>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

/**
 * Show level-up celebration notification
 * @param {number} newLevel - New level reached
 * @param {number} oldLevel - Previous level
 */
export function showLevelUpNotification(newLevel, oldLevel) {
  const levelInfo = getLevelTitle(newLevel);

  // Remove existing level-up notification
  const existing = document.querySelector('.level-up-notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-icon">${levelInfo.icon}</div>
      <div class="level-up-text">
        <span class="level-up-label">Level Up!</span>
        <span class="level-up-level">Level ${newLevel}</span>
        <span class="level-up-title">${levelInfo.title}</span>
      </div>
    </div>
    <div class="level-up-confetti"></div>
  `;

  document.body.appendChild(notification);

  // Play level-up sound
  playSound(SOUNDS.ACHIEVEMENT);

  // Trigger level-up confetti
  triggerLevelUpConfetti();

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 4000);
}

/**
 * Trigger level-up confetti animation
 */
export function triggerLevelUpConfetti() {
  // Check if reduced motion is preferred
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Create confetti particles
  const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  const container = document.createElement('div');
  container.className = 'level-up-confetti-container';

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'level-confetti-particle';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.animationDuration = `${1 + Math.random() * 1}s`;
    container.appendChild(confetti);
  }

  document.body.appendChild(container);

  // Remove after animation
  setTimeout(() => {
    container.remove();
  }, 3000);
}
