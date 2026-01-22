/**
 * Share Progress as Image (US-082)
 * Canvas-based image generation for sharing progress stats
 */

import { playSound } from '../../utils/sounds.js';
import { getTodayDateString } from '../../utils/models.js';

// =============================================================================
// Share Card Templates
// =============================================================================

/**
 * US-082: Share card template definitions
 * Each template defines how the share image will look
 */
const SHARE_CARD_TEMPLATES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design',
    width: 400,
    height: 500,
    background: { light: '#FFFFFF', dark: '#1E1E1E' },
    accent: { light: '#4CAF50', dark: '#66BB6A' }
  },
  gradient: {
    id: 'gradient',
    name: 'Gradient',
    description: 'Vibrant gradient background',
    width: 400,
    height: 500,
    gradientStart: { light: '#667eea', dark: '#4c63d2' },
    gradientEnd: { light: '#764ba2', dark: '#5e3b7c' }
  },
  dark: {
    id: 'dark',
    name: 'Dark Pro',
    description: 'Professional dark theme',
    width: 400,
    height: 500,
    background: '#1a1a2e',
    accent: '#00d9ff'
  }
};

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * US-082: Attach share button listener
 * @param {HTMLElement} screen - The reports screen element
 */
export function attachShareReportsListeners(screen) {
  const shareBtn = screen.querySelector('[data-action="share-reports"]');
  if (shareBtn) {
    shareBtn.addEventListener('click', openShareModal);
  }
}

/**
 * US-082: Open the share modal
 */
export function openShareModal() {
  playSound('click');

  // Get current stats for preview
  const disciplineScore = document.getElementById('discipline-score-value')?.textContent || '--';
  const currentStreak = document.getElementById('current-streak-value')?.textContent || '0';
  const bestStreak = document.getElementById('best-streak-value')?.textContent || '0';
  const todayCompleted = document.getElementById('today-completed')?.textContent || '--/--';

  // Create modal HTML
  const modalHTML = `
    <div class="share-modal-overlay" id="share-modal-overlay">
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>Share Progress</h3>
          <button class="share-modal-close" data-action="close-share-modal">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="share-modal-content">
          <div class="share-preview-container">
            <canvas id="share-preview-canvas" width="400" height="500"></canvas>
          </div>
          <div class="share-templates">
            <label class="share-templates-label">Choose Style</label>
            <div class="share-template-options">
              ${Object.values(SHARE_CARD_TEMPLATES).map((template, index) => `
                <button class="share-template-btn ${index === 0 ? 'active' : ''}" data-template="${template.id}">
                  <span class="template-name">${template.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="share-modal-actions">
          <button class="share-action-btn copy-btn" data-action="copy-share-image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy to Clipboard</span>
          </button>
          <button class="share-action-btn download-btn" data-action="download-share-image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Show modal with animation
  const overlay = document.getElementById('share-modal-overlay');
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Generate initial preview
  generateShareImage('minimal');

  // Attach modal event listeners
  attachShareModalListeners();
}

/**
 * US-082: Close the share modal
 */
export function closeShareModal() {
  const overlay = document.getElementById('share-modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');

  // Remove after animation
  setTimeout(() => {
    overlay.remove();
  }, 200);
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * US-082: Attach event listeners to share modal
 */
function attachShareModalListeners() {
  const overlay = document.getElementById('share-modal-overlay');
  if (!overlay) return;

  // Close button
  const closeBtn = overlay.querySelector('[data-action="close-share-modal"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeShareModal);
  }

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeShareModal();
    }
  });

  // Template selection
  const templateBtns = overlay.querySelectorAll('.share-template-btn');
  templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      templateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Regenerate preview
      const templateId = btn.getAttribute('data-template');
      generateShareImage(templateId);
      playSound('click');
    });
  });

  // Copy to clipboard
  const copyBtn = overlay.querySelector('[data-action="copy-share-image"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyShareImage);
  }

  // Download
  const downloadBtn = overlay.querySelector('[data-action="download-share-image"]');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadShareImage);
  }

  // Escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeShareModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * US-082: Generate share image using canvas
 * @param {string} templateId - The template ID to use
 */
function generateShareImage(templateId) {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const template = SHARE_CARD_TEMPLATES[templateId] || SHARE_CARD_TEMPLATES.minimal;

  // Get current theme
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Get stats from the DOM
  const disciplineScore = document.getElementById('discipline-score-value')?.textContent || '--';
  const currentStreak = document.getElementById('current-streak-value')?.textContent || '0';
  const bestStreak = document.getElementById('best-streak-value')?.textContent || '0';
  const todayCompleted = document.getElementById('today-completed')?.textContent || '--/--';
  const weekCompleted = document.getElementById('week-completed')?.textContent || '--/--';

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw based on template
  switch (templateId) {
    case 'gradient':
      drawGradientTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted });
      break;
    case 'dark':
      drawDarkTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted });
      break;
    default:
      drawMinimalTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted }, isDark);
      break;
  }
}

/**
 * US-082: Draw minimal template
 */
function drawMinimalTemplate(ctx, canvas, template, stats, isDark) {
  const { width, height } = canvas;
  const bgColor = isDark ? template.background.dark : template.background.light;
  const accentColor = isDark ? template.accent.dark : template.accent.light;
  const textColor = isDark ? '#FFFFFF' : '#212121';
  const textSecondary = isDark ? '#B0B0B0' : '#666666';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = isDark ? '#333333' : '#E0E0E0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Header
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 70);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Daily Goals Tracker', width / 2, 45);

  // Discipline Score
  ctx.fillStyle = textColor;
  ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, width / 2, 160);

  ctx.fillStyle = textSecondary;
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Discipline Score', width / 2, 190);

  // Divider
  ctx.strokeStyle = isDark ? '#333333' : '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 220);
  ctx.lineTo(width - 40, 220);
  ctx.stroke();

  // Streak section
  const streakY = 275;

  // Current streak
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stats.currentStreak, width / 4, streakY);

  ctx.fillStyle = textSecondary;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('day streak', width / 4, streakY + 25);

  // Best streak
  ctx.fillStyle = '#FFB300';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.bestStreak, (width * 3) / 4, streakY);

  ctx.fillStyle = textSecondary;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('best streak', (width * 3) / 4, streakY + 25);

  // Stats boxes
  const boxY = 340;
  const boxWidth = 150;
  const boxHeight = 70;
  const boxGap = 20;
  const startX = (width - (boxWidth * 2 + boxGap)) / 2;

  // Today box
  drawStatBox(ctx, startX, boxY, boxWidth, boxHeight, 'Today', stats.todayCompleted, accentColor, textColor, isDark);

  // This Week box
  drawStatBox(ctx, startX + boxWidth + boxGap, boxY, boxWidth, boxHeight, 'This Week', stats.weekCompleted, accentColor, textColor, isDark);

  // Footer branding
  ctx.fillStyle = textSecondary;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Draw gradient template
 */
function drawGradientTemplate(ctx, canvas, template, stats) {
  const { width, height } = canvas;

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, template.gradientStart.light);
  gradient.addColorStop(1, template.gradientEnd.light);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Semi-transparent overlay for better text readability
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, width, height);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Daily Goals Tracker', width / 2, 50);

  // Discipline Score - Large circle
  const centerX = width / 2;
  const centerY = 150;
  const radius = 70;

  // Circle background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Circle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Score text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, centerX, centerY + 15);

  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('Discipline Score', centerX, centerY + 45);

  // Stats cards
  const cardY = 270;
  const cardWidth = 160;
  const cardHeight = 80;
  const cardGap = 20;
  const startX = (width - (cardWidth * 2 + cardGap)) / 2;

  // Draw glass-morphism style cards
  drawGlassCard(ctx, startX, cardY, cardWidth, cardHeight, stats.currentStreak, 'Day Streak', '🔥');
  drawGlassCard(ctx, startX + cardWidth + cardGap, cardY, cardWidth, cardHeight, stats.bestStreak, 'Best Streak', '⭐');

  // Second row
  const cardY2 = cardY + cardHeight + 15;
  drawGlassCard(ctx, startX, cardY2, cardWidth, cardHeight, stats.todayCompleted, 'Today', '📅');
  drawGlassCard(ctx, startX + cardWidth + cardGap, cardY2, cardWidth, cardHeight, stats.weekCompleted, 'This Week', '📊');

  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Draw dark professional template
 */
function drawDarkTemplate(ctx, canvas, template, stats) {
  const { width, height } = canvas;

  // Dark background
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Accent bar at top
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, template.accent);
  accentGradient.addColorStop(1, '#7c3aed');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 4);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DAILY GOALS TRACKER', width / 2, 45);

  // Discipline Score
  ctx.fillStyle = template.accent;
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, width / 2, 145);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DISCIPLINE SCORE', width / 2, 175);

  // Horizontal line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(width - 40, 200);
  ctx.stroke();

  // Stats in a row
  const statsY = 260;
  const statsGap = width / 4;

  drawDarkStat(ctx, statsGap, statsY, stats.currentStreak, 'STREAK', template.accent);
  drawDarkStat(ctx, statsGap * 2, statsY, stats.bestStreak, 'BEST', '#FFB300');
  drawDarkStat(ctx, statsGap * 3, statsY, stats.todayCompleted, 'TODAY', '#10B981');

  // Week stats card
  const cardY = 340;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, 40, cardY, width - 80, 80, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 40, cardY, width - 80, 80, 12);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.weekCompleted, width / 2, cardY + 45);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('GOALS COMPLETED THIS WEEK', width / 2, cardY + 68);

  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Helper - Draw stat box for minimal template
 */
function drawStatBox(ctx, x, y, width, height, label, value, accentColor, textColor, isDark) {
  // Box background
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();

  // Box border
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 8);
  ctx.stroke();

  // Value
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + 35);

  // Label
  ctx.fillStyle = isDark ? '#999999' : '#666666';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x + width / 2, y + 55);
}

/**
 * US-082: Helper - Draw glass morphism card for gradient template
 */
function drawGlassCard(ctx, x, y, width, height, value, label, emoji) {
  // Glass background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, x, y, width, height, 12);
  ctx.fill();

  // Glass border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 12);
  ctx.stroke();

  // Emoji
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(emoji, x + 12, y + 30);

  // Value
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + 45);

  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x + width / 2, y + 68);
}

/**
 * US-082: Helper - Draw stat for dark template
 */
function drawDarkStat(ctx, x, y, value, label, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x, y + 20);
}

/**
 * US-082: Helper - Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * US-082: Copy share image to clipboard
 */
async function handleCopyShareImage() {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  try {
    // Convert canvas to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });

    // Use Clipboard API
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    // Show success feedback
    showShareFeedback('success', 'Image copied to clipboard!');
    playSound('complete');

    console.log('[Share] Image copied to clipboard');
  } catch (error) {
    console.error('[Share] Error copying to clipboard:', error);
    // Fallback: try downloading instead
    showShareFeedback('error', 'Could not copy. Try downloading instead.');
  }
}

/**
 * US-082: Download share image as PNG
 */
function handleDownloadShareImage() {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  try {
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Create download link
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `daily-goals-progress-${getTodayDateString()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success feedback
    showShareFeedback('success', 'Image downloaded!');
    playSound('click');

    console.log('[Share] Image downloaded');
  } catch (error) {
    console.error('[Share] Error downloading image:', error);
    showShareFeedback('error', 'Failed to download image.');
  }
}

/**
 * US-082: Show feedback message in share modal
 * @param {string} type - 'success' or 'error'
 * @param {string} message - Message to display
 */
function showShareFeedback(type, message) {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.share-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `share-feedback share-feedback-${type}`;
  feedback.innerHTML = `
    <span class="share-feedback-icon">
      ${type === 'success' ?
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      }
    </span>
    <span class="share-feedback-message">${message}</span>
  `;

  // Insert feedback in modal
  const modalContent = document.querySelector('.share-modal-content');
  if (modalContent) {
    modalContent.insertAdjacentElement('afterbegin', feedback);
  }

  // Auto-remove after delay
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => feedback.remove(), 300);
  }, 2500);
}
