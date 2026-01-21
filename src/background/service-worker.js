/**
 * Daily Goals Tracker - Service Worker
 *
 * Background service worker for Chrome extension (Manifest V3).
 * Handles:
 * - Extension installation/updates
 * - Persistent timers (continue when popup closed)
 * - Scheduled goal resets via chrome.alarms
 * - Message passing with popup
 * - Badge updates
 */

// ============================================
// Installation Handler
// ============================================

/**
 * Fires when the extension is first installed, updated, or
 * when Chrome is updated.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Service Worker] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('[Service Worker] First time installation - initializing...');
    // Future: Initialize default settings, welcome the user, etc.
  } else if (details.reason === 'update') {
    console.log('[Service Worker] Extension updated from version:', details.previousVersion);
    // Future: Handle any migration or cleanup needed
  }

  // Future: Set up alarms for scheduled resets
  // setupResetAlarms();
});

// ============================================
// Message Listener
// ============================================

/**
 * Handles messages from the popup and content scripts.
 * Used for communication between popup UI and background tasks.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] Message received:', message);

  // Handle different message types
  switch (message.type) {
    case 'TIMER_START':
      // Future: Handle timer start - store startTime, set up tracking
      console.log('[Service Worker] Timer start requested for goal:', message.goalId);
      sendResponse({ success: true, message: 'Timer started' });
      break;

    case 'TIMER_PAUSE':
      // Future: Handle timer pause - calculate elapsed, save progress
      console.log('[Service Worker] Timer pause requested for goal:', message.goalId);
      sendResponse({ success: true, message: 'Timer paused' });
      break;

    case 'UPDATE_BADGE':
      // Future: Update the extension badge with goal count
      console.log('[Service Worker] Badge update requested:', message.data);
      sendResponse({ success: true, message: 'Badge updated' });
      break;

    case 'GET_ACTIVE_TIMERS':
      // Future: Return list of currently active timers
      console.log('[Service Worker] Active timers requested');
      sendResponse({ success: true, timers: [] });
      break;

    default:
      console.log('[Service Worker] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate async response (required for sendResponse to work)
  return true;
});

// ============================================
// Alarm Listener
// ============================================

/**
 * Handles Chrome alarms for scheduled tasks.
 * Used for:
 * - Daily/weekly/monthly/yearly goal resets
 * - Reminder notifications
 * - Break reminders for long timer sessions
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Service Worker] Alarm fired:', alarm.name);

  switch (alarm.name) {
    case 'daily-reset':
      // Future: Reset all daily goals at midnight
      console.log('[Service Worker] Daily reset triggered');
      // resetGoalsByTimeframe('daily');
      break;

    case 'weekly-reset':
      // Future: Reset all weekly goals on Monday midnight
      console.log('[Service Worker] Weekly reset triggered');
      // resetGoalsByTimeframe('weekly');
      break;

    case 'monthly-reset':
      // Future: Reset all monthly goals on 1st midnight
      console.log('[Service Worker] Monthly reset triggered');
      // resetGoalsByTimeframe('monthly');
      break;

    case 'yearly-reset':
      // Future: Reset all yearly goals on Jan 1st midnight
      console.log('[Service Worker] Yearly reset triggered');
      // resetGoalsByTimeframe('yearly');
      break;

    case 'reminder':
      // Future: Show reminder notification
      console.log('[Service Worker] Reminder notification triggered');
      // showReminderNotification();
      break;

    default:
      // Check if it's a timer-related alarm (e.g., 'timer-{goalId}')
      if (alarm.name.startsWith('timer-')) {
        const goalId = alarm.name.replace('timer-', '');
        console.log('[Service Worker] Timer alarm for goal:', goalId);
        // Future: Handle timer completion or update
      } else {
        console.log('[Service Worker] Unknown alarm:', alarm.name);
      }
  }
});

// ============================================
// Extension Startup
// ============================================

/**
 * Fires when the extension starts (e.g., browser startup, extension enabled).
 * Note: This event also fires on service worker wake-up.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Service Worker] Extension started');

  // Future: Check for any pending timer updates
  // Future: Verify alarms are still set up
  // Future: Update badge with current goal count
});

// Log that service worker has loaded
console.log('[Service Worker] Daily Goals Tracker service worker loaded');
