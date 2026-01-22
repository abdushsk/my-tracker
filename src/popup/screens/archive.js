/**
 * Archive Screen (US-069)
 * Shows archived goals with restore and delete options
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  getGoals,
  restoreArchivedGoal,
  deleteArchivedGoal
} from '../../utils/storage.js';
import {
  getGoalTypeIconSmall,
  getGoalTypeLabel,
  formatTargetForManage
} from './manageGoals.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showSuccessFeedback: null,
  showFormError: null,
  attachNavigationListeners: null,
  capitalizeFirst: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerArchiveCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Archive Screen Rendering
// =============================================================================

/**
 * Render the Archive screen
 * US-069: Shows archived goals with restore and delete options
 */
export function renderArchiveScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.ARCHIVE]);
  if (!screen) return;

  const archivedGoals = state.archivedGoals || [];

  screen.innerHTML = `
    <div class="archive-screen">
      <header class="screen-header archive-header">
        <button class="back-btn" data-screen="${SCREENS.MANAGE_GOALS}" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="archive-title">Archived Goals</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="archive-content">
        ${archivedGoals.length === 0
          ? renderArchiveEmptyState()
          : renderArchivedGoalsList(archivedGoals)}
      </main>
    </div>
  `;

  // Attach navigation event listeners
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // Attach archive action listeners
  attachArchiveListeners(screen);
}

/**
 * Render empty state for Archive screen
 * @returns {string} HTML string for empty state
 */
function renderArchiveEmptyState() {
  return `
    <div class="archive-empty-state">
      <div class="archive-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
          <rect x="6" y="14" width="52" height="44" rx="4" fill="var(--background-secondary)" stroke="var(--border)" stroke-width="2"/>
          <rect x="2" y="6" width="60" height="12" rx="2" fill="var(--background-secondary)" stroke="var(--border)" stroke-width="2"/>
          <line x1="26" y1="32" x2="38" y2="32" stroke="var(--text-muted)" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="archive-empty-message">No archived goals</p>
      <p class="archive-empty-submessage">Archive goals you want to keep but don't need active right now</p>
    </div>
  `;
}

/**
 * Render the archived goals list
 * @param {Array} archivedGoals - Array of archived goal objects
 * @returns {string} HTML string for the list
 */
function renderArchivedGoalsList(archivedGoals) {
  // Sort by archivedAt date, most recent first
  const sortedGoals = [...archivedGoals].sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));

  return `
    <div class="archived-goals-list">
      ${sortedGoals.map(goal => renderArchivedGoalItem(goal)).join('')}
    </div>
  `;
}

/**
 * Render a single archived goal item
 * @param {Object} goal - The archived goal object
 * @returns {string} HTML string for the goal item
 */
function renderArchivedGoalItem(goal) {
  const typeIcon = getGoalTypeIconSmall(goal.type);
  const typeLabel = getGoalTypeLabel(goal.type);
  const targetDisplay = formatTargetForManage(goal);
  const archivedDate = goal.archivedAt ? formatArchivedDate(goal.archivedAt) : 'Unknown date';
  const timeframeLabel = callbacks.capitalizeFirst ? callbacks.capitalizeFirst(goal.timeframe) : goal.timeframe;

  return `
    <div class="archived-goal-item" data-goal-id="${goal.id}">
      <div class="archived-goal-info">
        <div class="archived-goal-type-indicator type-${goal.type}" title="${typeLabel}">
          ${typeIcon}
        </div>
        <div class="archived-goal-details">
          <span class="archived-goal-title">${escapeHtml(goal.title)}</span>
          <div class="archived-goal-meta">
            <span class="archived-goal-timeframe timeframe-${goal.timeframe}">${timeframeLabel}</span>
            <span class="archived-goal-target">${targetDisplay}</span>
            <span class="archived-goal-date">Archived ${archivedDate}</span>
          </div>
        </div>
      </div>
      <div class="archived-goal-actions">
        <button class="manage-action-btn restore-btn" data-action="restore" data-goal-id="${goal.id}" title="Restore goal" aria-label="Restore ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button class="manage-action-btn delete-archived-btn" data-action="delete-archived" data-goal-id="${goal.id}" title="Delete permanently" aria-label="Permanently delete ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Format archived date for display
 * @param {number} timestamp - The archived timestamp
 * @returns {string} Formatted date string
 */
function formatArchivedDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// =============================================================================
// Archive Event Handlers
// =============================================================================

/**
 * Attach event listeners for Archive screen actions
 * @param {HTMLElement} container - The container element
 */
function attachArchiveListeners(container) {
  // Restore button click handlers
  const restoreButtons = container.querySelectorAll('[data-action="restore"]');
  restoreButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleRestoreArchivedGoal(goalId);
      }
    });
  });

  // Delete permanently button click handlers
  const deleteButtons = container.querySelectorAll('[data-action="delete-archived"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        // Show confirmation before permanent deletion
        if (confirm('Are you sure you want to permanently delete this goal? This cannot be undone.')) {
          await handleDeleteArchivedGoal(goalId);
        }
      }
    });
  });
}

/**
 * Handle restoring an archived goal
 * @param {string} goalId - The archived goal ID to restore
 */
async function handleRestoreArchivedGoal(goalId) {
  const archivedGoal = state.archivedGoals.find(g => g.id === goalId);
  if (!archivedGoal) {
    console.error('[Archive] Archived goal not found:', goalId);
    if (callbacks.showFormError) {
      callbacks.showFormError('Goal not found. Please try again.');
    }
    return;
  }

  console.log('[Archive] Restoring archived goal:', archivedGoal.title);

  try {
    const success = await restoreArchivedGoal(goalId);

    if (success) {
      // Update local state
      state.archivedGoals = state.archivedGoals.filter(g => g.id !== goalId);
      state.goals = await getGoals();

      console.log('[Archive] Goal restored successfully:', archivedGoal.title);
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback(`"${archivedGoal.title}" restored!`);
      }

      // Re-render the archive screen
      renderArchiveScreen();
    } else {
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to restore goal. Please try again.');
      }
    }
  } catch (error) {
    console.error('[Archive] Error restoring goal:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred. Please try again.');
    }
  }
}

/**
 * Handle permanently deleting an archived goal
 * @param {string} goalId - The archived goal ID to delete permanently
 */
async function handleDeleteArchivedGoal(goalId) {
  const archivedGoal = state.archivedGoals.find(g => g.id === goalId);
  if (!archivedGoal) {
    console.error('[Archive] Archived goal not found:', goalId);
    if (callbacks.showFormError) {
      callbacks.showFormError('Goal not found. Please try again.');
    }
    return;
  }

  console.log('[Archive] Permanently deleting archived goal:', archivedGoal.title);

  try {
    const success = await deleteArchivedGoal(goalId);

    if (success) {
      // Update local state
      state.archivedGoals = state.archivedGoals.filter(g => g.id !== goalId);

      console.log('[Archive] Goal permanently deleted:', archivedGoal.title);
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback(`"${archivedGoal.title}" permanently deleted.`);
      }

      // Re-render the archive screen
      renderArchiveScreen();
    } else {
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to delete goal. Please try again.');
      }
    }
  } catch (error) {
    console.error('[Archive] Error deleting archived goal:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred. Please try again.');
    }
  }
}
