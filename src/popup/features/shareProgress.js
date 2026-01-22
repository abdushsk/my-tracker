/**
 * Share Progress as Image (US-082)
 * Modal UI and image generation orchestration
 */

import { playSound } from '../../utils/sounds.js';
import { getTodayDateString } from '../../utils/models.js';
import {
  SHARE_CARD_TEMPLATES,
  drawMinimalTemplate,
  drawGradientTemplate,
  drawDarkTemplate
} from './shareTemplates.js';

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
  playSound('tick');

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
      playSound('tick');
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
    playSound('tick');

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
