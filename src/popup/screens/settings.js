/**
 * Settings Screen Module
 * US-052: Settings Screen (Sound toggle, volume slider, theme)
 * US-065: Categories Management
 * US-075: Reset Times Configuration
 * US-076: Notification Settings
 * US-077: Motivational Quotes Toggle
 * US-081: Daily Challenges Toggle
 * US-085: Pomodoro Settings
 * US-086: Break Reminder Settings
 *
 * Note: US-070 Export/Import Data moved to ./dataManagement.js
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import {
  saveSettings,
  updateGoal,
  addCategory,
  deleteCategory,
  DEFAULT_CATEGORIES
} from '../../utils/storage.js';
import { playSound, setMuted, setVolume } from '../../utils/sounds.js';
import {
  registerDataManagementCallbacks,
  attachDataManagementListeners
} from './dataManagement.js';
import { attachNotificationSettingsListeners } from './notificationSettings.js';

// Callbacks to be registered from popup.js
let callbacks = {
  attachNavigationListeners: null,
  loadData: null,
  toggleTheme: null,
  getThemeDisplayText: null,
  getEffectiveTheme: null
};

/**
 * Register callbacks from popup.js
 * @param {Object} cbs - Object containing callback functions
 */
export function registerSettingsCallbacks(cbs) {
  Object.assign(callbacks, cbs);

  // Forward callbacks to dataManagement module
  registerDataManagementCallbacks({
    loadData: cbs.loadData,
    renderSettingsScreen: renderSettingsScreen
  });
}

/**
 * Render the Settings screen
 * US-052: Full settings screen with sound toggle, volume slider, dark mode toggle, and about section
 */
export function renderSettingsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.SETTINGS]);
  if (!screen) return;

  // Get current settings
  const themeSetting = state.settings?.theme || 'auto';
  const themeDisplayText = callbacks.getThemeDisplayText ? callbacks.getThemeDisplayText(themeSetting) : themeSetting;
  const effectiveTheme = callbacks.getEffectiveTheme ? callbacks.getEffectiveTheme(themeSetting) : 'light';
  const soundEnabled = state.settings?.soundEnabled !== false; // Default to true
  const soundVolume = state.settings?.soundVolume ?? 50; // Default to 50

  // US-052: Full settings screen layout
  screen.innerHTML = `
    <div class="settings-screen">
      <header class="screen-header main-screen-header">
        <h1 class="screen-title">Settings</h1>
      </header>
      <main class="settings-content">
        <!-- Sound Settings Section -->
        <div class="settings-section">
          <h2>Sound</h2>

          <!-- Sound Effects Toggle -->
          <div class="setting-item setting-item-row" id="sound-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Sound Effects</span>
              <span class="setting-description">Play sounds on goal interactions</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle sound effects">
              <input type="checkbox" id="sound-toggle" ${soundEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Volume Slider -->
          <div class="setting-item setting-item-volume ${!soundEnabled ? 'disabled' : ''}">
            <div class="setting-info">
              <span class="setting-label">Volume</span>
            </div>
            <div class="volume-control">
              <svg class="volume-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                ${soundVolume === 0 || !soundEnabled ?
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>' :
                  soundVolume < 50 ?
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' :
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
                }
              </svg>
              <input
                type="range"
                id="volume-slider"
                min="0"
                max="100"
                value="${soundVolume}"
                class="volume-slider"
                ${!soundEnabled ? 'disabled' : ''}
                aria-label="Volume level"
              >
              <span class="volume-value" id="volume-value">${soundVolume}%</span>
            </div>
          </div>
        </div>

        <!-- US-076: Notifications Settings Section -->
        <div class="settings-section">
          <h2>Notifications</h2>
          <p class="settings-section-description">Get reminders to complete your goals</p>

          <!-- Daily Reminder Toggle -->
          <div class="setting-item setting-item-row" id="daily-reminder-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Daily Reminder</span>
              <span class="setting-description">Remind me about incomplete goals</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle daily reminder">
              <input type="checkbox" id="daily-reminder-toggle" ${state.settings?.dailyReminderEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Daily Reminder Time -->
          <div class="setting-item setting-item-time ${!state.settings?.dailyReminderEnabled ? 'disabled' : ''}">
            <div class="setting-info">
              <span class="setting-label">Reminder Time</span>
              <span class="setting-description">When to send the daily reminder</span>
            </div>
            <input type="time" id="daily-reminder-time-input" class="notification-time-input" value="${state.settings?.dailyReminderTime || '09:00'}" ${!state.settings?.dailyReminderEnabled ? 'disabled' : ''}>
          </div>

          <!-- Quiet Hours Toggle -->
          <div class="setting-item setting-item-row" id="quiet-hours-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Quiet Hours</span>
              <span class="setting-description">Pause notifications during set hours</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle quiet hours">
              <input type="checkbox" id="quiet-hours-toggle" ${state.settings?.quietHoursEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Quiet Hours Time Range -->
          <div class="setting-item setting-item-time-range ${!state.settings?.quietHoursEnabled ? 'disabled' : ''}">
            <div class="quiet-hours-inputs">
              <div class="quiet-hours-input-group">
                <span class="quiet-hours-label">From</span>
                <input type="time" id="quiet-hours-start" class="notification-time-input" value="${state.settings?.quietHoursStart || '22:00'}" ${!state.settings?.quietHoursEnabled ? 'disabled' : ''}>
              </div>
              <span class="quiet-hours-separator">to</span>
              <div class="quiet-hours-input-group">
                <span class="quiet-hours-label">Until</span>
                <input type="time" id="quiet-hours-end" class="notification-time-input" value="${state.settings?.quietHoursEnd || '07:00'}" ${!state.settings?.quietHoursEnabled ? 'disabled' : ''}>
              </div>
            </div>
          </div>

          <!-- Test Notification Button -->
          <button class="btn btn-secondary btn-sm test-notification-btn" id="test-notification-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Test Notification
          </button>
        </div>

        <!-- Appearance Settings Section -->
        <div class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item setting-item-clickable" id="theme-toggle" role="button" tabindex="0" aria-label="Toggle theme">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-description">${themeSetting === 'auto' ? `Auto (currently ${effectiveTheme})` : ''}</span>
            </div>
            <div class="theme-toggle-control">
              <span class="theme-value">${themeDisplayText}</span>
              <span class="theme-icon">
                ${themeSetting === 'dark' ?
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' :
                  themeSetting === 'light' ?
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' :
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
                }
              </span>
            </div>
          </div>

          <!-- US-077: Motivational Quotes Toggle -->
          <div class="setting-item setting-item-row" id="quotes-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Motivational Quotes</span>
              <span class="setting-description">Show quotes on empty state and completion</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle motivational quotes">
              <input type="checkbox" id="quotes-toggle" ${state.settings?.quotesEnabled !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- US-081: Daily Challenges Toggle -->
          <div class="setting-item setting-item-row" id="challenges-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Daily Challenges</span>
              <span class="setting-description">Optional daily challenges for extra motivation</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle daily challenges">
              <input type="checkbox" id="challenges-toggle" ${state.settings?.dailyChallengesEnabled !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- US-075: Reset Times Section -->
        <div class="settings-section">
          <h2>Reset Times</h2>
          <p class="settings-section-description">Configure when your goals reset for each timeframe</p>

          <div class="reset-times-list">
            <!-- Daily Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Daily Goals</span>
                <span class="reset-time-next" id="daily-next-reset">Loading...</span>
              </div>
              <input type="time" id="daily-reset-time" class="reset-time-input" value="${state.settings?.dailyResetTime || '00:00'}">
            </div>

            <!-- Weekly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Weekly Goals</span>
                <span class="reset-time-description">(Resets on Monday)</span>
                <span class="reset-time-next" id="weekly-next-reset">Loading...</span>
              </div>
              <input type="time" id="weekly-reset-time" class="reset-time-input" value="${state.settings?.weeklyResetTime || '00:00'}">
            </div>

            <!-- Monthly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Monthly Goals</span>
                <span class="reset-time-description">(Resets on the 1st)</span>
                <span class="reset-time-next" id="monthly-next-reset">Loading...</span>
              </div>
              <input type="time" id="monthly-reset-time" class="reset-time-input" value="${state.settings?.monthlyResetTime || '00:00'}">
            </div>

            <!-- Yearly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Yearly Goals</span>
                <span class="reset-time-description">(Resets on January 1st)</span>
                <span class="reset-time-next" id="yearly-next-reset">Loading...</span>
              </div>
              <input type="time" id="yearly-reset-time" class="reset-time-input" value="${state.settings?.yearlyResetTime || '00:00'}">
            </div>
          </div>

          <p class="reset-times-note">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Times are in your local timezone
          </p>
        </div>

        <!-- US-065: Categories Section -->
        <div class="settings-section">
          <h2>Categories</h2>
          <p class="settings-section-description">Organize your goals with color-coded categories</p>
          <div class="categories-list">
            ${state.categories.map(cat => {
              const isDefault = DEFAULT_CATEGORIES.some(dc => dc.id === cat.id);
              return `
                <div class="category-item" data-category-id="${cat.id}">
                  <span class="category-color-indicator" style="background-color: ${cat.color}"></span>
                  <span class="category-name">${cat.name}</span>
                  ${!isDefault ? `
                    <button class="category-delete-btn" data-action="delete-category" data-category-id="${cat.id}" title="Delete category">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  ` : '<span class="category-badge-default">Default</span>'}
                </div>
              `;
            }).join('')}
          </div>
          <button class="btn btn-secondary btn-sm add-category-btn" id="add-category-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Custom Category
          </button>
        </div>

        <!-- US-085: Pomodoro Settings Section -->
        <div class="settings-section">
          <h2>Pomodoro Timer</h2>
          <p class="settings-section-description">Configure Pomodoro technique settings for timer goals</p>

          <div class="pomodoro-duration-inputs">
            <div class="pomodoro-duration-item">
              <span class="pomodoro-duration-label">Work</span>
              <input type="number" id="pomodoro-work-duration" class="pomodoro-duration-input"
                     min="1" max="120" value="${Math.floor((state.pomodoroSettings?.workDuration || 1500) / 60)}">
              <span class="pomodoro-duration-unit">min</span>
            </div>
            <div class="pomodoro-duration-item">
              <span class="pomodoro-duration-label">Break</span>
              <input type="number" id="pomodoro-break-duration" class="pomodoro-duration-input"
                     min="1" max="60" value="${Math.floor((state.pomodoroSettings?.breakDuration || 300) / 60)}">
              <span class="pomodoro-duration-unit">min</span>
            </div>
            <div class="pomodoro-duration-item">
              <span class="pomodoro-duration-label">Long Break</span>
              <input type="number" id="pomodoro-long-break-duration" class="pomodoro-duration-input"
                     min="1" max="120" value="${Math.floor((state.pomodoroSettings?.longBreakDuration || 900) / 60)}">
              <span class="pomodoro-duration-unit">min</span>
            </div>
          </div>

          <div class="setting-item setting-item-row" style="margin-top: 16px;">
            <div class="setting-info">
              <span class="setting-label">Sessions before long break</span>
              <span class="setting-description">Number of work sessions before a long break</span>
            </div>
            <input type="number" id="pomodoro-sessions-count" class="pomodoro-duration-input" style="width: 60px;"
                   min="1" max="10" value="${state.pomodoroSettings?.sessionsBeforeLongBreak || 4}">
          </div>

          <div class="setting-item setting-item-row" style="margin-top: 12px;">
            <div class="setting-info">
              <span class="setting-label">Auto-start breaks</span>
              <span class="setting-description">Automatically start breaks after work</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle auto-start breaks">
              <input type="checkbox" id="pomodoro-auto-breaks" ${state.pomodoroSettings?.autoStartBreaks ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item setting-item-row" style="margin-top: 12px;">
            <div class="setting-info">
              <span class="setting-label">Auto-start work</span>
              <span class="setting-description">Automatically start work after breaks</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle auto-start work">
              <input type="checkbox" id="pomodoro-auto-work" ${state.pomodoroSettings?.autoStartWork ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- US-086: Break Reminders Section -->
        <div class="settings-section">
          <h2>Break Reminders</h2>
          <p class="settings-section-description">Get reminded to take breaks during long timer sessions</p>

          <div class="setting-item setting-item-row">
            <div class="setting-info">
              <span class="setting-label">Enable break reminders</span>
              <span class="setting-description">Remind you to take breaks while timers are running</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle break reminders">
              <input type="checkbox" id="break-reminders-toggle" ${state.settings?.breakRemindersEnabled !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item setting-item-row" style="margin-top: 12px;">
            <div class="setting-info">
              <span class="setting-label">Reminder interval</span>
              <span class="setting-description">Minutes between break reminders</span>
            </div>
            <div class="break-interval-input-wrapper">
              <input type="number" id="break-interval-input" class="pomodoro-duration-input" style="width: 70px;"
                     min="15" max="120" value="${state.settings?.breakReminderInterval || 45}"
                     ${state.settings?.breakRemindersEnabled === false ? 'disabled' : ''}>
              <span class="pomodoro-duration-unit">min</span>
            </div>
          </div>

          <div class="setting-item setting-item-row" style="margin-top: 12px;">
            <div class="setting-info">
              <span class="setting-label">Notification sound</span>
              <span class="setting-description">Play sound when break reminder appears</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle break reminder sound">
              <input type="checkbox" id="break-sound-toggle"
                     ${state.settings?.breakReminderSound !== false ? 'checked' : ''}
                     ${state.settings?.breakRemindersEnabled === false ? 'disabled' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- US-070: Data Management Section -->
        <div class="settings-section">
          <h2>Data Management</h2>
          <p class="settings-section-description">Export your data for backup or import from a previous backup</p>

          <div class="data-management-actions">
            <button class="btn btn-secondary data-action-btn" id="export-data-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export Data</span>
            </button>

            <button class="btn btn-secondary data-action-btn" id="import-data-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Import Data</span>
            </button>
          </div>

          <!-- Hidden file input for import -->
          <input type="file" id="import-file-input" accept=".json" style="display: none;">
        </div>

        <!-- About Section -->
        <div class="settings-section about">
          <h2>About</h2>
          <p class="app-version">Daily Goals Tracker v1.0.0</p>
          <p class="app-description">Track your daily goals with timers, counters, and checkboxes. Build discipline through consistent progress.</p>
        </div>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // US-052: Attach sound toggle listener
  attachSoundToggleListener(screen);

  // US-052: Attach volume slider listener
  attachVolumeSliderListener(screen);

  // US-076: Attach notification settings listeners
  attachNotificationSettingsListeners(screen, renderSettingsScreen);

  // US-051: Attach theme toggle listener
  attachThemeToggleListener(screen);

  // US-077: Attach quotes toggle listener
  attachQuotesToggleListener(screen);

  // US-081: Attach daily challenges toggle listener
  attachChallengesToggleListener(screen);

  // US-075: Attach reset times listeners
  attachResetTimesListeners(screen);

  // US-065: Attach category management listeners
  attachCategoryManagementListeners(screen);

  // US-070: Attach data management listeners
  attachDataManagementListeners(screen);

  // US-075: Load and display next reset times
  loadNextResetTimes();
}

/**
 * Attach sound toggle listener
 */
function attachSoundToggleListener(screen) {
  const soundToggleCheckbox = screen.querySelector('#sound-toggle');
  if (soundToggleCheckbox) {
    soundToggleCheckbox.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state and audio system
      state.settings = {
        ...state.settings,
        soundEnabled: enabled
      };
      setMuted(!enabled);

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Sound effects: ${enabled ? 'enabled' : 'disabled'}`);

      // Re-render to update volume slider state
      renderSettingsScreen();
    });
  }
}

/**
 * Attach volume slider listener
 */
function attachVolumeSliderListener(screen) {
  const volumeSlider = screen.querySelector('#volume-slider');
  const volumeValue = screen.querySelector('#volume-value');
  if (volumeSlider) {
    // Update display and audio on input (while dragging)
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value, 10);
      if (volumeValue) {
        volumeValue.textContent = `${volume}%`;
      }
      // Update audio system immediately for feedback
      setVolume(volume / 100);

      // Update the volume icon based on level
      updateVolumeIcon(screen, volume, state.settings?.soundEnabled !== false);
    });

    // Save to storage on change (when dragging stops)
    volumeSlider.addEventListener('change', async (e) => {
      const volume = parseInt(e.target.value, 10);

      // Update state
      state.settings = {
        ...state.settings,
        soundVolume: volume
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Volume set to: ${volume}%`);
    });
  }
}

/**
 * Update the volume icon based on volume level
 * @param {HTMLElement} screen - The settings screen element
 * @param {number} volume - Volume level (0-100)
 * @param {boolean} enabled - Whether sound is enabled
 */
function updateVolumeIcon(screen, volume, enabled) {
  const volumeIcon = screen.querySelector('.volume-icon');
  if (!volumeIcon) return;

  let iconSvg;
  if (volume === 0 || !enabled) {
    // Muted/off icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  } else if (volume < 50) {
    // Low volume icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
  } else {
    // High volume icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
  }

  volumeIcon.innerHTML = iconSvg;
}

/**
 * Attach theme toggle listener
 */
function attachThemeToggleListener(screen) {
  const themeToggle = screen.querySelector('#theme-toggle');
  if (themeToggle && callbacks.toggleTheme) {
    themeToggle.addEventListener('click', async () => {
      await callbacks.toggleTheme();
      // Re-render to update the display
      renderSettingsScreen();
    });

    // Also handle keyboard interaction (Enter/Space)
    themeToggle.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await callbacks.toggleTheme();
        renderSettingsScreen();
      }
    });
  }
}

/**
 * Attach quotes toggle listener
 */
function attachQuotesToggleListener(screen) {
  const quotesToggle = screen.querySelector('#quotes-toggle');
  if (quotesToggle) {
    quotesToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state
      state.settings = {
        ...state.settings,
        quotesEnabled: enabled
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Motivational quotes: ${enabled ? 'enabled' : 'disabled'}`);
    });
  }
}

/**
 * Attach daily challenges toggle listener
 */
function attachChallengesToggleListener(screen) {
  const challengesToggle = screen.querySelector('#challenges-toggle');
  if (challengesToggle) {
    challengesToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state
      state.settings = {
        ...state.settings,
        dailyChallengesEnabled: enabled
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Daily challenges: ${enabled ? 'enabled' : 'disabled'}`);
    });
  }
}

/**
 * US-075: Attach reset times event listeners
 * @param {HTMLElement} screen - The settings screen element
 */
function attachResetTimesListeners(screen) {
  const timeInputs = [
    { id: 'daily-reset-time', setting: 'dailyResetTime' },
    { id: 'weekly-reset-time', setting: 'weeklyResetTime' },
    { id: 'monthly-reset-time', setting: 'monthlyResetTime' },
    { id: 'yearly-reset-time', setting: 'yearlyResetTime' }
  ];

  timeInputs.forEach(({ id, setting }) => {
    const input = screen.querySelector(`#${id}`);
    if (input) {
      input.addEventListener('change', async (e) => {
        const newTime = e.target.value;
        console.log(`[Settings] ${setting} changed to ${newTime}`);

        // Update state and save settings
        state.settings = {
          ...state.settings,
          [setting]: newTime
        };
        await saveSettings(state.settings);

        // Notify service worker to reschedule alarms
        try {
          await chrome.runtime.sendMessage({ type: 'RESET_TIMES_CHANGED' });
          console.log('[Settings] Service worker notified of reset time change');
        } catch (error) {
          console.error('[Settings] Error notifying service worker:', error);
        }

        // Update next reset time display
        loadNextResetTimes();

        // Play feedback sound
        playSound('click');
      });
    }
  });
}

/**
 * US-075: Load and display next reset times from service worker
 */
async function loadNextResetTimes() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_NEXT_RESET_TIMES' });

    if (response && response.success && response.nextResetTimes) {
      const { daily, weekly, monthly, yearly } = response.nextResetTimes;

      updateNextResetDisplay('daily-next-reset', daily.nextReset);
      updateNextResetDisplay('weekly-next-reset', weekly.nextReset);
      updateNextResetDisplay('monthly-next-reset', monthly.nextReset);
      updateNextResetDisplay('yearly-next-reset', yearly.nextReset);
    }
  } catch (error) {
    console.error('[Settings] Error loading next reset times:', error);
    // Set fallback display
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(tf => {
      const element = document.getElementById(`${tf}-next-reset`);
      if (element) {
        element.textContent = 'Unable to load';
      }
    });
  }
}

/**
 * US-075: Update next reset time display element
 * @param {string} elementId - The element ID to update
 * @param {number} timestamp - The next reset timestamp
 */
function updateNextResetDisplay(elementId, timestamp) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const nextReset = new Date(timestamp);
  const now = new Date();

  // Format the display
  const isToday = nextReset.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === nextReset.toDateString();

  const timeStr = nextReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let dateStr;
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = nextReset.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  element.textContent = `Next: ${dateStr} at ${timeStr}`;
}

/**
 * US-065: Attach category management listeners
 * @param {HTMLElement} screen - The settings screen element
 */
function attachCategoryManagementListeners(screen) {
  // Delete category buttons
  const deleteButtons = screen.querySelectorAll('[data-action="delete-category"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const categoryId = btn.getAttribute('data-category-id');
      if (!categoryId) return;

      // Check if any goals use this category
      const goalsWithCategory = state.goals.filter(g => g.category === categoryId);
      if (goalsWithCategory.length > 0) {
        if (!confirm(`This category is used by ${goalsWithCategory.length} goal(s). Deleting it will remove the category from those goals. Continue?`)) {
          return;
        }
        // Remove category from those goals
        for (const goal of goalsWithCategory) {
          await updateGoal(goal.id, { category: null });
          const goalIndex = state.goals.findIndex(g => g.id === goal.id);
          if (goalIndex !== -1) {
            state.goals[goalIndex].category = null;
          }
        }
      }

      // Delete the category
      await deleteCategory(categoryId);
      state.categories = state.categories.filter(c => c.id !== categoryId);

      // Re-render settings
      renderSettingsScreen();
    });
  });

  // Add category button
  const addCategoryBtn = screen.querySelector('#add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      showAddCategoryDialog();
    });
  }
}

/**
 * US-065: Show dialog to add a custom category
 */
function showAddCategoryDialog() {
  const name = prompt('Enter category name:');
  if (!name || !name.trim()) return;

  const trimmedName = name.trim();

  // Check for duplicate names
  if (state.categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
    alert('A category with this name already exists.');
    return;
  }

  // Preset colors for custom categories
  const presetColors = ['#E91E63', '#00BCD4', '#8BC34A', '#795548', '#607D8B', '#FF5722'];
  const usedColors = state.categories.map(c => c.color);
  const availableColor = presetColors.find(c => !usedColors.includes(c)) || presetColors[0];

  // Generate light color variant
  const lightColor = lightenColor(availableColor, 0.9);

  // Create new category
  const newCategory = {
    id: `custom-${Date.now()}`,
    name: trimmedName,
    color: availableColor,
    light: lightColor
  };

  // Save category
  addCategory(newCategory).then(() => {
    state.categories.push(newCategory);
    renderSettingsScreen();
  });
}

/**
 * US-065: Lighten a hex color
 * @param {string} hex - Hex color string
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {string} Lightened hex color
 */
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0').toUpperCase()}`;
}

// US-070: Data Management functions (attachDataManagementListeners, handleExportData, etc.)
// are now imported from ./dataManagement.js