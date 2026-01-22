/**
 * Share Image Templates (US-082)
 * Canvas drawing functions for share image generation
 */

// =============================================================================
// Template Definitions
// =============================================================================

/**
 * Share card template definitions
 * Each template defines how the share image will look
 */
export const SHARE_CARD_TEMPLATES = {
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
// Template Drawing Functions
// =============================================================================

/**
 * Draw minimal template
 */
export function drawMinimalTemplate(ctx, canvas, template, stats, isDark) {
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
  ctx.fillText('My Tracker', width / 2, 45);

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
  drawStatBox(ctx, startX, boxY, boxWidth, boxHeight, 'Today', stats.todayCompleted, accentColor, isDark);

  // This Week box
  drawStatBox(ctx, startX + boxWidth + boxGap, boxY, boxWidth, boxHeight, 'This Week', stats.weekCompleted, accentColor, isDark);

  // Footer branding
  ctx.fillStyle = textSecondary;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated with My Tracker', width / 2, height - 20);
}

/**
 * Draw gradient template
 */
export function drawGradientTemplate(ctx, canvas, template, stats) {
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
  ctx.fillText('My Tracker', width / 2, 50);

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
  ctx.fillText('Generated with My Tracker', width / 2, height - 20);
}

/**
 * Draw dark professional template
 */
export function drawDarkTemplate(ctx, canvas, template, stats) {
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
  ctx.fillText('Generated with My Tracker', width / 2, height - 20);
}

// =============================================================================
// Helper Drawing Functions
// =============================================================================

/**
 * Helper - Draw stat box for minimal template
 */
function drawStatBox(ctx, x, y, width, height, label, value, accentColor, isDark) {
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
 * Helper - Draw glass morphism card for gradient template
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
 * Helper - Draw stat for dark template
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
 * Helper - Draw rounded rectangle
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
