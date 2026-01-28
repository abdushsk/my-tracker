/**
 * Fuzzy Search Utility Module
 * US-029: Add fuzzy search to settings screen
 *
 * Provides simple fuzzy matching for settings search functionality.
 * Matches characters in order but allows gaps (e.g., "snd" matches "sound").
 */

/**
 * Calculate fuzzy match score between query and text
 * Returns score > 0 if match found, 0 if no match
 * Higher score = better match
 *
 * @param {string} query - The search query
 * @param {string} text - The text to search in
 * @returns {number} Match score (0 = no match)
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) return 0;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  if (!queryLower) return 0;

  // Exact match gets highest score
  if (textLower === queryLower) return 100;

  // Contains match gets high score
  if (textLower.includes(queryLower)) {
    // Bonus for match at start
    if (textLower.startsWith(queryLower)) return 90;
    // Bonus for match at word boundary
    if (textLower.includes(' ' + queryLower)) return 85;
    return 80;
  }

  // Fuzzy character-by-character match
  let queryIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      queryIdx++;

      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) {
        consecutiveMatches++;
        score += 5 + consecutiveMatches;
      } else {
        consecutiveMatches = 0;
        score += 5;
      }

      // Bonus for matching at word boundaries
      if (i === 0 || textLower[i - 1] === ' ') {
        score += 10;
      }

      lastMatchIdx = i;
    }
  }

  // All query characters must be found
  if (queryIdx < queryLower.length) return 0;

  // Normalize score based on text length (shorter matches = better)
  const lengthBonus = Math.max(0, 20 - Math.floor(textLower.length / 5));

  return Math.min(score + lengthBonus, 79); // Cap below contains match score
}

/**
 * Search settings data and return matching items with scores
 *
 * @param {string} query - The search query
 * @param {Array<{id: string, label: string, description?: string, section?: string}>} items - Items to search
 * @returns {Array<{item: Object, score: number}>} Matched items with scores, sorted by score
 */
export function searchSettings(query, items) {
  if (!query || !query.trim()) {
    return items.map(item => ({ item, score: 100 }));
  }

  const results = items
    .map(item => {
      // Search in label (primary)
      const labelScore = fuzzyMatch(query, item.label) * 1.5; // Weight label higher

      // Search in description (secondary)
      const descScore = item.description ? fuzzyMatch(query, item.description) : 0;

      // Search in section name
      const sectionScore = item.section ? fuzzyMatch(query, item.section) * 0.5 : 0;

      const score = Math.max(labelScore, descScore, sectionScore);

      return { item, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Highlight matching characters in text
 *
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @returns {string} HTML string with <mark> tags around matching characters
 */
export function highlightMatch(text, query) {
  if (!query || !text) return text;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  if (!queryLower) return text;

  // For simple substring match, wrap the match
  const containsIdx = textLower.indexOf(queryLower);
  if (containsIdx !== -1) {
    const before = text.substring(0, containsIdx);
    const match = text.substring(containsIdx, containsIdx + queryLower.length);
    const after = text.substring(containsIdx + queryLower.length);
    return `${before}<mark>${match}</mark>${after}`;
  }

  // For fuzzy match, highlight individual characters
  let result = '';
  let queryIdx = 0;

  for (let i = 0; i < text.length; i++) {
    if (queryIdx < queryLower.length && textLower[i] === queryLower[queryIdx]) {
      result += `<mark>${text[i]}</mark>`;
      queryIdx++;
    } else {
      result += text[i];
    }
  }

  return result;
}

/**
 * Debounce function for search input
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
