/**
 * Formatting Utilities
 * Pure utility functions for formatting display values
 */

import { GOAL_TYPES } from '../../utils/models.js';

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timer progress as HH:MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format progress display based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} Formatted progress string
 */
export function formatProgressDisplay(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return `${formatTime(goal.progress)} / ${formatTime(goal.target)}`;
    case GOAL_TYPES.COUNTER:
      return `${goal.progress} / ${goal.target}`;
    case GOAL_TYPES.CHECKBOX:
      return goal.progress >= goal.target ? 'Completed' : 'Not completed';
    case GOAL_TYPES.AVOIDANCE:
      // US-087: Show streak days for avoidance goals
      const days = goal.progress || 0;
      if (days === 0) return 'Starting today';
      if (days === 1) return '1 day streak';
      return `${days} day streak`;
    default:
      return `${goal.progress} / ${goal.target}`;
  }
}
