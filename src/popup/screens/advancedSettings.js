/**
 * US-039: Advanced Settings Module
 * Handles the collapsible Advanced Settings section
 */

import { state } from '../state.js';
import { saveSettings } from '../../utils/storage.js';
import { fuzzyMatch } from '../utils/fuzzySearch.js';

/**
 * US-039: Attach advanced settings toggle listener
 * Handles expanding/collapsing the advanced settings section
 * @param {HTMLElement} screen - The settings screen element
 */
export function attachAdvancedToggleListener(screen) {
  const toggleBtn = screen.querySelector('#advanced-settings-toggle');
  const advancedGroup = screen.querySelector('#advanced-settings-group');

  if (toggleBtn && advancedGroup) {
    toggleBtn.addEventListener('click', async () => {
      const isExpanded = advancedGroup.classList.contains('expanded');
      const newState = !isExpanded;

      // Toggle expanded state
      advancedGroup.classList.toggle('expanded', newState);
      toggleBtn.setAttribute('aria-expanded', newState.toString());

      // Toggle icon rotation
      const icon = toggleBtn.querySelector('.settings-advanced-toggle-icon');
      if (icon) {
        icon.classList.toggle('expanded', newState);
      }

      // Save preference to state and storage
      state.settings = {
        ...state.settings,
        advancedSettingsExpanded: newState
      };
      await saveSettings(state.settings);

      console.log(`[Settings] Advanced settings: ${newState ? 'expanded' : 'collapsed'}`);
    });
  }
}

/**
 * US-039: Handle search visibility for advanced section
 * Auto-expands advanced section when search matches are found there
 * @param {HTMLElement} screen - The settings screen element
 * @param {string} query - Search query
 * @param {boolean} hasAdvancedMatch - Whether there are matches in advanced section
 */
export function handleAdvancedSearchVisibility(screen, query, hasAdvancedMatch) {
  const advancedGroup = screen.querySelector('#advanced-settings-group');
  const advancedToggle = screen.querySelector('#advanced-settings-toggle');

  if (advancedGroup && advancedToggle) {
    if (query && hasAdvancedMatch) {
      // Expand to show search results
      advancedGroup.classList.add('expanded', 'search-expanded');
      advancedToggle.setAttribute('aria-expanded', 'true');
      const icon = advancedToggle.querySelector('.settings-advanced-toggle-icon');
      if (icon) icon.classList.add('expanded');
    } else if (!query) {
      // Restore to original state when search is cleared
      advancedGroup.classList.remove('search-expanded');
      const wasExpanded = state.settings?.advancedSettingsExpanded || false;
      advancedGroup.classList.toggle('expanded', wasExpanded);
      advancedToggle.setAttribute('aria-expanded', wasExpanded.toString());
      const icon = advancedToggle.querySelector('.settings-advanced-toggle-icon');
      if (icon) icon.classList.toggle('expanded', wasExpanded);
    }

    // When searching, hide the toggle button but keep the container visible for results
    advancedToggle.classList.toggle('search-hidden', !!query);
  }
}

/**
 * US-039: Check if a section is within the advanced settings group
 * @param {HTMLElement} section - The section element to check
 * @param {HTMLElement} advancedGroup - The advanced settings group element
 * @returns {boolean} Whether the section is in the advanced group
 */
export function isInAdvancedSection(section, advancedGroup) {
  return advancedGroup && advancedGroup.contains(section);
}
