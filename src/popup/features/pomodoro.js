/**
 * Pomodoro Timer Mode Feature (US-085)
 * Pomodoro technique implementation for timer goals
 */

import { state } from '../state.js';
import { formatTime } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  isGoalCompleted,
  POMODORO_PHASES,
  getDefaultPomodoroSettings,
  getPomodoroPhaseDuration,
  getNextPomodoroPhase,
  getPomodoroPhaseDisplayName
} from '../../utils/models.js';
import {
  updateGoal,
  updatePomodoroStateForGoal,
  enablePomodoroForGoal,
  disablePomodoroForGoal
} from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  renderCurrentScreen: null,
  startTimerUpdateInterval: null,
  handleTimerToggle: null,
  handleTimerCompletion: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerPomodoroCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Pomodoro Controls Rendering
// =============================================================================

/**
 * Render Pomodoro-specific controls for a timer goal
 * @param {Object} goal - The timer goal object
 * @param {Object} pomodoroState - The Pomodoro state for this goal
 * @returns {string} HTML string for Pomodoro controls
 */
export function renderPomodoroControls(goal, pomodoroState) {
  const settings = state.pomodoroSettings || getDefaultPomodoroSettings();
  const phase = pomodoroState.phase;
  const isRunning = pomodoroState.isRunning;

  // Calculate current phase progress
  let displayProgress = pomodoroState.phaseProgress;
  if (isRunning && pomodoroState.phaseStartTime) {
    const elapsedSinceStart = Math.floor((Date.now() - pomodoroState.phaseStartTime) / 1000);
    displayProgress = pomodoroState.phaseProgress + elapsedSinceStart;
  }

  // Get phase duration and remaining time
  const phaseDuration = phase !== POMODORO_PHASES.IDLE ? getPomodoroPhaseDuration(phase, settings) : settings.workDuration;
  const remaining = Math.max(0, phaseDuration - displayProgress);

  // Phase display info
  const phaseDisplayName = getPomodoroPhaseDisplayName(phase);
  const isWorkPhase = phase === POMODORO_PHASES.WORK;
  const isBreakPhase = phase === POMODORO_PHASES.BREAK || phase === POMODORO_PHASES.LONG_BREAK;

  // Icons
  const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  const skipIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>';
  const closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // Sessions indicator (tomatoes)
  const sessionsCompleted = pomodoroState.sessionsCompleted || 0;
  const sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak || 4;
  const sessionIndicators = Array.from({ length: sessionsBeforeLongBreak }, (_, i) =>
    `<span class="pomodoro-session-dot ${i < (sessionsCompleted % sessionsBeforeLongBreak) ? 'completed' : ''}"></span>`
  ).join('');

  return `
    <div class="goal-controls goal-controls-pomodoro" data-goal-id="${goal.id}">
      <div class="pomodoro-header">
        <span class="pomodoro-phase-badge ${isWorkPhase ? 'work' : ''} ${isBreakPhase ? 'break' : ''}">${phaseDisplayName}</span>
        <div class="pomodoro-sessions">${sessionIndicators}</div>
        <button class="pomodoro-close-btn" data-action="pomodoro-disable" data-goal-id="${goal.id}" title="Disable Pomodoro">
          ${closeIcon}
        </button>
      </div>
      <div class="pomodoro-timer-display" data-goal-id="${goal.id}">
        <span class="pomodoro-time-remaining">${formatTime(remaining)}</span>
        <span class="pomodoro-total-sessions" title="Total sessions today">${pomodoroState.totalSessionsToday || 0}</span>
      </div>
      <div class="pomodoro-controls">
        <button class="goal-control-btn pomodoro-play-btn ${isRunning ? 'is-active' : ''}"
                data-action="pomodoro-toggle"
                data-goal-id="${goal.id}"
                title="${isRunning ? 'Pause' : (phase === POMODORO_PHASES.IDLE ? 'Start Work' : 'Resume')}">
          ${isRunning ? pauseIcon : playIcon}
        </button>
        ${phase !== POMODORO_PHASES.IDLE ? `
          <button class="goal-control-btn pomodoro-skip-btn"
                  data-action="pomodoro-skip"
                  data-goal-id="${goal.id}"
                  title="Skip to next phase">
            ${skipIcon}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// =============================================================================
// Pomodoro Handlers
// =============================================================================

/**
 * US-085: Enable Pomodoro mode for a timer goal
 * @param {string} goalId - The goal ID
 */
export async function handlePomodoroEnable(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.TIMER) {
    console.error('[Pomodoro] Invalid goal for Pomodoro:', goalId);
    return;
  }

  // Stop any running regular timer
  if (goal.isActive && callbacks.handleTimerToggle) {
    await callbacks.handleTimerToggle(goalId);
  }

  // Create and save Pomodoro state
  const pomodoroState = await enablePomodoroForGoal(goalId);
  state.pomodoroStates[goalId] = pomodoroState;

  console.log(`[Pomodoro] Enabled for goal ${goalId}`);
  playSound(SOUNDS.START);

  // Re-render to show Pomodoro controls
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

/**
 * US-085: Disable Pomodoro mode for a timer goal
 * @param {string} goalId - The goal ID
 */
export async function handlePomodoroDisable(goalId) {
  const pomodoroState = state.pomodoroStates[goalId];

  // Stop any running Pomodoro timer
  if (pomodoroState && pomodoroState.isRunning) {
    await handlePomodoroPause(goalId, pomodoroState);
  }

  // Remove Pomodoro state
  await disablePomodoroForGoal(goalId);
  delete state.pomodoroStates[goalId];

  console.log(`[Pomodoro] Disabled for goal ${goalId}`);

  // Re-render to show regular timer controls
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

/**
 * US-085: Toggle Pomodoro timer (play/pause)
 * @param {string} goalId - The goal ID
 */
export async function handlePomodoroToggle(goalId) {
  const pomodoroState = state.pomodoroStates[goalId];
  if (!pomodoroState || !pomodoroState.enabled) {
    console.error('[Pomodoro] No Pomodoro state for goal:', goalId);
    return;
  }

  if (pomodoroState.isRunning) {
    await handlePomodoroPause(goalId, pomodoroState);
  } else {
    await handlePomodoroStart(goalId, pomodoroState);
  }
}

/**
 * US-085: Start or resume Pomodoro timer
 * @param {string} goalId - The goal ID
 * @param {Object} pomodoroState - Current Pomodoro state
 */
async function handlePomodoroStart(goalId, pomodoroState) {
  const now = Date.now();

  // If idle, start a work phase
  if (pomodoroState.phase === POMODORO_PHASES.IDLE) {
    pomodoroState.phase = POMODORO_PHASES.WORK;
    pomodoroState.phaseProgress = 0;
  }

  // Start the timer
  pomodoroState.isRunning = true;
  pomodoroState.phaseStartTime = now;

  // Update state
  state.pomodoroStates[goalId] = pomodoroState;
  await updatePomodoroStateForGoal(goalId, pomodoroState);

  // Start the timer update interval
  if (callbacks.startTimerUpdateInterval) {
    callbacks.startTimerUpdateInterval();
  }

  // Play start sound
  playSound(SOUNDS.START);

  console.log(`[Pomodoro] Started ${pomodoroState.phase} phase for goal ${goalId}`);

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

/**
 * US-085: Pause Pomodoro timer
 * @param {string} goalId - The goal ID
 * @param {Object} pomodoroState - Current Pomodoro state
 */
async function handlePomodoroPause(goalId, pomodoroState) {
  const now = Date.now();

  // Calculate elapsed time in this phase
  if (pomodoroState.phaseStartTime) {
    const elapsedSinceStart = Math.floor((now - pomodoroState.phaseStartTime) / 1000);
    pomodoroState.phaseProgress += elapsedSinceStart;
  }

  // Pause the timer
  pomodoroState.isRunning = false;
  pomodoroState.phaseStartTime = null;

  // Update state
  state.pomodoroStates[goalId] = pomodoroState;
  await updatePomodoroStateForGoal(goalId, pomodoroState);

  // Play pause sound
  playSound(SOUNDS.PAUSE);

  console.log(`[Pomodoro] Paused ${pomodoroState.phase} phase for goal ${goalId}`);

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

/**
 * US-085: Skip to next Pomodoro phase
 * @param {string} goalId - The goal ID
 */
export async function handlePomodoroSkip(goalId) {
  const pomodoroState = state.pomodoroStates[goalId];
  if (!pomodoroState || !pomodoroState.enabled) {
    return;
  }

  // Complete current phase and transition to next
  await handlePomodoroPhaseComplete(goalId, pomodoroState, true);
}

/**
 * US-085: Handle Pomodoro phase completion
 * @param {string} goalId - The goal ID
 * @param {Object} pomodoroState - Current Pomodoro state
 * @param {boolean} skipped - Whether the phase was skipped
 */
export async function handlePomodoroPhaseComplete(goalId, pomodoroState, skipped = false) {
  const settings = state.pomodoroSettings || getDefaultPomodoroSettings();
  const goal = state.goals.find(g => g.id === goalId);
  const currentPhase = pomodoroState.phase;

  // If work phase completed (not skipped), increment sessions and add progress to goal
  if (currentPhase === POMODORO_PHASES.WORK && !skipped) {
    pomodoroState.sessionsCompleted++;
    pomodoroState.totalSessionsToday++;

    // Add work duration to the goal's progress
    if (goal) {
      const workDuration = settings.workDuration;
      const newProgress = Math.min(goal.progress + workDuration, goal.target);
      goal.progress = newProgress;
      await updateGoal(goalId, { progress: newProgress });

      // Check if goal is now complete
      if (newProgress >= goal.target && !isGoalCompleted(goal) && callbacks.handleTimerCompletion) {
        await callbacks.handleTimerCompletion(goalId);
      }
    }

    console.log(`[Pomodoro] Work session ${pomodoroState.sessionsCompleted} completed for goal ${goalId}`);
  }

  // Determine next phase
  const nextPhase = getNextPomodoroPhase(pomodoroState, settings);

  // Reset for next phase
  pomodoroState.phase = nextPhase;
  pomodoroState.phaseProgress = 0;
  pomodoroState.phaseStartTime = null;

  // Auto-start behavior
  const shouldAutoStart = (nextPhase === POMODORO_PHASES.WORK && settings.autoStartWork) ||
                          ((nextPhase === POMODORO_PHASES.BREAK || nextPhase === POMODORO_PHASES.LONG_BREAK) && settings.autoStartBreaks);

  if (shouldAutoStart) {
    pomodoroState.isRunning = true;
    pomodoroState.phaseStartTime = Date.now();
  } else {
    pomodoroState.isRunning = false;
  }

  // Update state
  state.pomodoroStates[goalId] = pomodoroState;
  await updatePomodoroStateForGoal(goalId, pomodoroState);

  // Play phase change sound
  if (currentPhase === POMODORO_PHASES.WORK) {
    // Work session complete - play completion sound
    playSound(SOUNDS.COMPLETE);
  } else {
    // Break complete - play start sound for next work session
    playSound(SOUNDS.START);
  }

  // Show notification for phase change
  showPomodoroPhaseNotification(goalId, currentPhase, nextPhase, pomodoroState.sessionsCompleted);

  console.log(`[Pomodoro] Transitioned from ${currentPhase} to ${nextPhase} for goal ${goalId}`);

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * US-085: Show notification for Pomodoro phase change
 * @param {string} goalId - The goal ID
 * @param {string} fromPhase - Previous phase
 * @param {string} toPhase - New phase
 * @param {number} sessionsCompleted - Number of sessions completed
 */
function showPomodoroPhaseNotification(goalId, fromPhase, toPhase, sessionsCompleted) {
  const goal = state.goals.find(g => g.id === goalId);
  const goalTitle = goal ? goal.title : 'Timer';

  let message = '';
  let icon = '';

  if (fromPhase === POMODORO_PHASES.WORK) {
    if (toPhase === POMODORO_PHASES.LONG_BREAK) {
      message = `Great job! ${sessionsCompleted} sessions complete. Time for a long break!`;
      icon = '🎉';
    } else {
      message = `Session ${sessionsCompleted} complete! Take a short break.`;
      icon = '☕';
    }
  } else {
    message = `Break over. Ready for another work session?`;
    icon = '💪';
  }

  // Create and show notification toast
  const existingToast = document.querySelector('.pomodoro-phase-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'pomodoro-phase-toast';
  toast.innerHTML = `
    <span class="pomodoro-toast-icon">${icon}</span>
    <div class="pomodoro-toast-content">
      <span class="pomodoro-toast-title">${goalTitle}</span>
      <span class="pomodoro-toast-message">${message}</span>
    </div>
  `;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// =============================================================================
// Timer Update Functions
// =============================================================================

/**
 * US-085: Update Pomodoro timer displays (called from timer update interval)
 */
export function updatePomodoroDisplays() {
  const settings = state.pomodoroSettings || getDefaultPomodoroSettings();
  const now = Date.now();

  Object.entries(state.pomodoroStates).forEach(([goalId, pomodoroState]) => {
    if (!pomodoroState.enabled || !pomodoroState.isRunning) return;

    // Calculate current progress
    let currentProgress = pomodoroState.phaseProgress;
    if (pomodoroState.phaseStartTime) {
      const elapsedSinceStart = Math.floor((now - pomodoroState.phaseStartTime) / 1000);
      currentProgress += elapsedSinceStart;
    }

    // Get phase duration
    const phaseDuration = getPomodoroPhaseDuration(pomodoroState.phase, settings);
    const remaining = Math.max(0, phaseDuration - currentProgress);

    // Update DOM
    const timerDisplay = document.querySelector(`.pomodoro-timer-display[data-goal-id="${goalId}"]`);
    if (timerDisplay) {
      const timeElement = timerDisplay.querySelector('.pomodoro-time-remaining');
      if (timeElement) {
        timeElement.textContent = formatTime(remaining);
      }
    }

    // Check if phase completed
    if (currentProgress >= phaseDuration) {
      handlePomodoroPhaseComplete(goalId, pomodoroState, false);
    }
  });
}
