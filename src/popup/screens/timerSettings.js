/**
 * Timer Settings Module
 * US-085: Pomodoro Settings
 * US-086: Break Reminder Settings
 */

import { state } from '../state.js';
import { saveSettings, savePomodoroSettings, resetBreakReminderState } from '../../utils/storage.js';

// =============================================================================
// Pomodoro Settings
// =============================================================================

/**
 * US-085: Attach Pomodoro settings event listeners
 * @param {HTMLElement} screen - The settings screen element
 */
export function attachPomodoroSettingsListeners(screen) {
  // Work duration input
  const workDurationInput = screen.querySelector('#pomodoro-work-duration');
  if (workDurationInput) {
    workDurationInput.addEventListener('change', async (e) => {
      const minutes = parseInt(e.target.value, 10) || 25;
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        workDuration: minutes * 60
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Work duration set to ${minutes} minutes`);
    });
  }

  // Break duration input
  const breakDurationInput = screen.querySelector('#pomodoro-break-duration');
  if (breakDurationInput) {
    breakDurationInput.addEventListener('change', async (e) => {
      const minutes = parseInt(e.target.value, 10) || 5;
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        breakDuration: minutes * 60
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Break duration set to ${minutes} minutes`);
    });
  }

  // Long break duration input
  const longBreakDurationInput = screen.querySelector('#pomodoro-long-break-duration');
  if (longBreakDurationInput) {
    longBreakDurationInput.addEventListener('change', async (e) => {
      const minutes = parseInt(e.target.value, 10) || 15;
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        longBreakDuration: minutes * 60
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Long break duration set to ${minutes} minutes`);
    });
  }

  // Sessions before long break input
  const sessionsCountInput = screen.querySelector('#pomodoro-sessions-count');
  if (sessionsCountInput) {
    sessionsCountInput.addEventListener('change', async (e) => {
      const sessions = parseInt(e.target.value, 10) || 4;
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        sessionsBeforeLongBreak: sessions
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Sessions before long break set to ${sessions}`);
    });
  }

  // Auto-start breaks toggle
  const autoBreaksToggle = screen.querySelector('#pomodoro-auto-breaks');
  if (autoBreaksToggle) {
    autoBreaksToggle.addEventListener('change', async (e) => {
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        autoStartBreaks: e.target.checked
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Auto-start breaks: ${e.target.checked}`);
    });
  }

  // Auto-start work toggle
  const autoWorkToggle = screen.querySelector('#pomodoro-auto-work');
  if (autoWorkToggle) {
    autoWorkToggle.addEventListener('change', async (e) => {
      state.pomodoroSettings = {
        ...state.pomodoroSettings,
        autoStartWork: e.target.checked
      };
      await savePomodoroSettings(state.pomodoroSettings);
      console.log(`[Pomodoro] Auto-start work: ${e.target.checked}`);
    });
  }
}

// =============================================================================
// Break Reminder Settings
// =============================================================================

/**
 * US-086: Attach break reminder settings event listeners
 * @param {HTMLElement} screen - The settings screen element
 */
export function attachBreakReminderSettingsListeners(screen) {
  // Break reminders enable toggle
  const breakRemindersToggle = screen.querySelector('#break-reminders-toggle');
  if (breakRemindersToggle) {
    breakRemindersToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      state.settings = {
        ...state.settings,
        breakRemindersEnabled: enabled
      };
      await saveSettings(state.settings);

      // Enable/disable related inputs
      const intervalInput = screen.querySelector('#break-interval-input');
      const soundToggle = screen.querySelector('#break-sound-toggle');
      if (intervalInput) intervalInput.disabled = !enabled;
      if (soundToggle) soundToggle.disabled = !enabled;

      // Reset break reminder state if disabling
      if (!enabled) {
        await resetBreakReminderState();
        state.breakReminderState = null;
      }

      console.log(`[Break Reminders] ${enabled ? 'Enabled' : 'Disabled'}`);
    });
  }

  // Break interval input
  const breakIntervalInput = screen.querySelector('#break-interval-input');
  if (breakIntervalInput) {
    breakIntervalInput.addEventListener('change', async (e) => {
      let minutes = parseInt(e.target.value, 10);
      // Clamp to valid range
      minutes = Math.max(15, Math.min(120, minutes || 45));
      e.target.value = minutes;

      state.settings = {
        ...state.settings,
        breakReminderInterval: minutes
      };
      await saveSettings(state.settings);
      console.log(`[Break Reminders] Interval set to ${minutes} minutes`);
    });
  }

  // Break sound toggle
  const breakSoundToggle = screen.querySelector('#break-sound-toggle');
  if (breakSoundToggle) {
    breakSoundToggle.addEventListener('change', async (e) => {
      state.settings = {
        ...state.settings,
        breakReminderSound: e.target.checked
      };
      await saveSettings(state.settings);
      console.log(`[Break Reminders] Sound: ${e.target.checked ? 'Enabled' : 'Disabled'}`);
    });
  }
}
