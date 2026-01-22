/**
 * Celebrations Feature
 * Confetti animations and completion celebration effects
 */

import { state } from '../state.js';
import { getRandomQuote } from '../../utils/quotes.js';

// =============================================================================
// Confetti Animation
// =============================================================================

/**
 * Confetti particle class for canvas-based animation
 */
class ConfettiParticle {
  constructor(canvas, colors, intensity = 'normal') {
    this.canvas = canvas;
    this.reset(colors, intensity, true);
  }

  reset(colors, intensity = 'normal', initial = false) {
    const speedMultiplier = intensity === 'high' ? 1.3 : intensity === 'low' ? 0.7 : 1;

    // Start position - spread across top of canvas with some randomness
    this.x = Math.random() * this.canvas.width;
    this.y = initial ? Math.random() * this.canvas.height * -0.5 : -10;

    // Size varies by shape
    this.size = Math.random() * 8 + 4;

    // Physics
    this.speedY = (Math.random() * 3 + 2) * speedMultiplier;
    this.speedX = (Math.random() - 0.5) * 4 * speedMultiplier;
    this.gravity = 0.1;
    this.drag = 0.02;
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = Math.random() * 0.1 + 0.05;

    // Rotation
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;

    // Appearance
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.opacity = 1;
    this.shape = Math.random() > 0.5 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'strip';
  }

  update() {
    // Apply gravity
    this.speedY += this.gravity;

    // Apply drag
    this.speedX *= (1 - this.drag);

    // Wobble effect
    this.wobble += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobble) * 0.5;
    this.y += this.speedY;

    // Rotation
    this.rotation += this.rotationSpeed;

    // Fade out near bottom
    if (this.y > this.canvas.height * 0.7) {
      this.opacity = Math.max(0, 1 - (this.y - this.canvas.height * 0.7) / (this.canvas.height * 0.3));
    }

    return this.y < this.canvas.height + 20 && this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'rect':
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'strip':
        ctx.fillRect(-this.size / 4, -this.size, this.size / 2, this.size * 2);
        break;
    }

    ctx.restore();
  }
}

/**
 * Get confetti colors based on current theme
 * @returns {string[]} Array of color hex codes
 */
export function getConfettiColors() {
  // Get computed styles to use CSS variable values
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);

  return [
    computedStyle.getPropertyValue('--success').trim() || '#4CAF50',
    computedStyle.getPropertyValue('--gold-bright').trim() || '#FFD700',
    computedStyle.getPropertyValue('--secondary').trim() || '#2196F3',
    computedStyle.getPropertyValue('--warning').trim() || '#FF9800',
    computedStyle.getPropertyValue('--primary').trim() || '#4CAF50',
    '#FF6B6B', // Coral red for variety
    '#A78BFA', // Purple for variety
  ];
}

/**
 * Create and launch confetti animation
 * @param {Object} options - Configuration options
 * @param {string} options.intensity - 'low', 'normal', or 'high'
 * @param {number} options.duration - Animation duration in ms
 * @param {HTMLElement} options.container - Container element (defaults to #app)
 */
export function launchConfetti(options = {}) {
  const {
    intensity = 'normal',
    duration = 2000,
    container = document.getElementById('app')
  } = options;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('[Confetti] Skipping animation due to reduced motion preference');
    return;
  }

  if (!container) {
    console.error('[Confetti] Container not found');
    return;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  `;

  // Ensure container has relative positioning
  const originalPosition = container.style.position;
  if (!originalPosition || originalPosition === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(canvas);

  // Set canvas size
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const ctx = canvas.getContext('2d');
  const colors = getConfettiColors();

  // Determine particle count based on intensity
  const particleCount = intensity === 'high' ? 80 : intensity === 'low' ? 30 : 50;

  // Create particles
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new ConfettiParticle(canvas, colors, intensity));
  }

  // Animation variables
  let animationId;
  const startTime = Date.now();
  let particleSpawnDone = false;

  // Animation loop
  function animate() {
    const elapsed = Date.now() - startTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stop spawning new particles after 1/3 of duration
    if (elapsed > duration / 3) {
      particleSpawnDone = true;
    }

    // Update and draw particles
    let activeParticles = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      if (particle.update()) {
        particle.draw(ctx);
        activeParticles++;
      } else if (!particleSpawnDone) {
        // Reset particle to top for continuous effect
        particle.reset(colors, intensity);
        activeParticles++;
      }
    }

    // Continue animation if there are active particles and time remaining
    if (activeParticles > 0 && elapsed < duration + 1000) {
      animationId = requestAnimationFrame(animate);
    } else {
      // Cleanup
      canvas.remove();
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
      console.log('[Confetti] Animation completed');
    }
  }

  // Start animation
  animationId = requestAnimationFrame(animate);
  console.log(`[Confetti] Launched ${particleCount} particles with ${intensity} intensity`);

  // Safety cleanup after max duration
  setTimeout(() => {
    if (canvas.parentNode) {
      cancelAnimationFrame(animationId);
      canvas.remove();
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
    }
  }, duration + 2000);
}

// =============================================================================
// Goal Completion Celebration
// =============================================================================

/**
 * Trigger completion celebration animation for a goal
 * @param {string} goalId - The ID of the completed goal
 * @param {Object} options - Optional celebration options
 * @param {string} options.intensity - 'low', 'normal', or 'high' confetti intensity
 */
export function triggerCompletionCelebration(goalId, options = {}) {
  const { intensity = 'normal' } = options;

  // Add to just-completed set
  state.justCompletedGoals.add(goalId);

  // US-064: Launch enhanced confetti animation
  launchConfetti({
    intensity,
    duration: intensity === 'high' ? 2500 : 2000
  });

  // US-077: Motivational quotes disabled
  // Previously showed quotes on completion, now disabled for cleaner UX

  // Schedule removal of the just-completed state after animation
  setTimeout(() => {
    state.justCompletedGoals.delete(goalId);

    // Remove the class from DOM if the element still exists
    const goalCard = document.querySelector(`.goal-card[data-goal-id="${goalId}"]`);
    if (goalCard) {
      goalCard.classList.remove('just-completed');
    }
  }, 2000); // Extended duration to match enhanced animation

  console.log(`[Celebration] Triggered completion celebration for goal ${goalId} with ${intensity} intensity`);
}

/**
 * US-077: Show a motivational quote toast on goal completion
 */
export function showCompletionQuote() {
  // Remove any existing quote toast
  const existingToast = document.querySelector('.completion-quote-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const quote = getRandomQuote();

  const toast = document.createElement('div');
  toast.className = 'completion-quote-toast';
  toast.innerHTML = `
    <div class="completion-quote-content">
      <div class="completion-quote-icon">&#127942;</div>
      <p class="completion-quote-text">"${quote.text}"</p>
      ${quote.author ? `<span class="completion-quote-author">— ${quote.author}</span>` : ''}
    </div>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
