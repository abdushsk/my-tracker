/**
 * Drag-to-Reorder Feature (US-059)
 * Live dragging - card follows cursor and other cards shift in real-time
 */

import { state } from '../state.js';
import { saveGoals } from '../../utils/storage.js';

// =============================================================================
// Callback Registration
// =============================================================================

const callbacks = {
  renderCurrentScreen: null
};

export function registerDragDropCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Drag State
// =============================================================================

let isDragging = false;
let draggedCard = null;
let draggedGoalId = null;
let dragClone = null;
let placeholder = null;
let startY = 0;
let startX = 0;
let offsetY = 0;
let offsetX = 0;
let goalsList = null;

// =============================================================================
// Cleanup Helpers
// =============================================================================

/**
 * Clean up any orphaned drag elements from previous drag sessions
 * This ensures no lingering elements from interrupted drags
 */
function cleanupOrphanedDragElements() {
  // Remove any orphaned drag clones
  document.querySelectorAll('.drag-clone').forEach(el => el.remove());

  // Remove any orphaned placeholders
  document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());

  // Remove dragging class from any cards
  document.querySelectorAll('.goal-card.dragging').forEach(el => {
    el.classList.remove('dragging');
  });

  // Reset state variables
  isDragging = false;
  dragClone = null;
  placeholder = null;
  draggedCard = null;
  draggedGoalId = null;
}

// =============================================================================
// Drag Event Handlers
// =============================================================================

/**
 * Attach drag and drop event listeners to goal cards
 * @param {HTMLElement} container - Container with goal cards
 */
export function attachDragDropListeners(container) {
  // Clean up any orphaned elements from previous drags
  cleanupOrphanedDragElements();

  const goalCards = container.querySelectorAll('.goal-card[draggable="true"]');

  goalCards.forEach(card => {
    // Remove native drag behavior
    card.setAttribute('draggable', 'false');

    // Use mouse events for live dragging
    card.addEventListener('mousedown', handleMouseDown);
    card.addEventListener('touchstart', handleTouchStart, { passive: false });
  });

  // Store reference to goals list
  goalsList = container.querySelector('.goals-list');
}

/**
 * Handle mouse down - start drag
 */
function handleMouseDown(e) {
  // Only left mouse button
  if (e.button !== 0) return;

  // Don't drag if clicking on buttons or inputs
  if (e.target.closest('button, input, .goal-controls')) return;

  const card = e.target.closest('.goal-card');
  if (!card) return;

  e.preventDefault();
  startDrag(card, e.clientX, e.clientY);

  // Add global listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Handle touch start - start drag
 */
function handleTouchStart(e) {
  // Don't drag if touching buttons or inputs
  if (e.target.closest('button, input, .goal-controls')) return;

  const card = e.target.closest('.goal-card');
  if (!card) return;

  const touch = e.touches[0];
  startDrag(card, touch.clientX, touch.clientY);

  // Add global listeners
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
}

/**
 * Start dragging a card
 */
function startDrag(card, clientX, clientY) {
  // Ensure any previous drag is cleaned up first
  if (isDragging) {
    cleanupOrphanedDragElements();
  }

  isDragging = true;
  draggedCard = card;
  draggedGoalId = card.getAttribute('data-goal-id');

  const rect = card.getBoundingClientRect();
  startX = clientX;
  startY = clientY;
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;

  // Create a clone that will follow the cursor (preserve all classes)
  dragClone = card.cloneNode(true);
  dragClone.classList.add('drag-clone');
  dragClone.classList.remove('dragging');
  dragClone.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    z-index: 1000;
    pointer-events: none;
    transform: scale(1.03);
    box-shadow: 0 12px 28px rgba(0,0,0,0.15);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  `;
  document.body.appendChild(dragClone);

  // Create placeholder
  placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  placeholder.style.height = `${rect.height}px`;

  // Hide original card and insert placeholder
  card.classList.add('dragging');
  card.parentNode.insertBefore(placeholder, card);

  // Animate clone scale
  requestAnimationFrame(() => {
    dragClone.style.transform = 'scale(1.05)';
  });
}

/**
 * Handle mouse move - update drag position
 */
function handleMouseMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  updateDragPosition(e.clientX, e.clientY);
}

/**
 * Handle touch move - update drag position
 */
function handleTouchMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  const touch = e.touches[0];
  updateDragPosition(touch.clientX, touch.clientY);
}

/**
 * Update the dragged card position and check for reordering
 */
function updateDragPosition(clientX, clientY) {
  if (!dragClone || !placeholder) return;

  // Move the clone to follow cursor
  const cloneTop = clientY - offsetY;
  dragClone.style.left = `${clientX - offsetX}px`;
  dragClone.style.top = `${cloneTop}px`;

  // Find which card we're over and move placeholder
  if (!goalsList) return;

  const cards = Array.from(goalsList.querySelectorAll('.goal-card:not(.dragging)'));
  if (cards.length === 0) return;

  // Use the center of the dragged clone for position comparison
  // This feels more natural - the card slots in based on where its center is
  const dragCenterY = cloneTop + (placeholder.offsetHeight / 2);

  // Find the first card whose midpoint is below our drag center
  let insertBeforeCard = null;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (dragCenterY < midY) {
      insertBeforeCard = card;
      break;
    }
  }

  // Move placeholder to new position
  if (insertBeforeCard) {
    goalsList.insertBefore(placeholder, insertBeforeCard);
  } else {
    goalsList.appendChild(placeholder);
  }
}

/**
 * Handle mouse up - end drag
 */
function handleMouseUp(e) {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  endDrag();
}

/**
 * Handle touch end - end drag
 */
function handleTouchEnd(e) {
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  endDrag();
}

/**
 * End the drag operation and finalize position
 */
async function endDrag() {
  if (!isDragging) return;
  isDragging = false;

  // Animate clone back to placeholder position
  if (dragClone && placeholder) {
    const placeholderRect = placeholder.getBoundingClientRect();

    dragClone.style.transition = 'all 0.2s ease';
    dragClone.style.transform = 'scale(1)';
    dragClone.style.left = `${placeholderRect.left}px`;
    dragClone.style.top = `${placeholderRect.top}px`;
    dragClone.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';

    // Wait for animation then clean up
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Calculate new order based on placeholder position
  if (goalsList && placeholder && draggedGoalId) {
    const allElements = Array.from(goalsList.children);
    let insertIndex = 0;

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el === placeholder) break;
      if (el.classList.contains('goal-card') && !el.classList.contains('dragging')) {
        insertIndex++;
      }
    }

    // Reorder goals array
    const draggedIndex = state.goals.findIndex(g => g.id === draggedGoalId);
    if (draggedIndex !== -1) {
      const [draggedGoal] = state.goals.splice(draggedIndex, 1);

      // Insert at the calculated position
      // No adjustment needed - insertIndex is the count of non-dragging cards before placeholder
      // which directly maps to the correct array index after removal
      state.goals.splice(insertIndex, 0, draggedGoal);

      // Update order property
      state.goals.forEach((goal, index) => {
        goal.order = index;
      });

      // Save and re-render
      await saveGoals(state.goals);
    }
  }

  // Clean up
  if (dragClone) {
    dragClone.remove();
    dragClone = null;
  }

  if (placeholder) {
    placeholder.remove();
    placeholder = null;
  }

  if (draggedCard) {
    draggedCard.classList.remove('dragging');
    draggedCard = null;
  }

  draggedGoalId = null;
  goalsList = null;

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}

// Legacy export for compatibility
export async function reorderGoals(draggedId, targetId, dropAbove) {
  const draggedIndex = state.goals.findIndex(g => g.id === draggedId);
  if (draggedIndex === -1) return;

  const [draggedGoal] = state.goals.splice(draggedIndex, 1);

  if (targetId === null) {
    state.goals.push(draggedGoal);
  } else {
    let targetIndex = state.goals.findIndex(g => g.id === targetId);
    if (targetIndex === -1) {
      state.goals.push(draggedGoal);
    } else {
      if (!dropAbove) targetIndex++;
      state.goals.splice(targetIndex, 0, draggedGoal);
    }
  }

  state.goals.forEach((goal, index) => {
    goal.order = index;
  });

  await saveGoals(state.goals);

  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }
}
