/**
 * Storage Utility Module
 * Helper functions for Chrome storage API operations
 * Uses chrome.storage.local for persistent storage
 */

// Storage keys
const STORAGE_KEYS = {
  GOALS: 'goals',
  ACTIVITY_LOG: 'activityLog',
  SETTINGS: 'settings',
  HISTORY: 'history',
  ACTIVE_TIMERS: 'activeTimers',
  STREAK_DATA: 'streakData',
  CATEGORIES: 'categories',
  TEMPLATES: 'templates', // US-066: Goal templates
  ARCHIVED_GOALS: 'archivedGoals', // US-069: Archived goals
  ACHIEVEMENTS: 'achievements', // US-080: Achievement progress data
  DAILY_CHALLENGES: 'dailyChallenges', // US-081: Daily challenges data
  XP_DATA: 'xpData' // US-083: Level and XP system data
};

/**
 * Default category definitions
 * Each category has an id, name, and color scheme
 * @type {Array<{id: string, name: string, color: string, light: string}>}
 */
const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#2196F3', light: '#E3F2FD' },
  { id: 'health', name: 'Health', color: '#4CAF50', light: '#E8F5E9' },
  { id: 'learning', name: 'Learning', color: '#9C27B0', light: '#F3E5F5' },
  { id: 'personal', name: 'Personal', color: '#FF9800', light: '#FFF3E0' }
];

/**
 * Get all goals from storage
 * @returns {Promise<Array>} Array of goal objects
 */
async function getGoals() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.GOALS);
    return result[STORAGE_KEYS.GOALS] || [];
  } catch (error) {
    console.error('Error getting goals:', error);
    return [];
  }
}

/**
 * Save goals to storage
 * @param {Array} goals - Array of goal objects to save
 * @returns {Promise<boolean>} Success status
 */
async function saveGoals(goals) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.GOALS]: goals });
    return true;
  } catch (error) {
    console.error('Error saving goals:', error);
    return false;
  }
}

/**
 * Get activity log from storage
 * @returns {Promise<Array>} Array of activity log entries
 */
async function getActivityLog() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG);
    return result[STORAGE_KEYS.ACTIVITY_LOG] || [];
  } catch (error) {
    console.error('Error getting activity log:', error);
    return [];
  }
}

/**
 * Save activity log to storage
 * @param {Array} log - Array of activity log entries to save
 * @returns {Promise<boolean>} Success status
 */
async function saveActivityLog(log) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_LOG]: log });
    return true;
  } catch (error) {
    console.error('Error saving activity log:', error);
    return false;
  }
}

/**
 * Get settings from storage
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || getDefaultSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Get history from storage
 * @returns {Promise<Array>} Array of history entries
 */
async function getHistory() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

/**
 * Save history to storage
 * @param {Array} history - Array of history entries to save
 * @returns {Promise<boolean>} Success status
 */
async function saveHistory(history) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
}

/**
 * Get active timers from storage
 * @returns {Promise<Object>} Object mapping goalId to timer state
 */
async function getActiveTimers() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_TIMERS);
    return result[STORAGE_KEYS.ACTIVE_TIMERS] || {};
  } catch (error) {
    console.error('Error getting active timers:', error);
    return {};
  }
}

/**
 * Save active timers to storage
 * @param {Object} timers - Object mapping goalId to timer state
 * @returns {Promise<boolean>} Success status
 */
async function saveActiveTimers(timers) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_TIMERS]: timers });
    return true;
  } catch (error) {
    console.error('Error saving active timers:', error);
    return false;
  }
}

/**
 * Add a single activity log entry
 * @param {Object} entry - Activity log entry to add
 * @returns {Promise<boolean>} Success status
 */
async function addActivityLogEntry(entry) {
  try {
    const log = await getActivityLog();
    log.push(entry);
    return await saveActivityLog(log);
  } catch (error) {
    console.error('Error adding activity log entry:', error);
    return false;
  }
}

/**
 * Get a single goal by ID
 * @param {string} goalId - The goal ID to find
 * @returns {Promise<Object|null>} The goal object or null if not found
 */
async function getGoalById(goalId) {
  try {
    const goals = await getGoals();
    return goals.find(goal => goal.id === goalId) || null;
  } catch (error) {
    console.error('Error getting goal by ID:', error);
    return null;
  }
}

/**
 * Update a single goal
 * @param {string} goalId - The goal ID to update
 * @param {Object} updates - Object with properties to update
 * @returns {Promise<boolean>} Success status
 */
async function updateGoal(goalId, updates) {
  try {
    const goals = await getGoals();
    const index = goals.findIndex(goal => goal.id === goalId);
    if (index === -1) {
      console.error('Goal not found:', goalId);
      return false;
    }
    goals[index] = { ...goals[index], ...updates };
    return await saveGoals(goals);
  } catch (error) {
    console.error('Error updating goal:', error);
    return false;
  }
}

/**
 * Delete a goal by ID
 * @param {string} goalId - The goal ID to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteGoal(goalId) {
  try {
    const goals = await getGoals();
    const filteredGoals = goals.filter(goal => goal.id !== goalId);
    return await saveGoals(filteredGoals);
  } catch (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
}

/**
 * Clear all storage data
 * @returns {Promise<boolean>} Success status
 */
async function clearAllData() {
  try {
    await chrome.storage.local.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}

/**
 * Get default settings object
 * @returns {Object} Default settings
 */
function getDefaultSettings() {
  return {
    soundEnabled: true,
    soundVolume: 0.5,
    theme: 'auto', // 'light', 'dark', 'auto'
    notificationsEnabled: true,
    reminderTime: '09:00',
    compactViewEnabled: false, // US-056: Compact view mode for Daily Goals
    // US-075: Customizable Reset Times (HH:MM format in user's local timezone)
    dailyResetTime: '00:00',   // Default midnight for daily goals
    weeklyResetTime: '00:00',  // Default midnight Monday for weekly goals
    monthlyResetTime: '00:00', // Default midnight 1st of month for monthly goals
    yearlyResetTime: '00:00',  // Default midnight January 1st for yearly goals
    // US-076: Browser Notifications for Reminders
    dailyReminderEnabled: false,     // Enable daily reminder notifications
    dailyReminderTime: '09:00',      // Time for daily reminder (HH:MM format)
    goalReminderEnabled: false,      // Enable per-goal reminders
    quietHoursEnabled: false,        // Enable quiet hours
    quietHoursStart: '22:00',        // Start of quiet hours (HH:MM format)
    quietHoursEnd: '07:00',          // End of quiet hours (HH:MM format)
    // US-077: Motivational Quotes
    quotesEnabled: true,             // Show motivational quotes in empty state, completion, and weekly review
    // US-081: Daily Challenges
    dailyChallengesEnabled: true     // Enable daily challenges feature
  };
}

/**
 * Get streak data from storage
 * @returns {Promise<Object>} Streak data object with currentStreak, bestStreak, lastCompletionDate
 */
async function getStreakData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STREAK_DATA);
    return result[STORAGE_KEYS.STREAK_DATA] || getDefaultStreakData();
  } catch (error) {
    console.error('Error getting streak data:', error);
    return getDefaultStreakData();
  }
}

/**
 * Save streak data to storage
 * @param {Object} streakData - Streak data object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveStreakData(streakData) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.STREAK_DATA]: streakData });
    return true;
  } catch (error) {
    console.error('Error saving streak data:', error);
    return false;
  }
}

/**
 * Get default streak data object
 * @returns {Object} Default streak data
 */
function getDefaultStreakData() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastCompletionDate: null
  };
}

/**
 * Get categories from storage
 * @returns {Promise<Array>} Array of category objects
 */
async function getCategories() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    return result[STORAGE_KEYS.CATEGORIES] || [...DEFAULT_CATEGORIES];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [...DEFAULT_CATEGORIES];
  }
}

/**
 * Save categories to storage
 * @param {Array} categories - Array of category objects to save
 * @returns {Promise<boolean>} Success status
 */
async function saveCategories(categories) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    return true;
  } catch (error) {
    console.error('Error saving categories:', error);
    return false;
  }
}

/**
 * Get default categories
 * @returns {Array} Default category array
 */
function getDefaultCategories() {
  return [...DEFAULT_CATEGORIES];
}

/**
 * Add a new category
 * @param {Object} category - Category object with id, name, color, light
 * @returns {Promise<boolean>} Success status
 */
async function addCategory(category) {
  try {
    const categories = await getCategories();
    categories.push(category);
    return await saveCategories(categories);
  } catch (error) {
    console.error('Error adding category:', error);
    return false;
  }
}

/**
 * Delete a category by ID
 * @param {string} categoryId - The category ID to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteCategory(categoryId) {
  try {
    const categories = await getCategories();
    const filteredCategories = categories.filter(cat => cat.id !== categoryId);
    return await saveCategories(filteredCategories);
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

/**
 * Get a category by ID
 * @param {string} categoryId - The category ID to find
 * @returns {Promise<Object|null>} The category object or null
 */
async function getCategoryById(categoryId) {
  try {
    const categories = await getCategories();
    return categories.find(cat => cat.id === categoryId) || null;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
}

// =============================================================================
// US-066: Goal Templates
// =============================================================================

/**
 * Built-in template definitions
 * Each template has: id, title, type, target, timeframe, category, isBuiltIn
 * Target for timer is in seconds (3600 = 1 hour)
 * @type {Array<Object>}
 */
const BUILT_IN_TEMPLATES = [
  // Health category
  { id: 'tpl-30min-reading', title: '30 Minutes Reading', type: 'timer', target: 1800, timeframe: 'daily', category: 'learning', isBuiltIn: true },
  { id: 'tpl-10k-steps', title: '10,000 Steps', type: 'counter', target: 10000, timeframe: 'daily', category: 'health', isBuiltIn: true },
  { id: 'tpl-8-glasses-water', title: '8 Glasses of Water', type: 'counter', target: 8, timeframe: 'daily', category: 'health', isBuiltIn: true },
  { id: 'tpl-1hr-exercise', title: '1 Hour Exercise', type: 'timer', target: 3600, timeframe: 'daily', category: 'health', isBuiltIn: true },
  { id: 'tpl-meditate', title: 'Meditate', type: 'checkbox', target: 1, timeframe: 'daily', category: 'health', isBuiltIn: true },
  // Work category
  { id: 'tpl-2hr-deep-work', title: '2 Hours Deep Work', type: 'timer', target: 7200, timeframe: 'daily', category: 'work', isBuiltIn: true },
  { id: 'tpl-inbox-zero', title: 'Inbox Zero', type: 'checkbox', target: 1, timeframe: 'daily', category: 'work', isBuiltIn: true },
  { id: 'tpl-5-tasks', title: 'Complete 5 Tasks', type: 'counter', target: 5, timeframe: 'daily', category: 'work', isBuiltIn: true },
  // Learning category
  { id: 'tpl-1hr-study', title: '1 Hour Study', type: 'timer', target: 3600, timeframe: 'daily', category: 'learning', isBuiltIn: true },
  { id: 'tpl-practice-instrument', title: 'Practice Instrument', type: 'timer', target: 1800, timeframe: 'daily', category: 'learning', isBuiltIn: true },
  // Personal category
  { id: 'tpl-journal', title: 'Write in Journal', type: 'checkbox', target: 1, timeframe: 'daily', category: 'personal', isBuiltIn: true },
  { id: 'tpl-no-screen-before-bed', title: 'No Screen Before Bed', type: 'checkbox', target: 1, timeframe: 'daily', category: 'personal', isBuiltIn: true }
];

/**
 * Get all templates (built-in + custom)
 * @returns {Promise<Array>} Array of template objects
 */
async function getTemplates() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES);
    const customTemplates = result[STORAGE_KEYS.TEMPLATES] || [];
    // Combine built-in templates with custom templates
    return [...BUILT_IN_TEMPLATES, ...customTemplates];
  } catch (error) {
    console.error('Error getting templates:', error);
    return [...BUILT_IN_TEMPLATES];
  }
}

/**
 * Get only custom templates (user-created)
 * @returns {Promise<Array>} Array of custom template objects
 */
async function getCustomTemplates() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES);
    return result[STORAGE_KEYS.TEMPLATES] || [];
  } catch (error) {
    console.error('Error getting custom templates:', error);
    return [];
  }
}

/**
 * Save custom templates to storage
 * @param {Array} templates - Array of custom template objects to save
 * @returns {Promise<boolean>} Success status
 */
async function saveCustomTemplates(templates) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: templates });
    return true;
  } catch (error) {
    console.error('Error saving custom templates:', error);
    return false;
  }
}

/**
 * Get built-in templates
 * @returns {Array} Array of built-in template objects
 */
function getBuiltInTemplates() {
  return [...BUILT_IN_TEMPLATES];
}

/**
 * Add a custom template
 * @param {Object} template - Template object with title, type, target, timeframe, category
 * @returns {Promise<boolean>} Success status
 */
async function addTemplate(template) {
  try {
    const customTemplates = await getCustomTemplates();
    const newTemplate = {
      ...template,
      id: `tpl-custom-${Date.now()}`,
      isBuiltIn: false
    };
    customTemplates.push(newTemplate);
    return await saveCustomTemplates(customTemplates);
  } catch (error) {
    console.error('Error adding template:', error);
    return false;
  }
}

/**
 * Delete a custom template by ID
 * @param {string} templateId - The template ID to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteTemplate(templateId) {
  try {
    // Don't allow deleting built-in templates
    if (BUILT_IN_TEMPLATES.some(t => t.id === templateId)) {
      console.warn('Cannot delete built-in template:', templateId);
      return false;
    }
    const customTemplates = await getCustomTemplates();
    const filteredTemplates = customTemplates.filter(t => t.id !== templateId);
    return await saveCustomTemplates(filteredTemplates);
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

/**
 * Get a template by ID
 * @param {string} templateId - The template ID to find
 * @returns {Promise<Object|null>} The template object or null
 */
async function getTemplateById(templateId) {
  try {
    const templates = await getTemplates();
    return templates.find(t => t.id === templateId) || null;
  } catch (error) {
    console.error('Error getting template by ID:', error);
    return null;
  }
}

// =============================================================================
// US-069: Goal Archive System
// =============================================================================

/**
 * Get all archived goals from storage
 * @returns {Promise<Array>} Array of archived goal objects
 */
async function getArchivedGoals() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ARCHIVED_GOALS);
    return result[STORAGE_KEYS.ARCHIVED_GOALS] || [];
  } catch (error) {
    console.error('Error getting archived goals:', error);
    return [];
  }
}

/**
 * Save archived goals to storage
 * @param {Array} archivedGoals - Array of archived goal objects to save
 * @returns {Promise<boolean>} Success status
 */
async function saveArchivedGoals(archivedGoals) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ARCHIVED_GOALS]: archivedGoals });
    return true;
  } catch (error) {
    console.error('Error saving archived goals:', error);
    return false;
  }
}

/**
 * Archive a goal - moves it from active goals to archived goals
 * Preserves all goal data including progress history
 * @param {string} goalId - The goal ID to archive
 * @returns {Promise<boolean>} Success status
 */
async function archiveGoal(goalId) {
  try {
    const goals = await getGoals();
    const goalToArchive = goals.find(g => g.id === goalId);

    if (!goalToArchive) {
      console.error('Goal not found for archiving:', goalId);
      return false;
    }

    // Add archive metadata
    const archivedGoal = {
      ...goalToArchive,
      archivedAt: Date.now()
    };

    // Add to archived goals
    const archivedGoals = await getArchivedGoals();
    archivedGoals.push(archivedGoal);
    await saveArchivedGoals(archivedGoals);

    // Remove from active goals
    const remainingGoals = goals.filter(g => g.id !== goalId);
    await saveGoals(remainingGoals);

    console.log('Goal archived successfully:', goalId);
    return true;
  } catch (error) {
    console.error('Error archiving goal:', error);
    return false;
  }
}

/**
 * Restore an archived goal - moves it from archived back to active goals
 * Resets progress but preserves goal configuration
 * @param {string} goalId - The archived goal ID to restore
 * @returns {Promise<boolean>} Success status
 */
async function restoreArchivedGoal(goalId) {
  try {
    const archivedGoals = await getArchivedGoals();
    const goalToRestore = archivedGoals.find(g => g.id === goalId);

    if (!goalToRestore) {
      console.error('Archived goal not found:', goalId);
      return false;
    }

    // Remove archive metadata and reset progress for fresh start
    const restoredGoal = {
      ...goalToRestore,
      progress: 0,
      isActive: false,
      lastResetAt: Date.now()
    };
    delete restoredGoal.archivedAt;

    // Add to active goals
    const goals = await getGoals();
    goals.push(restoredGoal);
    await saveGoals(goals);

    // Remove from archived goals
    const remainingArchived = archivedGoals.filter(g => g.id !== goalId);
    await saveArchivedGoals(remainingArchived);

    console.log('Goal restored successfully:', goalId);
    return true;
  } catch (error) {
    console.error('Error restoring archived goal:', error);
    return false;
  }
}

/**
 * Permanently delete an archived goal
 * @param {string} goalId - The archived goal ID to delete permanently
 * @returns {Promise<boolean>} Success status
 */
async function deleteArchivedGoal(goalId) {
  try {
    const archivedGoals = await getArchivedGoals();
    const filteredArchived = archivedGoals.filter(g => g.id !== goalId);

    if (filteredArchived.length === archivedGoals.length) {
      console.warn('Archived goal not found for deletion:', goalId);
      return false;
    }

    await saveArchivedGoals(filteredArchived);
    console.log('Archived goal permanently deleted:', goalId);
    return true;
  } catch (error) {
    console.error('Error deleting archived goal:', error);
    return false;
  }
}

/**
 * Get an archived goal by ID
 * @param {string} goalId - The archived goal ID to find
 * @returns {Promise<Object|null>} The archived goal object or null
 */
async function getArchivedGoalById(goalId) {
  try {
    const archivedGoals = await getArchivedGoals();
    return archivedGoals.find(g => g.id === goalId) || null;
  } catch (error) {
    console.error('Error getting archived goal by ID:', error);
    return null;
  }
}

// ============================================
// US-070: Export/Import Data Functions
// ============================================

/**
 * Export all application data as a JSON object
 * Includes: goals, settings, categories, templates, archived goals, activity log, history, streak data
 * @returns {Promise<Object>} Export data object with version and timestamp
 */
async function exportAllData() {
  try {
    const [
      goals,
      settings,
      categories,
      customTemplates,
      archivedGoals,
      activityLog,
      history,
      streakData,
      achievements
    ] = await Promise.all([
      getGoals(),
      getSettings(),
      getCategories(),
      getCustomTemplates(),
      getArchivedGoals(),
      getActivityLog(),
      getHistory(),
      getStreakData(),
      getAchievements()
    ]);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        goals,
        settings,
        categories,
        customTemplates,
        archivedGoals,
        activityLog,
        history,
        streakData,
        achievements
      }
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Validate import data structure
 * @param {Object} importData - The data to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateImportData(importData) {
  const errors = [];

  // Check basic structure
  if (!importData || typeof importData !== 'object') {
    return { valid: false, errors: ['Invalid data format: expected an object'] };
  }

  // Check version
  if (!importData.version) {
    errors.push('Missing version field');
  }

  // Check data object
  if (!importData.data || typeof importData.data !== 'object') {
    return { valid: false, errors: ['Missing or invalid data field'] };
  }

  const { data } = importData;

  // Validate goals array
  if (data.goals !== undefined) {
    if (!Array.isArray(data.goals)) {
      errors.push('goals must be an array');
    } else {
      data.goals.forEach((goal, index) => {
        if (!goal.id) errors.push(`Goal at index ${index} is missing id`);
        if (!goal.title) errors.push(`Goal at index ${index} is missing title`);
        if (!['timer', 'counter', 'checkbox'].includes(goal.type)) {
          errors.push(`Goal at index ${index} has invalid type: ${goal.type}`);
        }
      });
    }
  }

  // Validate settings object
  if (data.settings !== undefined && typeof data.settings !== 'object') {
    errors.push('settings must be an object');
  }

  // Validate categories array
  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) {
      errors.push('categories must be an array');
    } else {
      data.categories.forEach((cat, index) => {
        if (!cat.id) errors.push(`Category at index ${index} is missing id`);
        if (!cat.name) errors.push(`Category at index ${index} is missing name`);
        if (!cat.color) errors.push(`Category at index ${index} is missing color`);
      });
    }
  }

  // Validate custom templates array
  if (data.customTemplates !== undefined && !Array.isArray(data.customTemplates)) {
    errors.push('customTemplates must be an array');
  }

  // Validate archived goals array
  if (data.archivedGoals !== undefined && !Array.isArray(data.archivedGoals)) {
    errors.push('archivedGoals must be an array');
  }

  // Validate activity log array
  if (data.activityLog !== undefined && !Array.isArray(data.activityLog)) {
    errors.push('activityLog must be an array');
  }

  // Validate history array
  if (data.history !== undefined && !Array.isArray(data.history)) {
    errors.push('history must be an array');
  }

  // Validate streak data object
  if (data.streakData !== undefined && typeof data.streakData !== 'object') {
    errors.push('streakData must be an object');
  }

  // Validate achievements array
  if (data.achievements !== undefined && !Array.isArray(data.achievements)) {
    errors.push('achievements must be an array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Import data with merge or replace strategy
 * @param {Object} importData - The validated import data
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Promise<{success: boolean, message: string, stats: Object}>}
 */
async function importAllData(importData, mode = 'merge') {
  try {
    const { data } = importData;
    const stats = {
      goalsImported: 0,
      categoriesImported: 0,
      templatesImported: 0,
      archivedGoalsImported: 0
    };

    if (mode === 'replace') {
      // Replace all data
      if (data.goals) {
        await saveGoals(data.goals);
        stats.goalsImported = data.goals.length;
      }
      if (data.settings) {
        await saveSettings(data.settings);
      }
      if (data.categories) {
        await saveCategories(data.categories);
        stats.categoriesImported = data.categories.length;
      }
      if (data.customTemplates) {
        await saveCustomTemplates(data.customTemplates);
        stats.templatesImported = data.customTemplates.length;
      }
      if (data.archivedGoals) {
        await saveArchivedGoals(data.archivedGoals);
        stats.archivedGoalsImported = data.archivedGoals.length;
      }
      if (data.activityLog) {
        await saveActivityLog(data.activityLog);
      }
      if (data.history) {
        await saveHistory(data.history);
      }
      if (data.streakData) {
        await saveStreakData(data.streakData);
      }
      if (data.achievements) {
        await saveAchievements(data.achievements);
      }
    } else {
      // Merge mode - add new items, skip duplicates

      // Merge goals (skip duplicates by ID)
      if (data.goals && data.goals.length > 0) {
        const existingGoals = await getGoals();
        const existingIds = new Set(existingGoals.map(g => g.id));
        const newGoals = data.goals.filter(g => !existingIds.has(g.id));
        if (newGoals.length > 0) {
          await saveGoals([...existingGoals, ...newGoals]);
          stats.goalsImported = newGoals.length;
        }
      }

      // Merge categories (skip duplicates by ID)
      if (data.categories && data.categories.length > 0) {
        const existingCategories = await getCategories();
        const existingCatIds = new Set(existingCategories.map(c => c.id));
        const newCategories = data.categories.filter(c => !existingCatIds.has(c.id));
        if (newCategories.length > 0) {
          await saveCategories([...existingCategories, ...newCategories]);
          stats.categoriesImported = newCategories.length;
        }
      }

      // Merge custom templates (skip duplicates by ID)
      if (data.customTemplates && data.customTemplates.length > 0) {
        const existingTemplates = await getCustomTemplates();
        const existingTemplateIds = new Set(existingTemplates.map(t => t.id));
        const newTemplates = data.customTemplates.filter(t => !existingTemplateIds.has(t.id));
        if (newTemplates.length > 0) {
          await saveCustomTemplates([...existingTemplates, ...newTemplates]);
          stats.templatesImported = newTemplates.length;
        }
      }

      // Merge archived goals (skip duplicates by ID)
      if (data.archivedGoals && data.archivedGoals.length > 0) {
        const existingArchived = await getArchivedGoals();
        const existingArchivedIds = new Set(existingArchived.map(g => g.id));
        const newArchived = data.archivedGoals.filter(g => !existingArchivedIds.has(g.id));
        if (newArchived.length > 0) {
          await saveArchivedGoals([...existingArchived, ...newArchived]);
          stats.archivedGoalsImported = newArchived.length;
        }
      }

      // For settings, merge individual properties (don't overwrite existing)
      if (data.settings) {
        const existingSettings = await getSettings();
        const mergedSettings = { ...data.settings, ...existingSettings };
        await saveSettings(mergedSettings);
      }

      // Merge activity log (append, avoiding exact duplicates by timestamp+goalId+action)
      if (data.activityLog && data.activityLog.length > 0) {
        const existingLog = await getActivityLog();
        const existingLogKeys = new Set(existingLog.map(e => `${e.timestamp}-${e.goalId}-${e.action}`));
        const newLogEntries = data.activityLog.filter(e =>
          !existingLogKeys.has(`${e.timestamp}-${e.goalId}-${e.action}`)
        );
        if (newLogEntries.length > 0) {
          await saveActivityLog([...existingLog, ...newLogEntries]);
        }
      }

      // Merge history (append, avoiding exact duplicates by date)
      if (data.history && data.history.length > 0) {
        const existingHistory = await getHistory();
        const existingDates = new Set(existingHistory.map(h => h.date));
        const newHistory = data.history.filter(h => !existingDates.has(h.date));
        if (newHistory.length > 0) {
          await saveHistory([...existingHistory, ...newHistory]);
        }
      }

      // For streak data, keep the better values
      if (data.streakData) {
        const existingStreak = await getStreakData();
        const mergedStreak = {
          currentStreak: Math.max(existingStreak.currentStreak || 0, data.streakData.currentStreak || 0),
          bestStreak: Math.max(existingStreak.bestStreak || 0, data.streakData.bestStreak || 0),
          lastCompletionDate: existingStreak.lastCompletionDate || data.streakData.lastCompletionDate
        };
        await saveStreakData(mergedStreak);
      }

      // For achievements, keep the one that has more unlocks
      if (data.achievements && data.achievements.length > 0) {
        const existingAchievements = await getAchievements();
        if (!existingAchievements) {
          await saveAchievements(data.achievements);
        } else {
          // Merge by keeping unlocked status from either source
          const mergedAchievements = existingAchievements.map(existing => {
            const imported = data.achievements.find(a => a.id === existing.id);
            if (!imported) return existing;
            // Keep the one that's unlocked, or keep better progress
            if (existing.unlockedAt && !imported.unlockedAt) return existing;
            if (!existing.unlockedAt && imported.unlockedAt) return imported;
            // Both unlocked or both not - keep the one with better progress
            return (imported.progress || 0) > (existing.progress || 0) ? imported : existing;
          });
          await saveAchievements(mergedAchievements);
        }
      }
    }

    return {
      success: true,
      message: mode === 'replace' ? 'Data replaced successfully' : 'Data merged successfully',
      stats
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      stats: {}
    };
  }
}

// =============================================================================
// US-080: Achievements and Badges System
// =============================================================================

/**
 * Get achievement progress from storage
 * @returns {Promise<Array>} Array of achievement progress objects
 */
async function getAchievements() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACHIEVEMENTS);
    return result[STORAGE_KEYS.ACHIEVEMENTS] || null;
  } catch (error) {
    console.error('Error getting achievements:', error);
    return null;
  }
}

/**
 * Save achievement progress to storage
 * @param {Array} achievements - Array of achievement progress objects
 * @returns {Promise<boolean>} Success status
 */
async function saveAchievements(achievements) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACHIEVEMENTS]: achievements });
    return true;
  } catch (error) {
    console.error('Error saving achievements:', error);
    return false;
  }
}

/**
 * Update a single achievement's progress
 * @param {string} achievementId - The achievement ID to update
 * @param {Object} updates - Object with properties to update (progress, unlockedAt)
 * @returns {Promise<boolean>} Success status
 */
async function updateAchievement(achievementId, updates) {
  try {
    const achievements = await getAchievements();
    if (!achievements) return false;

    const index = achievements.findIndex(a => a.id === achievementId);
    if (index === -1) {
      console.error('Achievement not found:', achievementId);
      return false;
    }

    achievements[index] = { ...achievements[index], ...updates };
    return await saveAchievements(achievements);
  } catch (error) {
    console.error('Error updating achievement:', error);
    return false;
  }
}

/**
 * Get a single achievement by ID
 * @param {string} achievementId - The achievement ID to find
 * @returns {Promise<Object|null>} The achievement progress object or null
 */
async function getAchievementById(achievementId) {
  try {
    const achievements = await getAchievements();
    if (!achievements) return null;
    return achievements.find(a => a.id === achievementId) || null;
  } catch (error) {
    console.error('Error getting achievement by ID:', error);
    return null;
  }
}

/**
 * Unlock an achievement
 * @param {string} achievementId - The achievement ID to unlock
 * @returns {Promise<boolean>} Success status
 */
async function unlockAchievement(achievementId) {
  try {
    const achievement = await getAchievementById(achievementId);
    if (!achievement) return false;
    if (achievement.unlockedAt !== null) return true; // Already unlocked

    return await updateAchievement(achievementId, {
      unlockedAt: Date.now()
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return false;
  }
}

/**
 * Get count of unlocked achievements
 * @returns {Promise<number>} Number of unlocked achievements
 */
async function getUnlockedAchievementsCount() {
  try {
    const achievements = await getAchievements();
    if (!achievements) return 0;
    return achievements.filter(a => a.unlockedAt !== null).length;
  } catch (error) {
    console.error('Error counting unlocked achievements:', error);
    return 0;
  }
}

// =============================================================================
// US-081: Daily Challenges
// =============================================================================

/**
 * Get daily challenges data from storage
 * @returns {Promise<Object>} Daily challenges data object
 */
async function getDailyChallenges() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.DAILY_CHALLENGES);
    return result[STORAGE_KEYS.DAILY_CHALLENGES] || null;
  } catch (error) {
    console.error('Error getting daily challenges:', error);
    return null;
  }
}

/**
 * Save daily challenges data to storage
 * @param {Object} challengeData - Daily challenges data object
 * @returns {Promise<boolean>} Success status
 */
async function saveDailyChallenges(challengeData) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.DAILY_CHALLENGES]: challengeData });
    return true;
  } catch (error) {
    console.error('Error saving daily challenges:', error);
    return false;
  }
}

/**
 * Update current challenge state
 * @param {Object} updates - Object with properties to update (progress, completed, etc.)
 * @returns {Promise<boolean>} Success status
 */
async function updateCurrentChallenge(updates) {
  try {
    const challengeData = await getDailyChallenges();
    if (!challengeData || !challengeData.currentChallenge) return false;

    challengeData.currentChallenge = {
      ...challengeData.currentChallenge,
      ...updates
    };

    return await saveDailyChallenges(challengeData);
  } catch (error) {
    console.error('Error updating current challenge:', error);
    return false;
  }
}

/**
 * Complete the current challenge
 * Updates stats, adds to history, and resets current challenge
 * @returns {Promise<boolean>} Success status
 */
async function completeCurrentChallenge() {
  try {
    const challengeData = await getDailyChallenges();
    if (!challengeData || !challengeData.currentChallenge) return false;

    const completedChallenge = {
      ...challengeData.currentChallenge,
      completed: true,
      completedAt: Date.now()
    };

    // Add to history
    challengeData.history.push(completedChallenge);

    // Update stats
    challengeData.totalCompleted = (challengeData.totalCompleted || 0) + 1;

    // Update challenge streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if we completed a challenge yesterday
    const completedYesterday = challengeData.history.some(
      h => h.date === yesterday && h.completed
    );

    if (completedYesterday || challengeData.currentChallengeStreak === 0) {
      challengeData.currentChallengeStreak = (challengeData.currentChallengeStreak || 0) + 1;
    } else {
      challengeData.currentChallengeStreak = 1;
    }

    // Update best streak if needed
    if (challengeData.currentChallengeStreak > (challengeData.bestChallengeStreak || 0)) {
      challengeData.bestChallengeStreak = challengeData.currentChallengeStreak;
    }

    // Keep current challenge marked as completed (will be replaced on new day)
    challengeData.currentChallenge = completedChallenge;

    return await saveDailyChallenges(challengeData);
  } catch (error) {
    console.error('Error completing current challenge:', error);
    return false;
  }
}

/**
 * Skip the current challenge and get a new one
 * Limited to 1 skip per day
 * @returns {Promise<{success: boolean, newChallenge?: Object, reason?: string}>}
 */
async function skipCurrentChallenge() {
  try {
    const challengeData = await getDailyChallenges();
    if (!challengeData || !challengeData.currentChallenge) {
      return { success: false, reason: 'No active challenge' };
    }

    // Check if already used skip today
    if (challengeData.currentChallenge.skipsUsedToday >= 1) {
      return { success: false, reason: 'Already used skip today' };
    }

    // Mark current as skipped and add to history
    const skippedChallenge = {
      ...challengeData.currentChallenge,
      skipped: true
    };
    challengeData.history.push(skippedChallenge);

    // Import selectDailyChallenge and createDailyChallengeState dynamically
    // (These are defined in models.js, we'll handle this in popup.js)

    return {
      success: true,
      skippedChallenge,
      skipsUsedToday: 1
    };
  } catch (error) {
    console.error('Error skipping challenge:', error);
    return { success: false, reason: 'Error occurred' };
  }
}

/**
 * Get challenge history for reports
 * @param {number} [limit=30] - Maximum number of history entries to return
 * @returns {Promise<Array>} Array of challenge history entries
 */
async function getChallengeHistory(limit = 30) {
  try {
    const challengeData = await getDailyChallenges();
    if (!challengeData || !challengeData.history) return [];

    // Return most recent entries first
    return challengeData.history
      .slice(-limit)
      .reverse();
  } catch (error) {
    console.error('Error getting challenge history:', error);
    return [];
  }
}

/**
 * Get challenge statistics
 * @returns {Promise<Object>} Challenge stats object
 */
async function getChallengeStats() {
  try {
    const challengeData = await getDailyChallenges();
    if (!challengeData) {
      return {
        totalCompleted: 0,
        currentStreak: 0,
        bestStreak: 0,
        completionRate: 0
      };
    }

    // Calculate completion rate from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentHistory = challengeData.history?.filter(h => h.date >= thirtyDaysAgoStr) || [];
    const completedRecent = recentHistory.filter(h => h.completed).length;
    const totalRecent = recentHistory.length;

    return {
      totalCompleted: challengeData.totalCompleted || 0,
      currentStreak: challengeData.currentChallengeStreak || 0,
      bestStreak: challengeData.bestChallengeStreak || 0,
      completionRate: totalRecent > 0 ? Math.round((completedRecent / totalRecent) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    return {
      totalCompleted: 0,
      currentStreak: 0,
      bestStreak: 0,
      completionRate: 0
    };
  }
}

// =============================================================================
// US-083: Level and XP System Storage
// =============================================================================

/**
 * Default XP data structure
 * @returns {Object} Default XP data
 */
function getDefaultXPData() {
  return {
    totalXP: 0,
    currentLevel: 1,
    levelUpHistory: [],
    xpHistory: [],
    lastUpdated: Date.now(),
    firstGoalBonusAwarded: false
  };
}

/**
 * Get XP data from storage
 * @returns {Promise<Object>} XP data object
 */
async function getXPData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.XP_DATA);
    return result[STORAGE_KEYS.XP_DATA] || null;
  } catch (error) {
    console.error('Error getting XP data:', error);
    return null;
  }
}

/**
 * Save XP data to storage
 * @param {Object} xpData - XP data object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveXPData(xpData) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.XP_DATA]: xpData });
    return true;
  } catch (error) {
    console.error('Error saving XP data:', error);
    return false;
  }
}

/**
 * Add XP to user's total and update history
 * Handles level-up detection
 * @param {number} amount - XP amount to add
 * @param {string} source - XP source type
 * @param {string} description - Description of XP gain
 * @param {Object|null} context - Additional context
 * @returns {Promise<{success: boolean, leveledUp: boolean, newLevel: number|null, oldLevel: number, totalXP: number}>}
 */
async function addXP(amount, source, description, context = null) {
  try {
    let xpData = await getXPData();
    if (!xpData) {
      xpData = getDefaultXPData();
    }

    const oldLevel = xpData.currentLevel;
    const oldTotalXP = xpData.totalXP;

    // Add XP
    xpData.totalXP += amount;
    xpData.lastUpdated = Date.now();

    // Create history entry
    const historyEntry = {
      id: `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      amount,
      timestamp: Date.now(),
      description,
      context
    };

    // Add to history (keep last 50 entries)
    xpData.xpHistory.unshift(historyEntry);
    if (xpData.xpHistory.length > 50) {
      xpData.xpHistory = xpData.xpHistory.slice(0, 50);
    }

    // Calculate new level using progressive formula
    // Level N requires: sum of (BASE_XP * 1.15^(i-2)) for i from 2 to N
    const BASE_XP = 100;
    const MULTIPLIER = 1.15;
    const MAX_LEVEL = 50;

    let newLevel = 1;
    let xpForNextLevel = 0;
    while (newLevel < MAX_LEVEL) {
      xpForNextLevel = 0;
      for (let i = 2; i <= newLevel + 1; i++) {
        xpForNextLevel += Math.floor(BASE_XP * Math.pow(MULTIPLIER, i - 2));
      }
      if (xpData.totalXP >= xpForNextLevel) {
        newLevel++;
      } else {
        break;
      }
    }

    const leveledUp = newLevel > oldLevel;

    // Update level
    xpData.currentLevel = newLevel;

    // Record level-ups
    if (leveledUp) {
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        xpData.levelUpHistory.push({
          level: lvl,
          timestamp: Date.now(),
          trigger: source
        });
      }
    }

    // Save updated data
    await saveXPData(xpData);

    return {
      success: true,
      leveledUp,
      newLevel: leveledUp ? newLevel : null,
      oldLevel,
      totalXP: xpData.totalXP
    };
  } catch (error) {
    console.error('Error adding XP:', error);
    return {
      success: false,
      leveledUp: false,
      newLevel: null,
      oldLevel: 0,
      totalXP: 0
    };
  }
}

/**
 * Mark first goal bonus as awarded
 * @returns {Promise<boolean>} Success status
 */
async function markFirstGoalBonusAwarded() {
  try {
    let xpData = await getXPData();
    if (!xpData) {
      xpData = getDefaultXPData();
    }
    xpData.firstGoalBonusAwarded = true;
    return await saveXPData(xpData);
  } catch (error) {
    console.error('Error marking first goal bonus:', error);
    return false;
  }
}

/**
 * Get XP statistics for display
 * @returns {Promise<Object>} XP stats object
 */
async function getXPStats() {
  try {
    const xpData = await getXPData();
    if (!xpData) {
      return {
        totalXP: 0,
        currentLevel: 1,
        xpProgress: 0,
        xpForNextLevel: 100,
        levelUpsThisWeek: 0,
        xpEarnedToday: 0,
        xpEarnedThisWeek: 0
      };
    }

    // Calculate progress within current level
    const BASE_XP = 100;
    const MULTIPLIER = 1.15;
    const MAX_LEVEL = 50;

    let xpForCurrentLevel = 0;
    let xpForNextLevel = 0;

    for (let i = 2; i <= xpData.currentLevel; i++) {
      xpForCurrentLevel += Math.floor(BASE_XP * Math.pow(MULTIPLIER, i - 2));
    }
    for (let i = 2; i <= xpData.currentLevel + 1; i++) {
      xpForNextLevel += Math.floor(BASE_XP * Math.pow(MULTIPLIER, i - 2));
    }

    const xpProgress = xpData.totalXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

    // Calculate XP earned today and this week
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartTime = weekStart.getTime();

    let xpEarnedToday = 0;
    let xpEarnedThisWeek = 0;
    let levelUpsThisWeek = 0;

    for (const entry of xpData.xpHistory) {
      if (entry.timestamp >= todayStart) {
        xpEarnedToday += entry.amount;
      }
      if (entry.timestamp >= weekStartTime) {
        xpEarnedThisWeek += entry.amount;
      }
    }

    for (const levelUp of xpData.levelUpHistory) {
      if (levelUp.timestamp >= weekStartTime) {
        levelUpsThisWeek++;
      }
    }

    return {
      totalXP: xpData.totalXP,
      currentLevel: xpData.currentLevel,
      xpProgress,
      xpForNextLevel: xpNeeded,
      levelUpsThisWeek,
      xpEarnedToday,
      xpEarnedThisWeek,
      isMaxLevel: xpData.currentLevel >= MAX_LEVEL
    };
  } catch (error) {
    console.error('Error getting XP stats:', error);
    return {
      totalXP: 0,
      currentLevel: 1,
      xpProgress: 0,
      xpForNextLevel: 100,
      levelUpsThisWeek: 0,
      xpEarnedToday: 0,
      xpEarnedThisWeek: 0
    };
  }
}

/**
 * Get recent XP history entries
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} Recent XP history
 */
async function getRecentXPHistory(limit = 10) {
  try {
    const xpData = await getXPData();
    if (!xpData || !xpData.xpHistory) return [];
    return xpData.xpHistory.slice(0, limit);
  } catch (error) {
    console.error('Error getting XP history:', error);
    return [];
  }
}

// Export functions for use in other modules
export {
  STORAGE_KEYS,
  DEFAULT_CATEGORIES,
  BUILT_IN_TEMPLATES,
  getGoals,
  saveGoals,
  getActivityLog,
  saveActivityLog,
  getSettings,
  saveSettings,
  getHistory,
  saveHistory,
  getActiveTimers,
  saveActiveTimers,
  addActivityLogEntry,
  getGoalById,
  updateGoal,
  deleteGoal,
  clearAllData,
  getDefaultSettings,
  getStreakData,
  saveStreakData,
  getDefaultStreakData,
  getCategories,
  saveCategories,
  getDefaultCategories,
  addCategory,
  deleteCategory,
  getCategoryById,
  // US-066: Template functions
  getTemplates,
  getCustomTemplates,
  saveCustomTemplates,
  getBuiltInTemplates,
  addTemplate,
  deleteTemplate,
  getTemplateById,
  // US-069: Archive functions
  getArchivedGoals,
  saveArchivedGoals,
  archiveGoal,
  restoreArchivedGoal,
  deleteArchivedGoal,
  getArchivedGoalById,
  // US-070: Export/Import functions
  exportAllData,
  validateImportData,
  importAllData,
  // US-080: Achievement functions
  getAchievements,
  saveAchievements,
  updateAchievement,
  getAchievementById,
  unlockAchievement,
  getUnlockedAchievementsCount,
  // US-081: Daily Challenges functions
  getDailyChallenges,
  saveDailyChallenges,
  updateCurrentChallenge,
  completeCurrentChallenge,
  skipCurrentChallenge,
  getChallengeHistory,
  getChallengeStats,
  // US-083: Level and XP System functions
  getXPData,
  saveXPData,
  addXP,
  markFirstGoalBonusAwarded,
  getXPStats,
  getRecentXPHistory
};
