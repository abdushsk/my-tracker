/**
 * Template Gallery Screen (US-066)
 * Shows built-in and custom templates for quick goal creation
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  createGoal
} from '../../utils/models.js';
import {
  saveGoals,
  deleteTemplate,
  addTemplate,
  getTemplates
} from '../../utils/storage.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showScreen: null,
  showSuccessFeedback: null,
  showFormError: null,
  getGoalTypeIcon: null,
  capitalizeFirst: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerTemplatesCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Template Gallery Screen Rendering
// =============================================================================

/**
 * Render the Template Gallery screen
 * Shows built-in and custom templates for quick goal creation
 */
export function renderTemplateGalleryScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.TEMPLATE_GALLERY]);
  if (!screen) return;

  // Group templates by category
  const groupedTemplates = groupTemplatesByCategory(state.templates);
  const customTemplates = state.templates.filter(t => !t.isBuiltIn);

  screen.innerHTML = `
    <div class="template-gallery-screen">
      <header class="screen-header template-gallery-header">
        <button class="back-btn" id="template-gallery-back-btn" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 class="template-gallery-title">Goal Templates</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="template-gallery-content">
        <p class="template-gallery-intro">Choose a template to quickly create a new goal</p>

        ${Object.entries(groupedTemplates).map(([categoryId, templates]) => {
          const category = state.categories.find(c => c.id === categoryId);
          const categoryName = category ? category.name : 'Uncategorized';
          const categoryColor = category ? category.color : 'var(--text-muted)';
          return `
            <div class="template-category-section">
              <h2 class="template-category-title">
                <span class="template-category-dot" style="background-color: ${categoryColor}"></span>
                ${categoryName}
              </h2>
              <div class="template-grid">
                ${templates.map(template => renderTemplateCard(template)).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${customTemplates.length > 0 ? `
          <div class="template-category-section custom-templates-section">
            <h2 class="template-category-title">
              <span class="template-category-dot" style="background-color: var(--secondary)"></span>
              My Templates
            </h2>
            <div class="template-grid">
              ${customTemplates.map(template => renderTemplateCard(template, true)).join('')}
            </div>
          </div>
        ` : ''}
      </main>
    </div>
  `;

  // Attach event listeners
  attachTemplateGalleryListeners(screen);

  console.log('[TemplateGallery] Rendered with', state.templates.length, 'templates');
}

/**
 * Group templates by category
 * @param {Array} templates - Array of template objects
 * @returns {Object} Templates grouped by category ID
 */
function groupTemplatesByCategory(templates) {
  const builtInTemplates = templates.filter(t => t.isBuiltIn);
  const grouped = {};

  builtInTemplates.forEach(template => {
    const categoryId = template.category || 'uncategorized';
    if (!grouped[categoryId]) {
      grouped[categoryId] = [];
    }
    grouped[categoryId].push(template);
  });

  return grouped;
}

/**
 * Render a single template card
 * @param {Object} template - The template object
 * @param {boolean} isCustom - Whether this is a custom (user-created) template
 * @returns {string} HTML string for the template card
 */
function renderTemplateCard(template, isCustom = false) {
  const typeIcon = callbacks.getGoalTypeIcon ? callbacks.getGoalTypeIcon(template.type) : '';
  const targetDisplay = formatTemplateTarget(template);
  const timeframeLabel = callbacks.capitalizeFirst ? callbacks.capitalizeFirst(template.timeframe) : template.timeframe;

  return `
    <div class="template-card ${isCustom ? 'custom-template' : ''}" data-template-id="${template.id}">
      <div class="template-card-header">
        <span class="template-type-icon">${typeIcon}</span>
        <h3 class="template-title">${escapeHtml(template.title)}</h3>
      </div>
      <div class="template-card-body">
        <div class="template-details">
          <span class="template-target">${targetDisplay}</span>
          <span class="template-timeframe">${timeframeLabel}</span>
        </div>
      </div>
      <div class="template-card-actions">
        <button class="btn btn-sm btn-primary template-use-btn" data-template-id="${template.id}" title="Create goal from this template">
          Use Template
        </button>
        ${isCustom ? `
          <button class="btn btn-sm btn-ghost template-delete-btn" data-template-id="${template.id}" title="Delete template">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Format template target for display
 * @param {Object} template - The template object
 * @returns {string} Formatted target string
 */
function formatTemplateTarget(template) {
  switch (template.type) {
    case GOAL_TYPES.TIMER:
      const hours = Math.floor(template.target / 3600);
      const minutes = Math.floor((template.target % 3600) / 60);
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${minutes} min`;
      }
    case GOAL_TYPES.COUNTER:
      return `Target: ${template.target.toLocaleString()}`;
    case GOAL_TYPES.CHECKBOX:
      return 'Complete once';
    default:
      return '';
  }
}

// =============================================================================
// Template Gallery Event Handlers
// =============================================================================

/**
 * Attach event listeners for template gallery
 * @param {HTMLElement} screen - The screen element
 */
function attachTemplateGalleryListeners(screen) {
  // Back button
  const backBtn = screen.querySelector('#template-gallery-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (callbacks.showScreen) {
        callbacks.showScreen(SCREENS.MANAGE_GOALS);
      }
    });
  }

  // Use template buttons
  const useButtons = screen.querySelectorAll('.template-use-btn');
  useButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const templateId = btn.getAttribute('data-template-id');
      if (templateId) {
        await createGoalFromTemplate(templateId);
      }
    });
  });

  // Delete template buttons (for custom templates)
  const deleteButtons = screen.querySelectorAll('.template-delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const templateId = btn.getAttribute('data-template-id');
      if (templateId) {
        await handleDeleteTemplate(templateId);
      }
    });
  });
}

/**
 * Create a goal from a template
 * @param {string} templateId - The template ID
 */
async function createGoalFromTemplate(templateId) {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) {
    console.error('[Template] Template not found:', templateId);
    if (callbacks.showFormError) {
      callbacks.showFormError('Template not found. Please try again.');
    }
    return;
  }

  console.log('[Template] Creating goal from template:', template.title);

  try {
    // Create new goal from template
    const newGoal = createGoal({
      title: template.title,
      type: template.type,
      target: template.target,
      timeframe: template.timeframe,
      category: template.category,
      order: state.goals.length
    });

    // Save to storage
    const updatedGoals = [...state.goals, newGoal];
    const success = await saveGoals(updatedGoals);

    if (success) {
      state.goals = updatedGoals;
      console.log('[Template] Goal created from template:', newGoal);
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback(`Goal "${template.title}" created!`);
      }
      // Navigate to Manage Goals to see the new goal
      if (callbacks.showScreen) {
        callbacks.showScreen(SCREENS.MANAGE_GOALS);
      }
    } else {
      console.error('[Template] Failed to save new goal');
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to create goal. Please try again.');
      }
    }
  } catch (error) {
    console.error('[Template] Error creating goal from template:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred. Please try again.');
    }
  }
}

/**
 * Handle deleting a custom template
 * @param {string} templateId - The template ID to delete
 */
async function handleDeleteTemplate(templateId) {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) return;

  // Confirm deletion
  if (!confirm(`Delete the "${template.title}" template? This cannot be undone.`)) {
    return;
  }

  console.log('[Template] Deleting template:', templateId);

  try {
    const success = await deleteTemplate(templateId);
    if (success) {
      // Update local state
      state.templates = state.templates.filter(t => t.id !== templateId);
      console.log('[Template] Template deleted successfully');
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback('Template deleted');
      }
      // Re-render the screen
      renderTemplateGalleryScreen();
    } else {
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to delete template. Please try again.');
      }
    }
  } catch (error) {
    console.error('[Template] Error deleting template:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred. Please try again.');
    }
  }
}

/**
 * Handle saving a goal as a template
 * @param {string} goalId - The goal ID to save as template
 */
export async function handleSaveAsTemplate(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[Template] Goal not found:', goalId);
    if (callbacks.showFormError) {
      callbacks.showFormError('Goal not found. Please try again.');
    }
    return;
  }

  console.log('[Template] Saving goal as template:', goal.title);

  try {
    // Create template from goal
    const templateData = {
      title: goal.title,
      type: goal.type,
      target: goal.target,
      timeframe: goal.timeframe,
      category: goal.category
    };

    const success = await addTemplate(templateData);

    if (success) {
      // Reload templates to update state
      state.templates = await getTemplates();
      console.log('[Template] Goal saved as template:', goal.title);
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback(`"${goal.title}" saved as template!`);
      }
    } else {
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to save template. Please try again.');
      }
    }
  } catch (error) {
    console.error('[Template] Error saving goal as template:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred. Please try again.');
    }
  }
}
