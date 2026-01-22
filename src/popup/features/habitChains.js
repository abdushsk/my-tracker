/**
 * Habit Chains Feature (US-084)
 * Linked goals that unlock sequentially when parent goals are completed
 */

import { state } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import { launchConfetti } from './celebrations.js';
import {
  CHAIN_STATUS,
  GOAL_TYPES,
  isGoalCompleted,
  isGoalInChain,
  isChainCompleted,
  getChainProgress,
  getGoalsToUnlock,
  canSetChainParent
} from '../../utils/models.js';
import { updateGoal } from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// Chain Indicator Rendering
// =============================================================================

/**
 * US-084: Render chain indicator showing the chain relationship
 * @param {Object} goal - The goal object
 * @param {boolean} isLocked - Whether the goal is currently locked
 * @returns {string} HTML string for chain indicator
 */
export function renderChainIndicator(goal, isLocked) {
  if (!goal.chainParentId) return '';

  const parentGoal = state.goals.find(g => g.id === goal.chainParentId);
  if (!parentGoal) return '';

  const parentCompleted = isGoalCompleted(parentGoal);
  const statusClass = parentCompleted ? 'chain-unlocked' : 'chain-locked';
  const statusIcon = parentCompleted ? '\u2713' : '\u{1F512}';

  return `
    <div class="chain-indicator ${statusClass}">
      <span class="chain-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </span>
      <span class="chain-status">${statusIcon}</span>
      <span class="chain-parent-name">After: ${escapeHtml(parentGoal.title.length > 20 ? parentGoal.title.substring(0, 20) + '...' : parentGoal.title)}</span>
    </div>
  `;
}

/**
 * US-084: Render locked overlay for goals waiting on chain parent
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for locked overlay
 */
export function renderLockedOverlay(goal) {
  const parentGoal = state.goals.find(g => g.id === goal.chainParentId);
  const parentTitle = parentGoal ? parentGoal.title : 'another goal';
  const truncatedTitle = parentTitle.length > 25 ? parentTitle.substring(0, 25) + '...' : parentTitle;

  return `
    <div class="goal-locked-overlay">
      <div class="locked-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <p class="locked-message">Complete "<strong>${escapeHtml(truncatedTitle)}</strong>" to unlock</p>
    </div>
  `;
}

/**
 * US-084: Render chain parent options for the dropdown
 * @param {Object|null} editingGoal - The goal being edited (null for add mode)
 * @returns {string} HTML string of option elements
 */
export function renderChainParentOptions(editingGoal) {
  const availableParents = state.goals.filter(g => {
    // Can't chain to self
    if (editingGoal && g.id === editingGoal.id) return false;
    // Check for cycle prevention (only in edit mode)
    if (editingGoal && !canSetChainParent(editingGoal, g, state.goals)) return false;
    return true;
  });

  if (availableParents.length === 0) {
    return '';
  }

  return availableParents.map(g => {
    const typeIcon = g.type === GOAL_TYPES.TIMER ? '\u23F1' : g.type === GOAL_TYPES.COUNTER ? '#' : '\u2713';
    const truncatedTitle = g.title.length > 30 ? g.title.substring(0, 30) + '...' : g.title;
    return `<option value="${g.id}">${typeIcon} ${truncatedTitle}</option>`;
  }).join('');
}

// =============================================================================
// Chain Logic
// =============================================================================

/**
 * US-084: Unlock chained goals when a parent goal is completed
 * @param {Object} completedGoal - The goal that was just completed
 */
export async function unlockChainedGoals(completedGoal) {
  const goalsToUnlock = getGoalsToUnlock(completedGoal, state.goals);

  if (goalsToUnlock.length === 0) {
    return;
  }

  console.log(`[Chains] Unlocking ${goalsToUnlock.length} chained goal(s) after completing "${completedGoal.title}"`);

  // Update each chained goal's status
  for (const goal of goalsToUnlock) {
    goal.chainStatus = CHAIN_STATUS.UNLOCKED;
    await updateGoal(goal.id, { chainStatus: CHAIN_STATUS.UNLOCKED });

    // Show unlock notification
    showChainUnlockNotification(goal, completedGoal);
  }

  // Check if the entire chain is now completed
  if (isGoalInChain(completedGoal, state.goals)) {
    const chainCompleted = isChainCompleted(completedGoal, state.goals);
    if (chainCompleted) {
      const chainProgress = getChainProgress(completedGoal, state.goals);
      triggerChainCompletionCelebration(completedGoal, chainProgress.total);
    }
  }
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * US-084: Show notification when a chained goal is unlocked
 * @param {Object} unlockedGoal - The goal that was unlocked
 * @param {Object} completedGoal - The parent goal that was completed
 */
export function showChainUnlockNotification(unlockedGoal, completedGoal) {
  // Remove any existing unlock notification
  const existingNotification = document.querySelector('.chain-unlock-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'chain-unlock-notification';
  notification.innerHTML = `
    <div class="chain-unlock-content">
      <div class="chain-unlock-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      </div>
      <div class="chain-unlock-text">
        <span class="chain-unlock-title">Goal Unlocked!</span>
        <span class="chain-unlock-goal">${escapeHtml(unlockedGoal.title)}</span>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });

  // Play unlock sound
  playSound(SOUNDS.ACHIEVEMENT);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * US-084: Trigger celebration when an entire chain is completed
 * @param {Object} anyGoalInChain - Any goal in the completed chain
 * @param {number} chainLength - Number of goals in the chain
 */
export function triggerChainCompletionCelebration(anyGoalInChain, chainLength) {
  console.log(`[Chains] Full chain completed! ${chainLength} goals in chain.`);

  // Enhanced confetti for chain completion
  launchConfetti({
    intensity: 'high',
    duration: 3000
  });

  // Show chain completion notification
  showChainCompletionNotification(chainLength);
}

/**
 * US-084: Show notification when an entire chain is completed
 * @param {number} chainLength - Number of goals in the chain
 */
export function showChainCompletionNotification(chainLength) {
  // Remove any existing notification
  const existingNotification = document.querySelector('.chain-complete-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'chain-complete-notification';
  notification.innerHTML = `
    <div class="chain-complete-content">
      <div class="chain-complete-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          <polyline points="9 11 12 14 22 4"/>
        </svg>
      </div>
      <div class="chain-complete-text">
        <span class="chain-complete-title">Chain Complete!</span>
        <span class="chain-complete-count">${chainLength} linked goals completed</span>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });

  // Play achievement sound
  playSound(SOUNDS.ACHIEVEMENT);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}
