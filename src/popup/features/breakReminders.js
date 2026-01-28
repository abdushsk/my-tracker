/**
 * Break Reminders Feature (US-086)
 * Break reminder system to help users take regular breaks
 */

import { state } from '../state.js';
import {
  getBreakReminderState,
  updateBreakReminderState,
  shouldShowBreakReminder,
  getRandomBreakActivity,
  getAllBreakActivities,
  recordBreakTaken,
  recordBreakSkipped,
  snoozeBreakReminder,
  disableBreakRemindersForSession
} from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';
import { getIcon } from '../utils/icons.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showSuccessFeedback: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerBreakRemindersCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Break Reminder Check
// =============================================================================

/**
 * US-086: Check if break reminder should be shown
 * Called from timer update interval
 */
export async function checkBreakReminder() {
  // Don't check if already showing
  if (state.breakReminderVisible) return;

  // Don't check if settings not loaded
  if (!state.settings) return;

  // Track active timer time
  await trackActiveTimerTime();

  // Check if we should show break reminder
  const check = await shouldShowBreakReminder(state.settings);

  if (check.shouldShow) {
    showBreakReminderOverlay();
  }
}

/**
 * US-086: Track active timer time for break reminders
 */
async function trackActiveTimerTime() {
  const hasActiveTimers = Object.keys(state.activeTimers).length > 0;
  const hasRunningPomodoro = Object.values(state.pomodoroStates).some(s => s && s.enabled && s.isRunning);

  if (hasActiveTimers || hasRunningPomodoro) {
    // Update total active time (add 1 second since we're called every second)
    const currentState = await getBreakReminderState();
    const newTotalTime = (currentState.totalActiveTime || 0) + 1000;
    await updateBreakReminderState({ totalActiveTime: newTotalTime });
    state.breakReminderState = { ...currentState, totalActiveTime: newTotalTime };
  }
}

// =============================================================================
// Break Reminder Overlay
// =============================================================================

/**
 * US-086: Show break reminder overlay
 */
export function showBreakReminderOverlay() {
  // Don't show if already visible
  if (state.breakReminderVisible) return;
  state.breakReminderVisible = true;

  // Get random break activity suggestion
  const suggestion = getRandomBreakActivity();
  const allActivities = getAllBreakActivities();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'break-reminder-overlay';
  overlay.id = 'break-reminder-overlay';
  overlay.innerHTML = `
    <div class="break-reminder-modal">
      <div class="break-reminder-header">
        <span class="break-reminder-icon">${getIcon('coffee', 28)}</span>
        <h2 class="break-reminder-title">Time for a Break!</h2>
      </div>
      <p class="break-reminder-description">
        You've been working hard! Taking short breaks helps maintain focus and productivity.
      </p>
      <div class="break-reminder-suggestion">
        <span class="suggestion-icon">${getIcon(suggestion.icon, 24)}</span>
        <div class="suggestion-content">
          <span class="suggestion-activity">${suggestion.activity}</span>
          <span class="suggestion-duration">${suggestion.duration}</span>
        </div>
      </div>
      <div class="break-reminder-activities">
        <span class="activities-label">Other ideas:</span>
        <div class="activities-list">
          ${allActivities.filter(a => a.activity !== suggestion.activity).slice(0, 3).map(a => `
            <span class="activity-chip" title="${a.activity}">${getIcon(a.icon, 16)}</span>
          `).join('')}
        </div>
      </div>
      <div class="break-reminder-actions">
        <button class="btn btn-primary break-reminder-btn" id="break-take-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          Take Break
        </button>
        <div class="break-reminder-snooze-group">
          <button class="btn btn-secondary break-reminder-btn snooze-btn" data-snooze="5">5 min</button>
          <button class="btn btn-secondary break-reminder-btn snooze-btn" data-snooze="10">10 min</button>
          <button class="btn btn-secondary break-reminder-btn snooze-btn" data-snooze="15">15 min</button>
        </div>
      </div>
      <div class="break-reminder-footer">
        <button class="break-reminder-skip-btn" id="break-skip-btn">Skip this break</button>
        <button class="break-reminder-disable-btn" id="break-disable-session-btn">Disable for session</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Play notification sound if enabled
  if (state.settings?.soundEnabled && state.settings?.breakReminderSound) {
    playSound(SOUNDS.START);
  }

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });

  // Attach event handlers
  attachBreakReminderEventHandlers(overlay);
}

/**
 * US-086: Attach event handlers to break reminder overlay
 * @param {HTMLElement} overlay - The overlay element
 */
function attachBreakReminderEventHandlers(overlay) {
  // Take Break button
  const takeBtn = overlay.querySelector('#break-take-btn');
  if (takeBtn) {
    takeBtn.addEventListener('click', () => handleBreakTaken());
  }

  // Snooze buttons
  const snoozeButtons = overlay.querySelectorAll('.snooze-btn');
  snoozeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.snooze, 10);
      handleBreakSnooze(minutes);
    });
  });

  // Skip button
  const skipBtn = overlay.querySelector('#break-skip-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => handleBreakSkipped());
  }

  // Disable for session button
  const disableBtn = overlay.querySelector('#break-disable-session-btn');
  if (disableBtn) {
    disableBtn.addEventListener('click', () => handleBreakDisableForSession());
  }
}

// =============================================================================
// Break Reminder Handlers
// =============================================================================

/**
 * US-086: Handle user taking a break
 */
async function handleBreakTaken() {
  console.log('[Break Reminder] Break taken');
  await recordBreakTaken();
  hideBreakReminderOverlay();
  if (callbacks.showSuccessFeedback) {
    callbacks.showSuccessFeedback('Break recorded! Great job taking care of yourself.');
  }
}

/**
 * US-086: Handle user snoozing break reminder
 * @param {number} minutes - Minutes to snooze
 */
async function handleBreakSnooze(minutes) {
  console.log(`[Break Reminder] Snoozed for ${minutes} minutes`);
  await snoozeBreakReminder(minutes);
  hideBreakReminderOverlay();
  if (callbacks.showSuccessFeedback) {
    callbacks.showSuccessFeedback(`Reminder snoozed for ${minutes} minutes`);
  }
}

/**
 * US-086: Handle user skipping break
 */
async function handleBreakSkipped() {
  console.log('[Break Reminder] Break skipped');
  await recordBreakSkipped();
  hideBreakReminderOverlay();
}

/**
 * US-086: Handle disabling break reminders for current session
 */
async function handleBreakDisableForSession() {
  console.log('[Break Reminder] Disabled for session');
  await disableBreakRemindersForSession();
  hideBreakReminderOverlay();
  if (callbacks.showSuccessFeedback) {
    callbacks.showSuccessFeedback('Break reminders disabled for this session');
  }
}

/**
 * US-086: Hide break reminder overlay
 */
export function hideBreakReminderOverlay() {
  const overlay = document.getElementById('break-reminder-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      state.breakReminderVisible = false;
    }, 300);
  } else {
    state.breakReminderVisible = false;
  }
}
