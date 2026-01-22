/**
 * Theme Management Utilities (US-051)
 * Light/dark theme switching with auto detection support
 */

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  getState: null,         // () => state object
  setState: null,         // (updates) => void
  saveSettings: null,     // (settings) => Promise
  renderSettingsScreen: null,
  SCREENS: null           // SCREENS enum
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerThemeCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Theme Detection and Application
// =============================================================================

/**
 * Get the effective theme based on system preference and user setting
 * @param {string} themeSetting - User's theme setting ('light', 'dark', 'auto')
 * @returns {string} The effective theme ('light' or 'dark')
 */
export function getEffectiveTheme(themeSetting) {
  if (themeSetting === 'auto') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return themeSetting;
}

/**
 * Apply the theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
export function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  console.log(`[Theme] Applied theme: ${theme}`);
}

/**
 * Apply the color theme to the document
 * @param {string} colorTheme - The color theme to apply ('default', 'ocean', 'forest', 'sunset', 'lavender')
 */
export function applyColorTheme(colorTheme) {
  if (colorTheme && colorTheme !== 'default') {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
  } else {
    document.documentElement.removeAttribute('data-color-theme');
  }
  console.log(`[Theme] Applied color theme: ${colorTheme || 'default'}`);
}

/**
 * Initialize theme based on user settings and system preference
 * Should be called early to prevent theme flash
 * @param {Object} settings - Settings object with theme property
 */
export function initTheme(settings) {
  const themeSetting = settings?.theme || 'auto';
  const effectiveTheme = getEffectiveTheme(themeSetting);
  const colorTheme = settings?.colorTheme || 'default';

  // Add no-transition class to prevent flash during initial load
  document.documentElement.classList.add('no-transition');

  applyTheme(effectiveTheme);
  applyColorTheme(colorTheme);

  // Remove no-transition class after a brief delay to enable transitions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition');
    });
  });

  console.log(`[Theme] Initialized: setting=${themeSetting}, effective=${effectiveTheme}, colorTheme=${colorTheme}`);
}

// =============================================================================
// Theme Toggle and System Listener
// =============================================================================

/**
 * Handle theme toggle in settings
 * Cycles through: auto -> light -> dark -> auto
 * @returns {Promise<string>} The new theme setting
 */
export async function toggleTheme() {
  const state = callbacks.getState ? callbacks.getState() : {};
  const currentSetting = state.settings?.theme || 'auto';
  let newSetting;

  // Cycle through themes
  switch (currentSetting) {
    case 'auto':
      newSetting = 'light';
      break;
    case 'light':
      newSetting = 'dark';
      break;
    case 'dark':
      newSetting = 'auto';
      break;
    default:
      newSetting = 'auto';
  }

  // Update state
  if (callbacks.setState) {
    callbacks.setState({
      settings: {
        ...state.settings,
        theme: newSetting
      }
    });
  }

  // Save to storage
  if (callbacks.saveSettings && callbacks.getState) {
    await callbacks.saveSettings(callbacks.getState().settings);
  }

  // Apply the new theme
  const effectiveTheme = getEffectiveTheme(newSetting);
  applyTheme(effectiveTheme);

  console.log(`[Theme] Toggled: ${currentSetting} -> ${newSetting} (effective: ${effectiveTheme})`);

  return newSetting;
}

/**
 * Set up listener for system theme changes (when user has 'auto' selected)
 */
export function setupSystemThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', (e) => {
    // Only react to system changes if user has 'auto' selected
    const state = callbacks.getState ? callbacks.getState() : {};
    if (state.settings?.theme === 'auto') {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
      console.log(`[Theme] System preference changed: ${newTheme}`);

      // Re-render settings screen if it's currently showing
      if (callbacks.SCREENS && state.currentScreen === callbacks.SCREENS.SETTINGS) {
        if (callbacks.renderSettingsScreen) {
          callbacks.renderSettingsScreen();
        }
      }
    }
  });
}

/**
 * Get the display text for the current theme setting
 * @param {string} themeSetting - The theme setting ('light', 'dark', 'auto')
 * @returns {string} Human-readable theme name
 */
export function getThemeDisplayText(themeSetting) {
  switch (themeSetting) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'auto':
    default:
      return 'Auto';
  }
}
