/**
 * Challenge Reports Section (US-081)
 * Renders challenge statistics for the Reports screen
 */

import { state } from '../state.js';
import { getChallengeDefinition } from '../../utils/models.js';

// =============================================================================
// Reports Screen Section
// =============================================================================

/**
 * US-081: Render the challenge stats section for Reports screen
 * @returns {string} HTML string for challenge stats section
 */
export function renderChallengeStatsSection() {
  const challengesEnabled = state.settings?.dailyChallengesEnabled !== false;
  if (!challengesEnabled) return '';

  const challengeData = state.dailyChallenges;
  if (!challengeData) return '';

  const totalCompleted = challengeData.totalCompleted || 0;
  const currentStreak = challengeData.currentChallengeStreak || 0;
  const bestStreak = challengeData.bestChallengeStreak || 0;

  // Get recent history for display (last 7 days)
  const recentHistory = (challengeData.history || [])
    .filter(h => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(h.date) >= sevenDaysAgo;
    })
    .slice(-7)
    .reverse();

  return `
    <section class="reports-section challenge-stats-section">
      <h2 class="section-title">Daily Challenges</h2>
      <div class="challenge-stats-cards">
        <div class="challenge-stat-card">
          <div class="challenge-stat-icon">🎯</div>
          <div class="challenge-stat-value">${totalCompleted}</div>
          <div class="challenge-stat-label">Completed</div>
        </div>
        <div class="challenge-stat-card">
          <div class="challenge-stat-icon">🔥</div>
          <div class="challenge-stat-value">${currentStreak}</div>
          <div class="challenge-stat-label">Current Streak</div>
        </div>
        <div class="challenge-stat-card">
          <div class="challenge-stat-icon">⭐</div>
          <div class="challenge-stat-value">${bestStreak}</div>
          <div class="challenge-stat-label">Best Streak</div>
        </div>
      </div>
      ${recentHistory.length > 0 ? renderChallengeHistory(recentHistory) : ''}
    </section>
  `;
}

/**
 * Render challenge history list
 * @param {Array} recentHistory - Recent challenge history entries
 * @returns {string} HTML string for history section
 */
function renderChallengeHistory(recentHistory) {
  return `
    <div class="challenge-history">
      <h3 class="challenge-history-title">Recent Challenges</h3>
      <div class="challenge-history-list">
        ${recentHistory.map(entry => {
          const definition = getChallengeDefinition(entry.id);
          const statusIcon = entry.completed ? '✓' : entry.skipped ? '⏭️' : '✗';
          const statusClass = entry.completed ? 'completed' : entry.skipped ? 'skipped' : 'expired';
          return `
            <div class="challenge-history-item ${statusClass}">
              <div class="challenge-history-icon">${definition?.icon || '❓'}</div>
              <div class="challenge-history-info">
                <span class="challenge-history-title">${definition?.title || 'Unknown'}</span>
                <span class="challenge-history-date">${formatChallengeDate(entry.date)}</span>
              </div>
              <div class="challenge-history-status">${statusIcon}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Format challenge date for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatChallengeDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
