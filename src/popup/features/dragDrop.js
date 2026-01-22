/**
 * Drag-to-Reorder Feature (US-059)
 * Allows users to reorder daily goals by dragging
 */

import { state } from '../state.js';
import { saveGoals } from '../../utils/storage.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  renderCurrentScreen: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerDragDropCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Drag State
// =============================================================================

// Track the currently dragged element
let draggedGoalCard = null;
let draggedGoalId = null;
let dragPlaceholder = null;

// =============================================================================
// Drag Event Handlers
// =============================================================================

/**
 * Attach drag and drop event listeners to goal cards
 * @param {HTMLElement} container - Container with goal cards
 */
export function attachDragDropListeners(container) {
  const goalCards = container.querySelectorAll('.goal-card[draggable="true"]');

  goalCards.forEach(card => {
    // Dragstart - when user starts dragging
    card.addEventListener('dragstart', handleDragStart);

    // Dragend - when drag operation ends
    card.addEventListener('dragend', handleDragEnd);

    // Dragover - when dragging over another card
    card.addEventListener('dragover', handleDragOver);

    // Dragenter - when entering another card's space
    card.addEventListener('dragenter', handleDragEnter);

    // Dragleave - when leaving a card's space
    card.addEventListener('dragleave', handleDragLeave);

    // Drop - when dropping on a card
    card.addEventListener('drop', handleDrop);
  });

  // Also attach to the goals list container for drops at the end
  const goalsList = container.querySelector('.goals-list');
  if (goalsList) {
    goalsList.addEventListener('dragover', handleGoalsListDragOver);
    goalsList.addEventListener('drop', handleGoalsListDrop);
  }
}

/**
 * Handle drag start event
 * @param {DragEvent} e - The drag event
 */
function handleDragStart(e) {
  const card = e.target.closest('.goal-card');
  if (!card) return;

  draggedGoalCard = card;
  draggedGoalId = card.getAttribute('data-goal-id');

  // Set drag data
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedGoalId);

  // Add dragging class after a small delay for visual feedback
  setTimeout(() => {
    card.classList.add('dragging');
  }, 0);

  // Create placeholder element
  dragPlaceholder = document.createElement('div');
  dragPlaceholder.className = 'drag-placeholder';
  dragPlaceholder.style.height = `${card.offsetHeight}px`;
}

/**
 * Handle drag end event
 * @param {DragEvent} e - The drag event
 */
function handleDragEnd(e) {
  const card = e.target.closest('.goal-card');
  if (card) {
    card.classList.remove('dragging');
  }

  // Remove any drag-over classes from all cards
  document.querySelectorAll('.goal-card.drag-over').forEach(c => {
    c.classList.remove('drag-over');
  });

  // Remove placeholder if it exists
  if (dragPlaceholder && dragPlaceholder.parentNode) {
    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
  }

  // Reset drag state
  draggedGoalCard = null;
  draggedGoalId = null;
  dragPlaceholder = null;
}

/**
 * Handle drag over event
 * @param {DragEvent} e - The drag event
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const card = e.target.closest('.goal-card');
  if (!card || card === draggedGoalCard) return;

  // Determine if we're in the top or bottom half of the card
  const rect = card.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const isAbove = e.clientY < midpoint;

  // Update visual indicator
  card.classList.remove('drag-over-top', 'drag-over-bottom');
  card.classList.add(isAbove ? 'drag-over-top' : 'drag-over-bottom');
}

/**
 * Handle drag enter event
 * @param {DragEvent} e - The drag event
 */
function handleDragEnter(e) {
  e.preventDefault();
  const card = e.target.closest('.goal-card');
  if (card && card !== draggedGoalCard) {
    card.classList.add('drag-over');
  }
}

/**
 * Handle drag leave event
 * @param {DragEvent} e - The drag event
 */
function handleDragLeave(e) {
  const card = e.target.closest('.goal-card');
  if (!card) return;

  // Only remove class if we're actually leaving the card (not entering a child)
  const relatedTarget = e.relatedTarget;
  if (!card.contains(relatedTarget)) {
    card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
  }
}

/**
 * Handle drop event on a goal card
 * @param {DragEvent} e - The drag event
 */
async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const targetCard = e.target.closest('.goal-card');
  if (!targetCard || !draggedGoalId) return;

  const targetGoalId = targetCard.getAttribute('data-goal-id');
  if (targetGoalId === draggedGoalId) return;

  // Determine drop position (above or below target)
  const rect = targetCard.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const dropAbove = e.clientY < midpoint;

  // Reorder the goals
  await reorderGoals(draggedGoalId, targetGoalId, dropAbove);

  // Clean up
  targetCard.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
}

/**
 * Handle drag over event on the goals list container
 * @param {DragEvent} e - The drag event
 */
function handleGoalsListDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop event on the goals list container (for dropping at end)
 * @param {DragEvent} e - The drag event
 */
async function handleGoalsListDrop(e) {
  // Only handle if not dropped on a card
  if (e.target.closest('.goal-card')) return;

  e.preventDefault();

  if (!draggedGoalId) return;

  // Move to end of list
  await reorderGoals(draggedGoalId, null, false);
}

/**
 * Reorder goals array and persist to storage
 * @param {string} draggedId - ID of the dragged goal
 * @param {string|null} targetId - ID of the target goal (null for end of list)
 * @param {boolean} dropAbove - Whether to drop above or below the target
 */
export async function reorderGoals(draggedId, targetId, dropAbove) {
  // Find the dragged goal
  const draggedIndex = state.goals.findIndex(g => g.id === draggedId);
  if (draggedIndex === -1) return;

  // Remove the dragged goal from array
  const [draggedGoal] = state.goals.splice(draggedIndex, 1);

  if (targetId === null) {
    // Move to end of list
    state.goals.push(draggedGoal);
  } else {
    // Find target index (after removal of dragged)
    let targetIndex = state.goals.findIndex(g => g.id === targetId);
    if (targetIndex === -1) {
      // Target not found, add to end
      state.goals.push(draggedGoal);
    } else {
      // Insert at correct position
      if (!dropAbove) {
        targetIndex++;
      }
      state.goals.splice(targetIndex, 0, draggedGoal);
    }
  }

  // Update order property for all goals
  state.goals.forEach((goal, index) => {
    goal.order = index;
  });

  // Persist to storage
  await saveGoals(state.goals);

  // Re-render the screen
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}
