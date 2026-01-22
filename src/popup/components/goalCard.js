/**
 * Goal Card Component (US-015)
 * Renders individual goal cards with type-specific controls
 */

import { state } from '../state.js';
import { formatTime, formatProgressDisplay, escapeHtml } from '../utils/formatting.js';
import { GOAL_TYPES, isGoalCompleted, getGoalCompletionPercentage } from '../../utils/models.js';
import { renderPomodoroControls } from '../features/pomodoro.js';

// =============================================================================
// Goal Type Icons
// =============================================================================

/**
 * Get the icon SVG for a goal type
 * @param {string} type - The goal type (timer, counter, checkbox, avoidance)
 * @returns {string} SVG HTML string
 */
export function getGoalTypeIcon(type) {
  switch (type) {
    case GOAL_TYPES.TIMER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`;
    case GOAL_TYPES.COUNTER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>`;
    case GOAL_TYPES.CHECKBOX:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <polyline points="9 11 12 14 22 4"/>
      </svg>`;
    case GOAL_TYPES.AVOIDANCE:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="4" y1="4" x2="20" y2="20"/>
      </svg>`;
    default:
      return '';
  }
}

// =============================================================================
// Goal Card Rendering
// =============================================================================

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} String with first letter capitalized
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render a goal card component
 * @param {Object} goal - The goal object to render
 * @returns {string} HTML string for the goal card
 */
export function renderGoalCard(goal) {
  const progressPercent = getGoalCompletionPercentage(goal);
  const isCompleted = isGoalCompleted(goal);
  const typeIcon = getGoalTypeIcon(goal.type);
  const progressDisplay = formatProgressDisplay(goal);

  // Build CSS classes for the card - always use compact view
  const justCompleted = state.justCompletedGoals.has(goal.id);
  const cardClasses = [
    'goal-card',
    `goal-type-${goal.type}`,
    isCompleted ? 'goal-completed' : '',
    goal.type === GOAL_TYPES.TIMER && goal.isActive ? 'goal-timer-active' : '',
    justCompleted ? 'just-completed' : '',
    'compact' // Always compact
  ].filter(Boolean).join(' ');

  // US-065: Get category info for badge display
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;
  const categoryDataAttr = goal.category ? `data-category="${goal.category}"` : '';

  // US-073: Custom goal color for accent stripe
  const goalColorStyle = goal.color ? `style="--goal-custom-color: ${goal.color}"` : '';
  const hasCustomColor = goal.color ? 'has-custom-color' : '';

  return `
    <div class="${cardClasses} ${hasCustomColor}" data-goal-id="${goal.id}" ${categoryDataAttr} ${goalColorStyle} draggable="true">
      <div class="goal-card-header">
        <div class="drag-handle" title="Drag to reorder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <div class="goal-card-title-row">
          <span class="goal-type-indicator">${typeIcon}</span>
          <h3 class="goal-title">${escapeHtml(goal.title)}</h3>
        </div>
        <div class="goal-header-actions">
          <button class="stats-btn" data-action="view-stats" data-goal-id="${goal.id}" title="View statistics for this goal" aria-label="View statistics for ${escapeHtml(goal.title)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </button>
          <button class="focus-btn" data-action="focus" data-goal-id="${goal.id}" title="Focus on this goal" aria-label="Focus on ${escapeHtml(goal.title)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </button>
          <div class="goal-badges">
            ${categoryInfo ? `<span class="goal-category-badge" style="background-color: ${categoryInfo.light}; color: ${categoryInfo.color}"><span class="category-color-dot" style="background-color: ${categoryInfo.color}"></span>${categoryInfo.name}</span>` : ''}
            <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
          </div>
        </div>
      </div>
      <div class="goal-card-body">
        ${goal.notes ? renderGoalNotes(goal) : ''}
        <div class="goal-progress-wrapper">
          <div class="goal-progress-section">
            <div class="goal-progress-info">
              <span class="goal-progress-text">${progressDisplay}</span>
              ${goal.type === GOAL_TYPES.TIMER ? renderTimerStatsCompact(goal) : `<span class="goal-progress-percent">${Math.round(progressPercent)}%</span>`}
            </div>
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            ${renderGoalSecondaryInfo(goal)}
          </div>
        </div>
        ${renderGoalControls(goal)}
      </div>
    </div>
  `;
}

// =============================================================================
// Timer Live Display
// =============================================================================

/**
 * Format seconds into HH:MM:SS display
 * @param {number} totalSeconds - Total seconds to format
 * @returns {string} Formatted time string
 */
function formatTimerDisplay(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Render compact timer stats (inline with progress info)
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string for compact timer stats
 */
function renderTimerStatsCompact(goal) {
  const isActive = goal.isActive;
  const activeTimer = state.activeTimers[goal.id];

  let displayProgress = goal.progress;
  if (isActive && activeTimer && activeTimer.startTime) {
    const elapsedSinceStart = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    displayProgress = goal.progress + elapsedSinceStart;
  }
  // Allow overflow past target

  const timerDisplay = formatTimerDisplay(displayProgress);
  const targetDisplay = formatTimerDisplay(goal.target);

  return `<span class="timer-stats-compact ${isActive ? 'is-active' : ''}"><span class="timer-current" data-goal-id="${goal.id}">${timerDisplay}</span><span class="timer-sep">/</span><span class="timer-target">${targetDisplay}</span></span>`;
}

// =============================================================================
// Goal Secondary Info
// =============================================================================

/**
 * Render secondary info line for goal cards
 * Only shows when there's meaningful stats to display
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for secondary info
 */
function renderGoalSecondaryInfo(goal) {
  // For avoidance goals, show best streak if relevant
  if (goal.type === GOAL_TYPES.AVOIDANCE) {
    const longestStreak = goal.longestAvoidanceStreak || 0;
    const currentStreak = goal.progress || 0;

    if (longestStreak > 0 && longestStreak > currentStreak) {
      return `<div class="goal-secondary-info">Best: ${longestStreak} days</div>`;
    } else if (longestStreak > 0 && longestStreak === currentStreak && currentStreak > 1) {
      return `<div class="goal-secondary-info">Personal best!</div>`;
    }
  }

  // For other goal types, secondary info will be added once
  // completion tracking is implemented (completionCount field)
  return '';
}

// =============================================================================
// Goal Notes
// =============================================================================

/**
 * US-074: Render goal notes with truncation and expand/collapse
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for goal notes section
 */
function renderGoalNotes(goal) {
  if (!goal.notes) return '';

  const notes = goal.notes;
  const MAX_PREVIEW_LENGTH = 100;
  const needsTruncation = notes.length > MAX_PREVIEW_LENGTH;

  const processedNotes = formatNotesMarkdown(notes);
  const truncatedNotes = needsTruncation
    ? formatNotesMarkdown(notes.substring(0, MAX_PREVIEW_LENGTH) + '...')
    : processedNotes;

  return `
    <div class="goal-notes-section" data-goal-id="${goal.id}">
      <div class="goal-notes-content collapsed">
        <span class="goal-notes-text truncated">${truncatedNotes}</span>
        <span class="goal-notes-text full" style="display: none;">${processedNotes}</span>
      </div>
      ${needsTruncation ? `
        <button class="goal-notes-toggle" data-action="toggle-notes" data-goal-id="${goal.id}" title="Show more">
          <span class="toggle-text">Show more</span>
          <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * US-074: Format notes with basic markdown support
 * @param {string} text - The text to format
 * @returns {string} HTML formatted text
 */
function formatNotesMarkdown(text) {
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="notes-link">$1</a>'
  );
  return formatted;
}

/**
 * US-074: Toggle goal notes expand/collapse state
 * @param {string} goalId - The goal ID
 * @param {HTMLElement} button - The toggle button element
 */
export function toggleGoalNotes(goalId, button) {
  const notesSection = document.querySelector(`.goal-notes-section[data-goal-id="${goalId}"]`);
  if (!notesSection) return;

  const content = notesSection.querySelector('.goal-notes-content');
  const truncatedText = notesSection.querySelector('.goal-notes-text.truncated');
  const fullText = notesSection.querySelector('.goal-notes-text.full');
  const toggleText = button.querySelector('.toggle-text');
  const toggleIcon = button.querySelector('.toggle-icon');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    content.classList.add('expanded');
    if (truncatedText) truncatedText.style.display = 'none';
    if (fullText) fullText.style.display = 'inline';
    if (toggleText) toggleText.textContent = 'Show less';
    if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
    button.title = 'Show less';
  } else {
    content.classList.remove('expanded');
    content.classList.add('collapsed');
    if (truncatedText) truncatedText.style.display = 'inline';
    if (fullText) fullText.style.display = 'none';
    if (toggleText) toggleText.textContent = 'Show more';
    if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
    button.title = 'Show more';
  }
}

// =============================================================================
// Goal Controls
// =============================================================================

/**
 * Render goal-specific controls
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for goal controls
 */
export function renderGoalControls(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderTimerControls(goal);
    case GOAL_TYPES.COUNTER:
      return renderCounterControls(goal);
    case GOAL_TYPES.CHECKBOX:
      return renderCheckboxControls(goal);
    case GOAL_TYPES.AVOIDANCE:
      return renderAvoidanceControls(goal);
    default:
      return '';
  }
}

/**
 * Render timer-specific controls for a goal
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string for timer controls
 */
function renderTimerControls(goal) {
  const pomodoroState = state.pomodoroStates[goal.id];

  // US-085: If Pomodoro mode is enabled, render Pomodoro controls
  if (pomodoroState && pomodoroState.enabled) {
    return renderPomodoroControls(goal, pomodoroState);
  }

  // Regular timer controls
  const isActive = goal.isActive;

  const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  const tomatoIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="13" r="8"/><path d="M12 5V3"/><path d="M9 4c1.5 1 4.5 1 6 0"/></svg>';

  return `
    <div class="goal-controls goal-controls-timer">
      <button class="goal-control-btn timer-play-btn ${isActive ? 'is-active' : ''}"
              data-action="timer-toggle"
              data-goal-id="${goal.id}"
              title="${isActive ? 'Pause timer' : 'Start timer'}"
              aria-label="${isActive ? 'Pause timer' : 'Start timer'}">
        ${isActive ? pauseIcon : playIcon}
      </button>
      <button class="goal-control-btn timer-pomodoro-btn"
              data-action="pomodoro-enable"
              data-goal-id="${goal.id}"
              title="Enable Pomodoro mode">
        ${tomatoIcon}
      </button>
    </div>
  `;
}

/**
 * Render counter-specific controls
 * @param {Object} goal - The counter goal object
 * @returns {string} HTML string for counter controls
 */
function renderCounterControls(goal) {
  const isAtMinimum = goal.progress <= 0;
  return `
    <div class="goal-controls goal-controls-counter">
      <button class="goal-control-btn counter-decrement-btn ${isAtMinimum ? 'disabled' : ''}"
              data-action="decrement"
              data-goal-id="${goal.id}"
              title="Decrease"
              ${isAtMinimum ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <span class="counter-value">${goal.progress}</span>
      <button class="goal-control-btn counter-increment-btn"
              data-action="increment"
              data-goal-id="${goal.id}"
              title="Increase">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  `;
}

/**
 * Render checkbox-specific controls
 * @param {Object} goal - The checkbox goal object
 * @returns {string} HTML string for checkbox controls
 */
function renderCheckboxControls(goal) {
  const completed = isGoalCompleted(goal);
  return `
    <div class="goal-controls goal-controls-checkbox">
      <button class="goal-control-btn checkbox-toggle-btn ${completed ? 'checked' : ''}" data-action="checkbox-toggle" data-goal-id="${goal.id}" title="Toggle completion">
        <span class="checkbox-box">
          ${completed
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : ''
          }
        </span>
        <span class="checkbox-label">${completed ? 'Done!' : 'Mark as done'}</span>
      </button>
    </div>
  `;
}

/**
 * US-087: Render avoidance goal controls
 * @param {Object} goal - The avoidance goal object
 * @returns {string} HTML string for avoidance controls
 */
function renderAvoidanceControls(goal) {
  const streakDays = goal.progress || 0;
  const hasForgiveness = goal.forgivenessEnabled && goal.slipUpsThisWeek === 0;
  return `
    <div class="goal-controls goal-controls-avoidance">
      <div class="avoidance-streak-display">
        <span class="streak-fire">${streakDays > 0 ? '🔥' : '🌱'}</span>
        <span class="streak-count">${streakDays}</span>
        <span class="streak-label">${streakDays === 1 ? 'day' : 'days'}</span>
      </div>
      <button class="goal-control-btn avoidance-slip-btn ${hasForgiveness ? 'has-forgiveness' : ''}"
              data-action="avoidance-slip"
              data-goal-id="${goal.id}"
              title="${hasForgiveness ? 'Mark slip-up (forgiveness available)' : 'Mark slip-up (resets streak)'}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="slip-label">Slipped</span>
      </button>
      ${goal.forgivenessEnabled ? `
        <span class="forgiveness-badge ${hasForgiveness ? 'available' : 'used'}" title="${hasForgiveness ? 'Forgiveness available this week' : 'Forgiveness used this week'}">
          ${hasForgiveness ? '💚' : '💔'}
        </span>
      ` : ''}
    </div>
  `;
}
