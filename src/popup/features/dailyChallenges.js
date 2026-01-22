/**
 * Daily Challenges Feature (US-081)
 * Daily challenge generation, progress tracking, and completion handling
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { launchConfetti } from './celebrations.js';
import { awardChallengeXP } from './xpLevels.js';
import {
  CHALLENGE_DIFFICULTY,
  getChallengeDefinition,
  getChallengeProgressPercentage,
  GOAL_TYPES,
  isGoalCompleted,
  createDailyChallengeState,
  selectDailyChallenge,
  getDefaultDailyChallengeData,
  getTodayDateString
} from '../../utils/models.js';
import {
  saveDailyChallenges,
  updateCurrentChallenge,
  completeCurrentChallenge
} from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// Re-export reports section from dedicated module
export { renderChallengeStatsSection } from './challengeReports.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  renderViewGoalsScreen: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerDailyChallengesCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Challenge Initialization
// =============================================================================

/**
 * Initialize or update daily challenge for today
 * Called during app initialization
 * @param {Object|null} existingData - Existing challenge data from storage
 */
export async function initializeDailyChallenge(existingData) {
  const today = getTodayDateString();
  const challengesEnabled = state.settings?.dailyChallengesEnabled !== false;

  // If challenges are disabled, just store existing data
  if (!challengesEnabled) {
    state.dailyChallenges = existingData || getDefaultDailyChallengeData();
    return;
  }

  // Initialize if no data exists
  if (!existingData) {
    const defaultData = getDefaultDailyChallengeData();
    const selectedChallenge = selectDailyChallenge([]);
    defaultData.currentChallenge = createDailyChallengeState(selectedChallenge.id);
    state.dailyChallenges = defaultData;
    await saveDailyChallenges(defaultData);
    return;
  }

  // Check if we need a new challenge for today
  const currentChallenge = existingData.currentChallenge;
  if (!currentChallenge || currentChallenge.date !== today) {
    // Archive yesterday's challenge if it wasn't completed or skipped
    if (currentChallenge && currentChallenge.date !== today && !currentChallenge.completed && !currentChallenge.skipped) {
      existingData.history.push({ ...currentChallenge, expired: true });
    }

    // Reset challenge streak if we missed yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const completedYesterday = existingData.history.some(h => h.date === yesterdayStr && h.completed);

    if (!completedYesterday && existingData.currentChallengeStreak > 0) {
      existingData.currentChallengeStreak = 0;
    }

    // Select a new challenge for today
    const selectedChallenge = selectDailyChallenge(existingData.history);
    existingData.currentChallenge = createDailyChallengeState(selectedChallenge.id);
    await saveDailyChallenges(existingData);
  }

  state.dailyChallenges = existingData;
}

// =============================================================================
// Challenge Card Rendering
// =============================================================================

/**
 * Render the daily challenge card for View Goals screen
 * @returns {string} HTML string for the daily challenge card
 */
export function renderDailyChallengeCard() {
  const challengesEnabled = state.settings?.dailyChallengesEnabled !== false;
  if (!challengesEnabled) return '';

  const challengeData = state.dailyChallenges;
  if (!challengeData || !challengeData.currentChallenge) return '';

  const challenge = challengeData.currentChallenge;
  const definition = getChallengeDefinition(challenge.id);
  if (!definition) return '';

  const isCompleted = challenge.completed;
  const progressPercent = getChallengeProgressPercentage(challenge);
  const canSkip = challenge.skipsUsedToday < 1 && !isCompleted;

  // Difficulty badge colors
  const difficultyColors = {
    [CHALLENGE_DIFFICULTY.EASY]: { bg: '#E8F5E9', text: '#2E7D32', label: 'Easy' },
    [CHALLENGE_DIFFICULTY.MEDIUM]: { bg: '#FFF3E0', text: '#E65100', label: 'Medium' },
    [CHALLENGE_DIFFICULTY.HARD]: { bg: '#FFEBEE', text: '#C62828', label: 'Hard' }
  };
  const difficultyStyle = difficultyColors[definition.difficulty] || difficultyColors[CHALLENGE_DIFFICULTY.EASY];

  return `
    <div class="daily-challenge-card ${isCompleted ? 'completed' : ''}" id="daily-challenge-card">
      <div class="challenge-header">
        <div class="challenge-label">
          <span class="challenge-badge">Daily Challenge</span>
          <span class="challenge-difficulty" style="background-color: ${difficultyStyle.bg}; color: ${difficultyStyle.text};">${difficultyStyle.label}</span>
        </div>
        ${!isCompleted && canSkip ? `
          <button class="challenge-skip-btn" id="skip-challenge-btn" title="Skip this challenge (1 per day)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="5 12 10 17 19 8"/>
              <line x1="5" y1="6" x2="19" y2="6"/>
            </svg>
            Skip
          </button>
        ` : ''}
      </div>
      <div class="challenge-content">
        <div class="challenge-icon">${definition.icon}</div>
        <div class="challenge-info">
          <span class="challenge-title">${definition.title}</span>
          <span class="challenge-description">${definition.description}</span>
        </div>
      </div>
      ${isCompleted ? `
        <div class="challenge-completed-banner">
          <span class="challenge-completed-icon">🎉</span>
          <span class="challenge-completed-text">${definition.reward}</span>
        </div>
      ` : `
        <div class="challenge-progress">
          <div class="challenge-progress-bar">
            <div class="challenge-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="challenge-progress-text">${challenge.progress} / ${definition.condition.target}</span>
        </div>
      `}
    </div>
  `;
}

/**
 * Attach event listeners for daily challenge card
 * @param {HTMLElement} screen - The screen element containing the challenge card
 */
export function attachDailyChallengeListeners(screen) {
  const skipBtn = screen.querySelector('#skip-challenge-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', handleSkipChallenge);
  }
}

// =============================================================================
// Challenge Actions
// =============================================================================

/**
 * Handle skip challenge button click
 */
async function handleSkipChallenge() {
  if (!state.dailyChallenges?.currentChallenge) return;

  const currentChallenge = state.dailyChallenges.currentChallenge;
  if (currentChallenge.skipsUsedToday >= 1 || currentChallenge.completed) return;

  // Mark as skipped and add to history
  const skippedChallenge = {
    ...currentChallenge,
    skipped: true
  };
  state.dailyChallenges.history.push(skippedChallenge);

  // Select a new challenge
  const newChallenge = selectDailyChallenge(state.dailyChallenges.history);
  state.dailyChallenges.currentChallenge = {
    ...createDailyChallengeState(newChallenge.id),
    skipsUsedToday: 1 // Mark that skip was used today
  };

  // Save and re-render
  await saveDailyChallenges(state.dailyChallenges);

  if (callbacks.renderViewGoalsScreen) {
    callbacks.renderViewGoalsScreen();
  }

  // Show feedback
  showToast('Challenge skipped! New challenge assigned.');
}

/**
 * Update challenge progress based on goal activity
 * Called after goal completion, timer updates, counter changes, etc.
 * @param {string} eventType - Type of event (e.g., 'goal_complete', 'timer_tick', 'counter_increment')
 * @param {Object} context - Additional context about the event
 */
export async function updateChallengeProgress(eventType, context = {}) {
  const challengesEnabled = state.settings?.dailyChallengesEnabled !== false;
  if (!challengesEnabled || !state.dailyChallenges?.currentChallenge) return;

  const challenge = state.dailyChallenges.currentChallenge;
  if (challenge.completed) return; // Already completed

  const definition = getChallengeDefinition(challenge.id);
  if (!definition) return;

  const condition = definition.condition;
  let newProgress = challenge.progress;
  const currentHour = new Date().getHours();

  switch (condition.type) {
    case 'goals_completed':
      // Count completed goals today
      newProgress = state.goals.filter(g => isGoalCompleted(g)).length;
      break;

    case 'complete_before_hour':
      // Check if a goal was completed before specified hour
      if (eventType === 'goal_complete' && currentHour < condition.target) {
        newProgress = 1;
      }
      break;

    case 'complete_after_hour':
      // Check if a goal was completed after specified hour
      if (eventType === 'goal_complete' && currentHour >= condition.target) {
        newProgress = 1;
      }
      break;

    case 'timer_minutes':
      // Count total timer minutes today across all timer goals
      const timerGoals = state.goals.filter(g => g.type === GOAL_TYPES.TIMER);
      const totalSeconds = timerGoals.reduce((sum, g) => sum + g.progress, 0);
      newProgress = Math.floor(totalSeconds / 60);
      break;

    case 'continuous_timer_minutes':
      // Track longest continuous session (using context from timer)
      if (eventType === 'timer_tick' && context.sessionMinutes) {
        newProgress = Math.max(challenge.progress, context.sessionMinutes);
      }
      break;

    case 'counter_increments':
      // Count total increments today
      if (eventType === 'counter_increment') {
        newProgress = challenge.progress + 1;
      }
      break;

    case 'checkbox_completed':
      // Count completed checkbox goals
      if (eventType === 'goal_complete' && context.goalType === GOAL_TYPES.CHECKBOX) {
        newProgress = state.goals.filter(g => g.type === GOAL_TYPES.CHECKBOX && isGoalCompleted(g)).length;
      }
      break;

    case 'goal_types_completed':
      // Count distinct goal types completed today
      const completedTypes = new Set();
      state.goals.forEach(g => {
        if (isGoalCompleted(g)) {
          completedTypes.add(g.type);
        }
      });
      newProgress = completedTypes.size;
      break;

    case 'all_goals_completed':
      // Check if all goals are completed
      if (state.goals.length > 0 && state.goals.every(g => isGoalCompleted(g))) {
        newProgress = 1;
      }
      break;

    case 'categories_completed':
      // Count distinct categories with completed goals
      const completedCategories = new Set();
      state.goals.forEach(g => {
        if (isGoalCompleted(g) && g.category) {
          completedCategories.add(g.category);
        }
      });
      newProgress = completedCategories.size;
      break;

    case 'goals_completed_between':
      // Count goals completed between specific hours
      if (eventType === 'goal_complete' && currentHour >= condition.startHour && currentHour < condition.endHour) {
        newProgress = challenge.progress + 1;
      }
      break;

    case 'goals_completed_before':
      // Count goals completed before specific hour
      if (eventType === 'goal_complete' && currentHour < condition.hour) {
        newProgress = challenge.progress + 1;
      }
      break;

    case 'goals_completed_after':
      // Count goals completed after specific hour
      if (eventType === 'goal_complete' && currentHour >= condition.hour) {
        newProgress = challenge.progress + 1;
      }
      break;
  }

  // Update progress if changed
  if (newProgress !== challenge.progress) {
    challenge.progress = newProgress;
    await updateCurrentChallenge({ progress: newProgress });

    // Check if challenge is now completed
    if (newProgress >= condition.target && !challenge.completed) {
      await handleChallengeCompletion();
    } else {
      // Just update the UI
      updateChallengeCardUI();
    }
  }
}

/**
 * Handle challenge completion
 * Updates stats, shows celebration, etc.
 */
async function handleChallengeCompletion() {
  if (!state.dailyChallenges?.currentChallenge) return;

  const challenge = state.dailyChallenges.currentChallenge;
  const definition = getChallengeDefinition(challenge.id);

  // Mark as completed
  await completeCurrentChallenge();
  state.dailyChallenges.currentChallenge.completed = true;
  state.dailyChallenges.currentChallenge.completedAt = Date.now();

  // Update the UI
  updateChallengeCardUI();

  // Show celebration
  showChallengeCompletionNotification(definition);

  // US-083: Award XP for completing challenge
  await awardChallengeXP(definition.difficulty);

  // Play sound
  if (state.settings?.soundEnabled) {
    playSound(SOUNDS.COMPLETE);
  }

  // Small confetti burst
  launchConfetti({ intensity: 'medium', duration: 1500 });
}

/**
 * Update the challenge card UI without full re-render
 */
function updateChallengeCardUI() {
  const card = document.getElementById('daily-challenge-card');
  if (!card) return;

  // Re-render just the challenge card
  const newCardHTML = renderDailyChallengeCard();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = newCardHTML;
  const newCard = tempDiv.firstElementChild;

  if (newCard) {
    card.replaceWith(newCard);
    // Re-attach listeners
    const screen = document.getElementById(SCREEN_IDS[SCREENS.VIEW_GOALS]);
    if (screen) {
      attachDailyChallengeListeners(screen);
    }
  }
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * Show challenge completion notification
 * @param {Object} definition - Challenge definition
 */
function showChallengeCompletionNotification(definition) {
  const existingToast = document.querySelector('.challenge-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'challenge-toast';
  toast.innerHTML = `
    <div class="challenge-toast-content">
      <div class="challenge-toast-icon">${definition.icon}</div>
      <div class="challenge-toast-info">
        <span class="challenge-toast-label">Challenge Complete!</span>
        <span class="challenge-toast-title">${definition.title}</span>
        <span class="challenge-toast-reward">${definition.reward}</span>
      </div>
    </div>
  `;

  document.getElementById('app').appendChild(toast);

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

/**
 * Show a simple toast message
 * @param {string} message - Message to display
 */
function showToast(message) {
  const existingToast = document.querySelector('.simple-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'simple-toast';
  toast.textContent = message;

  document.getElementById('app').appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}
