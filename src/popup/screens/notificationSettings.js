/**
 * Notification Settings Module
 * US-076: Notification Settings
 */

import { state } from '../state.js';
import { saveSettings } from '../../utils/storage.js';
import { playSound } from '../../utils/sounds.js';
import {
  attachPomodoroSettingsListeners,
  attachBreakReminderSettingsListeners
} from './timerSettings.js';

// =============================================================================
// Notification Settings
// =============================================================================

/**
 * US-076: Attach notification settings event listeners
 * @param {HTMLElement} screen - The settings screen element
 * @param {Function} renderSettingsScreen - Callback to re-render settings screen
 */
export function attachNotificationSettingsListeners(screen, renderSettingsScreen) {
  // Daily Reminder Toggle
  const dailyReminderToggle = screen.querySelector('#daily-reminder-toggle');
  if (dailyReminderToggle) {
    dailyReminderToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state
      state.settings = {
        ...state.settings,
        dailyReminderEnabled: enabled
      };

      // Save to storage
      await saveSettings(state.settings);

      // Notify service worker
      try {
        await chrome.runtime.sendMessage({
          type: 'NOTIFICATION_SETTINGS_CHANGED',
          settings: state.settings
        });
        console.log(`[Settings] Daily reminder: ${enabled ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('[Settings] Error updating notification settings:', error);
      }

      // Re-render to update disabled states
      renderSettingsScreen();

      // Play feedback sound
      playSound('click');
    });
  }

  // Daily Reminder Time
  const dailyReminderTimeInput = screen.querySelector('#daily-reminder-time-input');
  if (dailyReminderTimeInput) {
    dailyReminderTimeInput.addEventListener('change', async (e) => {
      const newTime = e.target.value;

      // Update state
      state.settings = {
        ...state.settings,
        dailyReminderTime: newTime
      };

      // Save to storage
      await saveSettings(state.settings);

      // Notify service worker
      try {
        await chrome.runtime.sendMessage({
          type: 'NOTIFICATION_SETTINGS_CHANGED',
          settings: state.settings
        });
        console.log(`[Settings] Daily reminder time set to: ${newTime}`);
      } catch (error) {
        console.error('[Settings] Error updating notification settings:', error);
      }

      // Play feedback sound
      playSound('click');
    });
  }

  // Quiet Hours Toggle
  const quietHoursToggle = screen.querySelector('#quiet-hours-toggle');
  if (quietHoursToggle) {
    quietHoursToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state
      state.settings = {
        ...state.settings,
        quietHoursEnabled: enabled
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Quiet hours: ${enabled ? 'enabled' : 'disabled'}`);

      // Re-render to update disabled states
      renderSettingsScreen();

      // Play feedback sound
      playSound('click');
    });
  }

  // Quiet Hours Start Time
  const quietHoursStart = screen.querySelector('#quiet-hours-start');
  if (quietHoursStart) {
    quietHoursStart.addEventListener('change', async (e) => {
      const newTime = e.target.value;

      // Update state
      state.settings = {
        ...state.settings,
        quietHoursStart: newTime
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Quiet hours start set to: ${newTime}`);

      // Play feedback sound
      playSound('click');
    });
  }

  // Quiet Hours End Time
  const quietHoursEnd = screen.querySelector('#quiet-hours-end');
  if (quietHoursEnd) {
    quietHoursEnd.addEventListener('change', async (e) => {
      const newTime = e.target.value;

      // Update state
      state.settings = {
        ...state.settings,
        quietHoursEnd: newTime
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Quiet hours end set to: ${newTime}`);

      // Play feedback sound
      playSound('click');
    });
  }

  // Test Notification Button
  const testNotificationBtn = screen.querySelector('#test-notification-btn');
  if (testNotificationBtn) {
    testNotificationBtn.addEventListener('click', async () => {
      try {
        // Show loading state
        testNotificationBtn.disabled = true;
        testNotificationBtn.textContent = 'Sending...';

        const response = await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });

        if (response && response.success) {
          console.log('[Settings] Test notification sent successfully');
          testNotificationBtn.textContent = 'Sent!';
          playSound('complete');
        } else {
          console.error('[Settings] Failed to send test notification');
          testNotificationBtn.textContent = 'Failed';
        }

        // Reset button after a delay
        setTimeout(() => {
          testNotificationBtn.disabled = false;
          testNotificationBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Test Notification
          `;
        }, 2000);
      } catch (error) {
        console.error('[Settings] Error sending test notification:', error);
        testNotificationBtn.textContent = 'Error';
        setTimeout(() => {
          testNotificationBtn.disabled = false;
          testNotificationBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Test Notification
          `;
        }, 2000);
      }
    });
  }

  // US-085: Attach Pomodoro settings listeners
  attachPomodoroSettingsListeners(screen);

  // US-086: Attach break reminder settings listeners
  attachBreakReminderSettingsListeners(screen);
}
