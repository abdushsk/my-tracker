/**
 * My Tracker - Floating Widget
 * Content script that injects a floating widget on all web pages
 * for quick goal tracking without opening the extension popup.
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__myTrackerWidgetInitialized) return;
  window.__myTrackerWidgetInitialized = true;

  // ============================================
  // Storage Keys (must match popup/service worker)
  // ============================================
  const STORAGE_KEYS = {
    GOALS: 'goals',
    SETTINGS: 'settings',
    ACTIVE_TIMERS: 'activeTimers'
  };

  // ============================================
  // Widget State
  // ============================================
  let widgetState = {
    enabled: false,
    expanded: false,
    goals: [],
    settings: {},
    activeTimers: {},
    position: { x: null, y: null },
    isDragging: false,
    theme: 'light'
  };

  // ============================================
  // CSS Styles (inlined for Shadow DOM)
  // ============================================
  const WIDGET_CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .widget-container {
      position: fixed;
      z-index: 2147483647;
      font-size: 14px;
      line-height: 1.5;
      transition: opacity 0.2s ease;
    }

    .widget-container.hidden {
      display: none;
    }

    /* Collapsed Icon Button */
    .widget-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--widget-bg);
      border: 1px solid var(--widget-border);
      box-shadow: var(--widget-shadow);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
    }

    .widget-icon:hover {
      transform: scale(1.05);
      box-shadow: var(--widget-shadow-hover);
    }

    .widget-icon:active {
      transform: scale(0.98);
    }

    .widget-icon.dragging {
      cursor: grabbing;
      transform: scale(1.08);
      box-shadow: var(--widget-shadow-hover);
    }

    .widget-icon svg {
      width: 24px;
      height: 24px;
      color: var(--widget-accent);
    }

    /* Badge on icon */
    .widget-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: var(--widget-danger);
      color: white;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .widget-badge.complete {
      background: var(--widget-accent);
    }

    .widget-badge.hidden {
      display: none;
    }

    /* Expanded Panel */
    .widget-panel {
      position: absolute;
      width: 300px;
      max-height: 420px;
      background: var(--widget-bg);
      border: 1px solid var(--widget-border);
      border-radius: 12px;
      box-shadow: var(--widget-shadow);
      overflow: hidden;
      display: none;
      flex-direction: column;
      bottom: 54px;
      right: 0;
    }

    .widget-panel.visible {
      display: flex;
    }

    /* Panel positioning based on screen position */
    .widget-container.position-left .widget-panel {
      right: auto;
      left: 0;
    }

    .widget-container.position-top .widget-panel {
      bottom: auto;
      top: 54px;
    }

    /* Panel Header */
    .widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--widget-border);
      background: var(--widget-bg-raised);
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      color: var(--widget-text);
    }

    .widget-title svg {
      width: 18px;
      height: 18px;
      color: var(--widget-accent);
    }

    .widget-close {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--widget-text-secondary);
      transition: background 0.15s ease, color 0.15s ease;
    }

    .widget-close:hover {
      background: var(--widget-bg-hover);
      color: var(--widget-text);
    }

    .widget-close svg {
      width: 16px;
      height: 16px;
    }

    /* Goals List */
    .widget-goals {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      max-height: 320px;
    }

    .widget-goals::-webkit-scrollbar {
      width: 5px;
    }

    .widget-goals::-webkit-scrollbar-track {
      background: transparent;
    }

    .widget-goals::-webkit-scrollbar-thumb {
      background: var(--widget-border);
      border-radius: 3px;
    }

    .widget-empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--widget-text-secondary);
    }

    .widget-empty svg {
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    /* Goal Item */
    .goal-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      background: var(--widget-bg);
      border: 1px solid var(--widget-border);
      border-radius: 8px;
      margin-bottom: 6px;
      transition: border-color 0.15s ease;
    }

    .goal-item:hover {
      border-color: var(--widget-accent);
    }

    .goal-item.completed {
      opacity: 0.7;
    }

    .goal-item.completed .goal-title {
      text-decoration: line-through;
      color: var(--widget-text-secondary);
    }

    .goal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .goal-info {
      flex: 1;
      min-width: 0;
    }

    .goal-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--widget-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .goal-progress-text {
      font-size: 11px;
      color: var(--widget-text-secondary);
    }

    /* Progress Bar */
    .goal-progress-bar {
      height: 4px;
      background: var(--widget-bg-sunken);
      border-radius: 2px;
      overflow: hidden;
    }

    .goal-progress-fill {
      height: 100%;
      background: var(--widget-accent);
      border-radius: 2px;
      transition: width 0.2s ease;
    }

    .goal-item.completed .goal-progress-fill {
      background: var(--widget-accent);
    }

    /* Goal Controls */
    .goal-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* Counter Controls */
    .counter-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .counter-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--widget-border);
      background: var(--widget-bg);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--widget-text);
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .counter-btn:hover:not(:disabled) {
      background: var(--widget-accent-subtle);
      border-color: var(--widget-accent);
      color: var(--widget-accent);
    }

    .counter-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .counter-btn svg {
      width: 16px;
      height: 16px;
    }

    .counter-value {
      min-width: 50px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--widget-text);
    }

    /* Timer Controls */
    .timer-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .timer-display {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 14px;
      font-weight: 500;
      color: var(--widget-text);
      min-width: 70px;
      text-align: center;
    }

    .timer-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .timer-btn.play {
      background: var(--widget-accent);
      color: white;
    }

    .timer-btn.play:hover {
      background: var(--widget-accent-hover);
      transform: scale(1.05);
    }

    .timer-btn.pause {
      background: var(--widget-warning);
      color: white;
    }

    .timer-btn.pause:hover {
      background: var(--widget-warning-hover);
      transform: scale(1.05);
    }

    .timer-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Checkbox Controls */
    .checkbox-controls {
      display: flex;
      align-items: center;
    }

    .checkbox-btn {
      width: 28px;
      height: 28px;
      border: 2px solid var(--widget-border);
      background: var(--widget-bg);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      transition: all 0.15s ease;
    }

    .checkbox-btn:hover {
      border-color: var(--widget-accent);
    }

    .checkbox-btn.checked {
      background: var(--widget-accent);
      border-color: var(--widget-accent);
      color: white;
    }

    .checkbox-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Avoidance Controls */
    .avoidance-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .avoidance-streak {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      color: var(--widget-accent);
    }

    .avoidance-streak svg {
      width: 14px;
      height: 14px;
    }

    .slip-btn {
      padding: 4px 10px;
      border: 1px solid var(--widget-danger);
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      color: var(--widget-danger);
      transition: background 0.15s ease;
    }

    .slip-btn:hover {
      background: var(--widget-danger-subtle);
    }

    /* Panel Footer */
    .widget-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-top: 1px solid var(--widget-border);
      background: var(--widget-bg-raised);
    }

    .widget-summary {
      font-size: 12px;
      color: var(--widget-text-secondary);
    }

    .widget-open-btn {
      padding: 6px 12px;
      border: none;
      background: var(--widget-accent);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s ease;
    }

    .widget-open-btn:hover {
      background: var(--widget-accent-hover);
    }

    .widget-open-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Theme Variables - Light */
    :host {
      --widget-bg: #FFFFFF;
      --widget-bg-raised: #FAFAFA;
      --widget-bg-sunken: #F5F5F5;
      --widget-bg-hover: #F0F0F0;
      --widget-text: #1A1A1A;
      --widget-text-secondary: #666666;
      --widget-accent: #10B981;
      --widget-accent-hover: #059669;
      --widget-accent-subtle: #D1FAE5;
      --widget-warning: #F59E0B;
      --widget-warning-hover: #D97706;
      --widget-danger: #EF4444;
      --widget-danger-subtle: #FEE2E2;
      --widget-border: #E5E5E5;
      --widget-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
      --widget-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    /* Theme Variables - Dark */
    :host([data-theme="dark"]) {
      --widget-bg: #1A1A1A;
      --widget-bg-raised: #252525;
      --widget-bg-sunken: #0F0F0F;
      --widget-bg-hover: #333333;
      --widget-text: #FAFAFA;
      --widget-text-secondary: #A3A3A3;
      --widget-accent: #34D399;
      --widget-accent-hover: #6EE7B7;
      --widget-accent-subtle: rgba(52, 211, 153, 0.2);
      --widget-warning: #FBBF24;
      --widget-warning-hover: #F59E0B;
      --widget-danger: #F87171;
      --widget-danger-subtle: rgba(248, 113, 113, 0.2);
      --widget-border: #333333;
      --widget-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
      --widget-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  `;

  // ============================================
  // SVG Icons
  // ============================================
  const ICONS = {
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    fire: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.866 0-7-3.134-7-7 0-2.577 1.409-4.83 3.5-6.03A6.978 6.978 0 0 0 12 17a6.978 6.978 0 0 0 3.5-7.03C17.591 11.17 19 13.423 19 16c0 3.866-3.134 7-7 7zM12 1c0 4-3 6-3 10a3 3 0 0 0 6 0c0-4-3-6-3-10z"/></svg>`,
    external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`
  };

  // ============================================
  // Widget Class
  // ============================================
  class GoalsWidget {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.container = null;
      this.timerIntervals = {};
      this.init();
    }

    async init() {
      // Load initial state from storage
      await this.loadState();

      // Only create widget if enabled
      if (!widgetState.enabled) {
        console.log('[Widget] Disabled - not creating widget');
        return;
      }

      // Create widget elements
      this.createWidget();

      // Set up storage listener
      this.setupStorageListener();

      // Start timer updates
      this.startTimerUpdates();
    }

    async loadState() {
      try {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.GOALS,
          STORAGE_KEYS.SETTINGS,
          STORAGE_KEYS.ACTIVE_TIMERS
        ]);

        widgetState.goals = result[STORAGE_KEYS.GOALS] || [];
        widgetState.settings = result[STORAGE_KEYS.SETTINGS] || {};
        widgetState.activeTimers = result[STORAGE_KEYS.ACTIVE_TIMERS] || {};
        widgetState.enabled = widgetState.settings.floatingWidgetEnabled || false;
        widgetState.position = widgetState.settings.floatingWidgetPosition || { x: null, y: null };
        widgetState.theme = this.detectTheme();

        console.log('[Widget] State loaded:', {
          enabled: widgetState.enabled,
          goalsCount: widgetState.goals.length,
          theme: widgetState.theme
        });
      } catch (error) {
        console.error('[Widget] Error loading state:', error);
      }
    }

    detectTheme() {
      const settings = widgetState.settings;
      const themeSetting = settings.theme || 'auto';

      if (themeSetting === 'dark') return 'dark';
      if (themeSetting === 'light') return 'light';

      // Auto - check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }

    createWidget() {
      // Create host element
      this.host = document.createElement('div');
      this.host.id = 'my-tracker-widget';
      this.host.setAttribute('data-theme', widgetState.theme);

      // Attach shadow root
      this.shadow = this.host.attachShadow({ mode: 'closed' });

      // Inject styles
      const style = document.createElement('style');
      style.textContent = WIDGET_CSS;
      this.shadow.appendChild(style);

      // Create container
      this.container = document.createElement('div');
      this.container.className = 'widget-container';
      this.shadow.appendChild(this.container);

      // Render widget
      this.render();
      console.log('[Widget] Rendered, container innerHTML length:', this.container.innerHTML.length);

      // Position widget
      this.setPosition();

      // Set up event listeners
      this.setupEventListeners();

      // Add to page
      document.body.appendChild(this.host);

      // Debug: check if element is in DOM and visible
      const rect = this.container.getBoundingClientRect();
      console.log('[Widget] Widget created, rect:', rect.width, rect.height, rect.top, rect.left, rect.right, rect.bottom);
      console.log('[Widget] Container styles:', this.container.style.cssText);
    }

    render() {
      const incompleteCount = widgetState.goals.filter(g => g.progress < g.target).length;
      const badgeClass = incompleteCount === 0 && widgetState.goals.length > 0 ? 'complete' : '';
      const badgeHidden = widgetState.goals.length === 0 ? 'hidden' : '';

      this.container.innerHTML = `
        <div class="widget-icon" title="My Tracker - Click to expand, drag to move">
          ${ICONS.target}
          <span class="widget-badge ${badgeClass} ${badgeHidden}">${incompleteCount === 0 ? '✓' : incompleteCount}</span>
        </div>
        <div class="widget-panel ${widgetState.expanded ? 'visible' : ''}">
          ${this.renderPanel()}
        </div>
      `;

      this.updatePanelPosition();
    }

    renderPanel() {
      const goals = widgetState.goals;
      const completedCount = goals.filter(g => g.progress >= g.target).length;

      return `
        <div class="widget-header">
          <div class="widget-title">
            ${ICONS.target}
            <span>My Goals</span>
          </div>
          <button class="widget-close" title="Close">
            ${ICONS.close}
          </button>
        </div>
        <div class="widget-goals">
          ${goals.length === 0 ? this.renderEmptyState() : goals.map(goal => this.renderGoalItem(goal)).join('')}
        </div>
        <div class="widget-footer">
          <span class="widget-summary">${completedCount}/${goals.length} completed</span>
          <button class="widget-open-btn" title="Open full app">
            Open App
            ${ICONS.external}
          </button>
        </div>
      `;
    }

    renderEmptyState() {
      return `
        <div class="widget-empty">
          ${ICONS.empty}
          <p>No goals yet</p>
          <p style="font-size: 12px;">Click "Open App" to add goals</p>
        </div>
      `;
    }

    renderGoalItem(goal) {
      const isCompleted = goal.progress >= goal.target;
      const progressPercent = Math.min((goal.progress / goal.target) * 100, 100);

      return `
        <div class="goal-item ${isCompleted ? 'completed' : ''}" data-goal-id="${goal.id}" data-goal-type="${goal.type}">
          <div class="goal-header">
            <div class="goal-info">
              <div class="goal-title" title="${goal.title}">${goal.title}</div>
              <div class="goal-progress-text">${this.formatProgress(goal)}</div>
            </div>
            <div class="goal-controls">
              ${this.renderGoalControls(goal)}
            </div>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      `;
    }

    formatProgress(goal) {
      switch (goal.type) {
        case 'timer':
          return `${this.formatTime(goal.progress)} / ${this.formatTime(goal.target)}`;
        case 'counter':
          return `${goal.progress} / ${goal.target}`;
        case 'checkbox':
          return goal.progress >= goal.target ? 'Done' : 'Not done';
        case 'avoidance':
          return `${goal.progress} day streak`;
        default:
          return `${goal.progress} / ${goal.target}`;
      }
    }

    formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    renderGoalControls(goal) {
      switch (goal.type) {
        case 'timer':
          return this.renderTimerControls(goal);
        case 'counter':
          return this.renderCounterControls(goal);
        case 'checkbox':
          return this.renderCheckboxControls(goal);
        case 'avoidance':
          return this.renderAvoidanceControls(goal);
        default:
          return '';
      }
    }

    renderTimerControls(goal) {
      const isActive = goal.isActive || widgetState.activeTimers[goal.id];
      const currentProgress = this.getCurrentTimerProgress(goal);
      const isCompleted = currentProgress >= goal.target;

      return `
        <div class="timer-controls">
          <span class="timer-display" data-timer-display="${goal.id}">${this.formatTime(currentProgress)}</span>
          <button class="timer-btn ${isActive ? 'pause' : 'play'}"
                  data-action="${isActive ? 'pause' : 'play'}"
                  data-goal-id="${goal.id}"
                  ${isCompleted ? 'disabled' : ''}>
            ${isActive ? ICONS.pause : ICONS.play}
          </button>
        </div>
      `;
    }

    getCurrentTimerProgress(goal) {
      const timerData = widgetState.activeTimers[goal.id];
      if (!timerData || !timerData.startTime) {
        return goal.progress;
      }
      const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
      return Math.min(goal.progress + elapsed, goal.target);
    }

    renderCounterControls(goal) {
      const isCompleted = goal.progress >= goal.target;

      return `
        <div class="counter-controls">
          <button class="counter-btn" data-action="decrement" data-goal-id="${goal.id}" ${goal.progress <= 0 ? 'disabled' : ''}>
            ${ICONS.minus}
          </button>
          <span class="counter-value">${goal.progress}/${goal.target}</span>
          <button class="counter-btn" data-action="increment" data-goal-id="${goal.id}" ${isCompleted ? 'disabled' : ''}>
            ${ICONS.plus}
          </button>
        </div>
      `;
    }

    renderCheckboxControls(goal) {
      const isChecked = goal.progress >= goal.target;

      return `
        <div class="checkbox-controls">
          <button class="checkbox-btn ${isChecked ? 'checked' : ''}" data-action="toggle-checkbox" data-goal-id="${goal.id}">
            ${ICONS.check}
          </button>
        </div>
      `;
    }

    renderAvoidanceControls(goal) {
      return `
        <div class="avoidance-controls">
          <span class="avoidance-streak">
            ${ICONS.fire}
            ${goal.progress} days
          </span>
          <button class="slip-btn" data-action="slip-up" data-goal-id="${goal.id}">
            Reset
          </button>
        </div>
      `;
    }

    setPosition() {
      const pos = widgetState.position;
      const defaultRight = 24;
      const defaultBottom = 100;

      // Check if saved position is valid and within viewport
      const hasValidPosition = pos.x !== null && pos.y !== null &&
        pos.x >= 0 && pos.x < window.innerWidth &&
        pos.y >= 0 && pos.y < window.innerHeight;

      if (hasValidPosition) {
        // Use saved position - ensure it's within viewport
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        const safeX = Math.max(10, Math.min(maxX, pos.x));
        const safeY = Math.max(10, Math.min(maxY, pos.y));

        this.container.style.left = `${safeX}px`;
        this.container.style.top = `${safeY}px`;
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
        console.log('[Widget] Using saved position:', safeX, safeY);
      } else {
        // Default position: bottom-right with safe margin
        this.container.style.right = `${defaultRight}px`;
        this.container.style.bottom = `${defaultBottom}px`;
        this.container.style.left = 'auto';
        this.container.style.top = 'auto';
        console.log('[Widget] Using default position');
      }

      this.updatePanelPosition();
    }

    updatePanelPosition() {
      const rect = this.container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Remove existing position classes
      this.container.classList.remove('position-left', 'position-right', 'position-top');

      // Determine horizontal position - panel opens toward center
      if (rect.left < viewportWidth / 2) {
        this.container.classList.add('position-left');
      } else {
        this.container.classList.add('position-right');
      }

      // Determine vertical position - open upward by default (bottom of screen)
      // Only open downward if icon is in top 200px of screen
      if (rect.top < 200) {
        this.container.classList.add('position-top');
      }
    }

    setupEventListeners() {
      // Click on icon to expand/collapse
      this.container.addEventListener('click', (e) => {
        const icon = e.target.closest('.widget-icon');
        if (icon && !widgetState.isDragging) {
          this.toggleExpanded();
        }

        const closeBtn = e.target.closest('.widget-close');
        if (closeBtn) {
          this.toggleExpanded(false);
        }

        const openBtn = e.target.closest('.widget-open-btn');
        if (openBtn) {
          // Can't directly open popup, but we can notify
          console.log('[Widget] Open app clicked');
        }

        // Goal action buttons
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          this.handleGoalAction(actionBtn);
        }
      });

      // Drag functionality
      this.setupDrag();

      // Listen for theme changes
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (widgetState.settings.theme === 'auto') {
            widgetState.theme = e.matches ? 'dark' : 'light';
            this.host.setAttribute('data-theme', widgetState.theme);
          }
        });
      }
    }

    setupDrag() {
      let startX, startY, startLeft, startTop;
      let hasMoved = false;
      let currentIcon = null;

      const onMouseDown = (e) => {
        // Check if clicking on the icon (use event delegation)
        const icon = e.target.closest('.widget-icon');
        if (!icon || e.button !== 0) return;

        currentIcon = icon;
        startX = e.clientX;
        startY = e.clientY;

        const rect = this.container.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        hasMoved = false;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Only start dragging if moved more than 5px
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasMoved = true;
          widgetState.isDragging = true;
          if (currentIcon) currentIcon.classList.add('dragging');

          // Calculate new position
          let newX = startLeft + dx;
          let newY = startTop + dy;

          // Constrain to viewport
          const maxX = window.innerWidth - 60;
          const maxY = window.innerHeight - 60;
          newX = Math.max(10, Math.min(maxX, newX));
          newY = Math.max(10, Math.min(maxY, newY));

          // Apply position
          this.container.style.left = `${newX}px`;
          this.container.style.top = `${newY}px`;
          this.container.style.right = 'auto';
          this.container.style.bottom = 'auto';

          this.updatePanelPosition();
        }
      };

      const onMouseUp = async () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (currentIcon) currentIcon.classList.remove('dragging');

        if (hasMoved) {
          // Save position
          const rect = this.container.getBoundingClientRect();
          widgetState.position = { x: rect.left, y: rect.top };

          try {
            const currentSettings = widgetState.settings || {};
            await chrome.storage.local.set({
              [STORAGE_KEYS.SETTINGS]: {
                ...currentSettings,
                floatingWidgetPosition: widgetState.position
              }
            });
            console.log('[Widget] Position saved:', widgetState.position);
          } catch (error) {
            console.error('[Widget] Error saving position:', error);
          }

          // Reset dragging state after a short delay to prevent click
          setTimeout(() => {
            widgetState.isDragging = false;
          }, 100);
        } else {
          widgetState.isDragging = false;
        }

        currentIcon = null;
      };

      // Use event delegation on container - survives re-renders
      this.container.addEventListener('mousedown', onMouseDown);
    }

    toggleExpanded(expanded = !widgetState.expanded) {
      widgetState.expanded = expanded;
      const panel = this.container.querySelector('.widget-panel');
      if (panel) {
        panel.classList.toggle('visible', expanded);
      }
    }

    async handleGoalAction(btn) {
      const action = btn.dataset.action;
      const goalId = btn.dataset.goalId;

      if (!goalId) return;

      const goal = widgetState.goals.find(g => g.id === goalId);
      if (!goal) return;

      switch (action) {
        case 'increment':
          await this.incrementCounter(goal);
          break;
        case 'decrement':
          await this.decrementCounter(goal);
          break;
        case 'play':
          await this.startTimer(goal);
          break;
        case 'pause':
          await this.pauseTimer(goal);
          break;
        case 'toggle-checkbox':
          await this.toggleCheckbox(goal);
          break;
        case 'slip-up':
          await this.handleSlipUp(goal);
          break;
      }
    }

    async incrementCounter(goal) {
      if (goal.progress >= goal.target) return;

      const newProgress = goal.progress + 1;
      await this.updateGoalProgress(goal.id, newProgress);
    }

    async decrementCounter(goal) {
      if (goal.progress <= 0) return;

      const newProgress = goal.progress - 1;
      await this.updateGoalProgress(goal.id, newProgress);
    }

    async startTimer(goal) {
      try {
        const startTime = Date.now();

        // Send message to service worker
        await chrome.runtime.sendMessage({
          type: 'TIMER_START',
          goalId: goal.id,
          startTime: startTime
        });

        // Update local state
        widgetState.activeTimers[goal.id] = { startTime, goalId: goal.id };
        goal.isActive = true;

        this.render();
        console.log('[Widget] Timer started:', goal.id);
      } catch (error) {
        console.error('[Widget] Error starting timer:', error);
      }
    }

    async pauseTimer(goal) {
      try {
        // Send message to service worker
        const response = await chrome.runtime.sendMessage({
          type: 'TIMER_PAUSE',
          goalId: goal.id
        });

        // Update local state
        delete widgetState.activeTimers[goal.id];
        goal.isActive = false;

        if (response && response.elapsedSeconds !== undefined) {
          goal.progress = Math.min(goal.progress + response.elapsedSeconds, goal.target);
        }

        this.render();
        console.log('[Widget] Timer paused:', goal.id);
      } catch (error) {
        console.error('[Widget] Error pausing timer:', error);
      }
    }

    async toggleCheckbox(goal) {
      const newProgress = goal.progress >= goal.target ? 0 : goal.target;
      await this.updateGoalProgress(goal.id, newProgress);
    }

    async handleSlipUp(goal) {
      // Reset avoidance streak
      await this.updateGoalProgress(goal.id, 0);
    }

    async updateGoalProgress(goalId, newProgress) {
      try {
        // Get current goals
        const result = await chrome.storage.local.get(STORAGE_KEYS.GOALS);
        const goals = result[STORAGE_KEYS.GOALS] || [];

        // Find and update the goal
        const index = goals.findIndex(g => g.id === goalId);
        if (index === -1) return;

        goals[index].progress = newProgress;

        // Save to storage
        await chrome.storage.local.set({ [STORAGE_KEYS.GOALS]: goals });

        // Update local state
        widgetState.goals = goals;
        this.render();

        console.log('[Widget] Goal progress updated:', goalId, newProgress);
      } catch (error) {
        console.error('[Widget] Error updating goal progress:', error);
      }
    }

    setupStorageListener() {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;

        let needsRender = false;

        if (changes[STORAGE_KEYS.GOALS]) {
          widgetState.goals = changes[STORAGE_KEYS.GOALS].newValue || [];
          needsRender = true;
        }

        if (changes[STORAGE_KEYS.SETTINGS]) {
          const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue || {};
          const wasEnabled = widgetState.enabled;
          widgetState.settings = newSettings;
          widgetState.enabled = newSettings.floatingWidgetEnabled || false;

          // Handle enable/disable
          if (!wasEnabled && widgetState.enabled) {
            // Widget was just enabled
            if (!this.host) {
              this.createWidget();
              this.startTimerUpdates();
            } else {
              this.container.classList.remove('hidden');
            }
          } else if (wasEnabled && !widgetState.enabled) {
            // Widget was just disabled
            if (this.container) {
              this.container.classList.add('hidden');
            }
          }

          // Handle theme change
          const newTheme = this.detectTheme();
          if (newTheme !== widgetState.theme) {
            widgetState.theme = newTheme;
            if (this.host) {
              this.host.setAttribute('data-theme', newTheme);
            }
          }

          needsRender = true;
        }

        if (changes[STORAGE_KEYS.ACTIVE_TIMERS]) {
          widgetState.activeTimers = changes[STORAGE_KEYS.ACTIVE_TIMERS].newValue || {};
          needsRender = true;
        }

        if (needsRender && this.container && widgetState.enabled) {
          this.render();
        }
      });
    }

    startTimerUpdates() {
      // Update timer displays every second
      setInterval(() => {
        if (!widgetState.expanded || !this.container) return;

        // Update each active timer display
        Object.keys(widgetState.activeTimers).forEach(goalId => {
          const goal = widgetState.goals.find(g => g.id === goalId);
          if (!goal) return;

          const display = this.shadow.querySelector(`[data-timer-display="${goalId}"]`);
          if (display) {
            const currentProgress = this.getCurrentTimerProgress(goal);
            display.textContent = this.formatTime(currentProgress);

            // Check if timer just completed
            if (currentProgress >= goal.target && widgetState.activeTimers[goalId]) {
              this.pauseTimer(goal);
            }
          }
        });
      }, 1000);
    }

    destroy() {
      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
      Object.values(this.timerIntervals).forEach(clearInterval);
      this.timerIntervals = {};
      window.__myTrackerWidgetInitialized = false;
    }
  }

  // ============================================
  // Initialize Widget
  // ============================================
  console.log('[My Tracker Widget] Content script loaded');
  new GoalsWidget();

})();
