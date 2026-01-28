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
    ACTIVE_TIMERS: 'activeTimers',
    WIDGET_GOAL_ORDER: 'widgetGoalOrder' // Per-site goal order for widget
  };

  // ============================================
  // Widget State
  // ============================================
  let widgetState = {
    enabled: false,
    expanded: false,
    dismissed: false, // US-025: Session-only dismissal flag
    goals: [],
    settings: {},
    activeTimers: {},
    position: { x: null, y: null },
    isDragging: false,
    theme: 'light',
    colorTheme: 'default', // Color theme (default, ocean, forest, sunset, lavender)
    goalOrder: [] // Per-site goal order (array of goal IDs)
  };

  // Get current site key for per-site position storage
  const getSiteKey = () => {
    return window.location.hostname || 'default';
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
      font-size: 12px;
      line-height: 1.4;
      transition: opacity 0.2s ease;
    }

    .widget-container.hidden {
      display: none;
    }

    /* Collapsed Icon Button */
    .widget-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
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
      width: 20px;
      height: 20px;
      color: var(--widget-accent);
    }

    /* Badge on icon */
    .widget-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--widget-danger);
      color: white;
      font-size: 10px;
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

    /* US-025: Hover dismiss button */
    .widget-dismiss {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      border: none;
      background: var(--widget-danger);
      border-radius: 50%;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      padding: 0;
      transition: background 0.15s ease, transform 0.15s ease;
      z-index: 10;
    }

    .widget-dismiss svg {
      width: 12px;
      height: 12px;
    }

    .widget-icon:hover .widget-dismiss {
      display: flex;
    }

    .widget-dismiss:hover {
      background: #DC2626;
      transform: scale(1.1);
    }

    .widget-dismiss:active {
      transform: scale(0.95);
    }

    /* Expanded Panel */
    .widget-panel {
      position: absolute;
      width: 280px;
      max-height: 380px;
      background: var(--widget-bg);
      border: 1px solid var(--widget-border);
      border-radius: 10px;
      box-shadow: var(--widget-shadow);
      overflow: hidden;
      display: none;
      flex-direction: column;
      bottom: 50px;
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
      top: 50px;
    }

    /* Panel Header */
    .widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--widget-border);
      background: var(--widget-bg-raised);
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 12px;
      color: var(--widget-text);
    }

    .widget-title svg {
      width: 14px;
      height: 14px;
      color: var(--widget-accent);
    }

    .widget-close {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      border-radius: 5px;
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
      width: 14px;
      height: 14px;
    }

    /* Goals List */
    .widget-goals {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      max-height: 290px;
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
      gap: 5px;
      padding: 8px 10px;
      background: var(--widget-bg);
      border: 1px solid var(--widget-border);
      border-radius: 6px;
      margin-bottom: 5px;
      transition: border-color 0.15s ease, transform 0.3s ease, opacity 0.3s ease;
    }

    .goal-item:hover {
      border-color: var(--widget-accent);
    }

    .goal-item.completed {
      opacity: 0.6;
    }

    .goal-item.completed .goal-title {
      text-decoration: line-through;
      color: var(--widget-text-secondary);
    }

    .goal-item.animating {
      transform: translateY(10px);
      opacity: 0;
    }

    .goal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .goal-info {
      flex: 1;
      min-width: 0;
    }

    .goal-title {
      font-size: 11px;
      font-weight: 500;
      color: var(--widget-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .goal-progress-text {
      font-size: 10px;
      color: var(--widget-text-secondary);
    }

    /* Progress Bar */
    .goal-progress-bar {
      height: 3px;
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

    .goal-item.completed .goal-progress-bar {
      display: none;
    }

    /* Drag and Drop */
    .goal-item.dragging {
      display: none !important;
    }

    .drag-placeholder {
      background: var(--widget-bg-sunken);
      border: 2px dashed var(--widget-border);
      border-radius: 6px;
      margin-bottom: 5px;
      transition: all 0.15s ease;
    }

    /* Goal Controls */
    .goal-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    /* Counter Controls */
    .counter-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .counter-btn {
      width: 26px;
      height: 26px;
      border: 1px solid var(--widget-border);
      background: var(--widget-bg);
      border-radius: 5px;
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
      width: 12px;
      height: 12px;
    }

    .counter-value {
      min-width: 40px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--widget-text);
    }

    /* Timer Controls */
    .timer-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .timer-display {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 500;
      color: var(--widget-text);
      min-width: 50px;
      text-align: center;
    }

    .timer-btn {
      width: 28px;
      height: 28px;
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
      width: 12px;
      height: 12px;
    }

    /* Checkbox Controls */
    .checkbox-controls {
      display: flex;
      align-items: center;
    }

    .checkbox-btn {
      width: 22px;
      height: 22px;
      border: 2px solid var(--widget-border);
      background: var(--widget-bg);
      border-radius: 5px;
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
      width: 12px;
      height: 12px;
    }

    /* Avoidance Controls */
    .avoidance-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .avoidance-streak {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 500;
      color: var(--widget-accent);
    }

    .avoidance-streak svg {
      width: 12px;
      height: 12px;
    }

    .slip-btn {
      padding: 3px 8px;
      border: 1px solid var(--widget-danger);
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
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
      padding: 8px 10px;
      border-top: 1px solid var(--widget-border);
      background: var(--widget-bg-raised);
    }

    .widget-summary {
      font-size: 10px;
      color: var(--widget-text-secondary);
    }

    .widget-open-btn {
      padding: 5px 10px;
      border: none;
      background: var(--widget-accent);
      color: white;
      border-radius: 5px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 3px;
      transition: background 0.15s ease;
    }

    .widget-open-btn:hover {
      background: var(--widget-accent-hover);
    }

    .widget-open-btn svg {
      width: 12px;
      height: 12px;
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

    /* Ocean Theme - Light */
    :host([data-color-theme="ocean"]) {
      --widget-accent: #0077B6;
      --widget-accent-hover: #005F8D;
      --widget-accent-subtle: #CAF0F8;
    }

    /* Ocean Theme - Dark */
    :host([data-theme="dark"][data-color-theme="ocean"]) {
      --widget-accent: #00B4D8;
      --widget-accent-hover: #48CAE4;
      --widget-accent-subtle: rgba(0, 180, 216, 0.25);
    }

    /* Forest Theme - Light */
    :host([data-color-theme="forest"]) {
      --widget-accent: #2D5016;
      --widget-accent-hover: #1E3A0F;
      --widget-accent-subtle: #D4E9C7;
    }

    /* Forest Theme - Dark */
    :host([data-theme="dark"][data-color-theme="forest"]) {
      --widget-accent: #7CB342;
      --widget-accent-hover: #9CCC65;
      --widget-accent-subtle: rgba(124, 179, 66, 0.25);
    }

    /* Sunset Theme - Light */
    :host([data-color-theme="sunset"]) {
      --widget-accent: #E65100;
      --widget-accent-hover: #BF360C;
      --widget-accent-subtle: #FFE0B2;
      --widget-warning: #F7931E;
      --widget-warning-hover: #E07A00;
    }

    /* Sunset Theme - Dark */
    :host([data-theme="dark"][data-color-theme="sunset"]) {
      --widget-accent: #FF8A50;
      --widget-accent-hover: #FFAB91;
      --widget-accent-subtle: rgba(255, 138, 80, 0.25);
      --widget-warning: #FFB74D;
      --widget-warning-hover: #FFA726;
    }

    /* Lavender Theme - Light */
    :host([data-color-theme="lavender"]) {
      --widget-accent: #7C3AED;
      --widget-accent-hover: #6D28D9;
      --widget-accent-subtle: #EDE9FE;
    }

    /* Lavender Theme - Dark */
    :host([data-theme="dark"][data-color-theme="lavender"]) {
      --widget-accent: #A78BFA;
      --widget-accent-hover: #C4B5FD;
      --widget-accent-subtle: rgba(167, 139, 250, 0.25);
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
    empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
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

      // Drag state
      this.dragState = {
        isDragging: false,
        draggedCard: null,
        draggedGoalId: null,
        dragClone: null,
        placeholder: null,
        startY: 0,
        offsetY: 0,
        cloneLeft: 0,
        goalsList: null
      };

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
          STORAGE_KEYS.ACTIVE_TIMERS,
          STORAGE_KEYS.WIDGET_GOAL_ORDER
        ]);

        widgetState.goals = result[STORAGE_KEYS.GOALS] || [];
        widgetState.settings = result[STORAGE_KEYS.SETTINGS] || {};
        widgetState.activeTimers = result[STORAGE_KEYS.ACTIVE_TIMERS] || {};
        widgetState.enabled = widgetState.settings.floatingWidgetEnabled || false;

        // Get position and goal order for current site
        const siteKey = getSiteKey();
        const sitePositions = widgetState.settings.floatingWidgetPositions || {};
        widgetState.position = sitePositions[siteKey] || { x: null, y: null };

        // Get per-site goal order
        const allSiteOrders = result[STORAGE_KEYS.WIDGET_GOAL_ORDER] || {};
        widgetState.goalOrder = allSiteOrders[siteKey] || [];

        widgetState.theme = this.detectTheme();
        widgetState.colorTheme = widgetState.settings.colorTheme || 'default';

        console.log('[Widget] State loaded:', {
          enabled: widgetState.enabled,
          goalsCount: widgetState.goals.length,
          theme: widgetState.theme,
          site: siteKey,
          position: widgetState.position,
          goalOrder: widgetState.goalOrder
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

      // Apply color theme if not default
      if (widgetState.colorTheme && widgetState.colorTheme !== 'default') {
        this.host.setAttribute('data-color-theme', widgetState.colorTheme);
      }

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
          <button class="widget-dismiss" title="Dismiss widget for this session" data-action="dismiss-widget">
            ${ICONS.close}
          </button>
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

      // Sort goals by per-site custom order, then completed at bottom
      const sortedGoals = this.getSortedGoals();

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
          ${sortedGoals.length === 0 ? this.renderEmptyState() : sortedGoals.map(goal => this.renderGoalItem(goal)).join('')}
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

    // Get goals sorted by per-site custom order, with completed at bottom
    getSortedGoals() {
      const goals = [...widgetState.goals];
      const order = widgetState.goalOrder;

      // First sort by custom order (goals not in order array go last)
      goals.sort((a, b) => {
        const aIndex = order.indexOf(a.id);
        const bIndex = order.indexOf(b.id);

        // If neither is in order, keep original order
        if (aIndex === -1 && bIndex === -1) return 0;
        // If only one is in order, it comes first
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        // Both in order, sort by index
        return aIndex - bIndex;
      });

      // Then sort completed items to the bottom while preserving relative order
      const incomplete = goals.filter(g => g.progress < g.target);
      const completed = goals.filter(g => g.progress >= g.target);

      return [...incomplete, ...completed];
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

      return `
        <div class="timer-controls">
          <span class="timer-display" data-timer-display="${goal.id}">${this.formatTime(currentProgress)}</span>
          <button class="timer-btn ${isActive ? 'pause' : 'play'}"
                  data-action="${isActive ? 'pause' : 'play'}"
                  data-goal-id="${goal.id}">
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
      return goal.progress + elapsed; // Allow overflow
    }

    renderCounterControls(goal) {
      return `
        <div class="counter-controls">
          <button class="counter-btn" data-action="decrement" data-goal-id="${goal.id}" ${goal.progress <= 0 ? 'disabled' : ''}>
            ${ICONS.minus}
          </button>
          <span class="counter-value">${goal.progress}/${goal.target}</span>
          <button class="counter-btn" data-action="increment" data-goal-id="${goal.id}">
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

        // Update panel position based on saved coordinates
        this.updatePanelPosition(safeX, safeY);
        console.log('[Widget] Using saved position:', safeX, safeY);
      } else {
        // Default position: bottom-right with safe margin
        this.container.style.right = `${defaultRight}px`;
        this.container.style.bottom = `${defaultBottom}px`;
        this.container.style.left = 'auto';
        this.container.style.top = 'auto';

        // Calculate actual position for panel direction
        const actualX = window.innerWidth - defaultRight - 40; // 40 is icon width
        const actualY = window.innerHeight - defaultBottom - 40; // 40 is icon height
        this.updatePanelPosition(actualX, actualY);
        console.log('[Widget] Using default position, calculated:', actualX, actualY);
      }
    }

    updatePanelPosition(x = null, y = null) {
      const viewportWidth = window.innerWidth;

      // Use provided coordinates or fall back to getBoundingClientRect
      let posX = x;
      let posY = y;

      if (posX === null || posY === null) {
        const rect = this.container.getBoundingClientRect();
        posX = rect.left;
        posY = rect.top;
      }

      // Remove existing position classes
      this.container.classList.remove('position-left', 'position-right', 'position-top');

      // Determine horizontal position - panel opens toward center
      if (posX < viewportWidth / 2) {
        this.container.classList.add('position-left');
      } else {
        this.container.classList.add('position-right');
      }

      // Determine vertical position - open upward by default (bottom of screen)
      // Only open downward if icon is in top 200px of screen
      if (posY < 200) {
        this.container.classList.add('position-top');
      }
    }

    setupEventListeners() {
      // Click on icon to expand/collapse
      this.container.addEventListener('click', (e) => {
        // US-025: Dismiss button handler (must be checked first to prevent icon toggle)
        const dismissBtn = e.target.closest('.widget-dismiss');
        if (dismissBtn) {
          e.stopPropagation();
          this.dismissWidget();
          return;
        }

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
          // US-024: Send message to service worker to open popup
          this.openPopup();
        }

        // Goal action buttons
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          this.handleGoalAction(actionBtn);
        }
      });

      // Drag functionalitys
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

      // Setup goal drag-to-reorder
      this.setupGoalDrag();
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

          this.updatePanelPosition(newX, newY);
        }
      };

      const onMouseUp = async () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (currentIcon) currentIcon.classList.remove('dragging');

        if (hasMoved) {
          // Save position per site
          const rect = this.container.getBoundingClientRect();
          widgetState.position = { x: rect.left, y: rect.top };

          try {
            const currentSettings = widgetState.settings || {};
            const siteKey = getSiteKey();
            const sitePositions = currentSettings.floatingWidgetPositions || {};
            sitePositions[siteKey] = widgetState.position;

            await chrome.storage.local.set({
              [STORAGE_KEYS.SETTINGS]: {
                ...currentSettings,
                floatingWidgetPositions: sitePositions
              }
            });
            console.log('[Widget] Position saved for', siteKey, ':', widgetState.position);
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

    // ============================================
    // Goal Drag-to-Reorder
    // ============================================

    setupGoalDrag() {
      // Use event delegation on the shadow root for goal dragging
      this.shadow.addEventListener('mousedown', (e) => this.handleGoalDragStart(e));
      this.shadow.addEventListener('touchstart', (e) => this.handleGoalTouchStart(e), { passive: false });
    }

    handleGoalDragStart(e) {
      if (e.button !== 0) return;

      const goalItem = e.target.closest('.goal-item');
      if (!goalItem) return;

      // Don't drag if clicking on controls
      if (e.target.closest('.goal-controls, button')) return;

      e.preventDefault();
      e.stopPropagation();

      this.startGoalDrag(goalItem, e.clientY);

      // Bind handlers
      this.boundGoalDragMove = (e) => this.handleGoalDragMove(e);
      this.boundGoalDragEnd = () => this.handleGoalDragEnd();

      document.addEventListener('mousemove', this.boundGoalDragMove);
      document.addEventListener('mouseup', this.boundGoalDragEnd);
    }

    handleGoalTouchStart(e) {
      const goalItem = e.target.closest('.goal-item');
      if (!goalItem) return;

      if (e.target.closest('.goal-controls, button')) return;

      e.preventDefault();

      const touch = e.touches[0];
      this.startGoalDrag(goalItem, touch.clientY);

      this.boundGoalTouchMove = (e) => this.handleGoalTouchMove(e);
      this.boundGoalTouchEnd = () => this.handleGoalDragEnd();

      document.addEventListener('touchmove', this.boundGoalTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundGoalTouchEnd);
    }

    startGoalDrag(goalItem, clientY) {
      const ds = this.dragState;
      ds.isDragging = true;
      ds.draggedCard = goalItem;
      ds.draggedGoalId = goalItem.getAttribute('data-goal-id');
      ds.goalsList = this.shadow.querySelector('.widget-goals');

      const rect = goalItem.getBoundingClientRect();
      ds.startY = clientY;
      ds.offsetY = clientY - rect.top;
      ds.cloneLeft = rect.left; // Store left position to keep clone horizontally aligned

      // Get colors based on theme
      const bgColor = widgetState.theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
      const borderColor = widgetState.theme === 'dark' ? '#333333' : '#E5E5E5';

      // Create clone that follows cursor (preserve all classes and styling)
      ds.dragClone = goalItem.cloneNode(true);
      ds.dragClone.classList.remove('dragging');
      ds.dragClone.style.cssText = `
        position: fixed !important;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        z-index: 2147483647;
        pointer-events: none;
        cursor: grabbing;
        transform: scale(1.03);
        box-shadow: 0 12px 28px rgba(0,0,0,0.25);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 8px 10px;
        opacity: 1 !important;
        margin: 0 !important;
      `;
      this.shadow.appendChild(ds.dragClone);

      // Animate clone scale
      requestAnimationFrame(() => {
        if (ds.dragClone) {
          ds.dragClone.style.transform = 'scale(1.05)';
        }
      });

      // Create placeholder
      ds.placeholder = document.createElement('div');
      ds.placeholder.className = 'drag-placeholder';
      ds.placeholder.style.height = `${rect.height}px`;

      // Hide original and insert placeholder
      goalItem.classList.add('dragging');
      goalItem.parentNode.insertBefore(ds.placeholder, goalItem);
    }

    handleGoalDragMove(e) {
      if (!this.dragState.isDragging) return;
      e.preventDefault();
      this.updateGoalDragPosition(e.clientY);
    }

    handleGoalTouchMove(e) {
      if (!this.dragState.isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.updateGoalDragPosition(touch.clientY);
    }

    updateGoalDragPosition(clientY) {
      const ds = this.dragState;
      if (!ds.dragClone || !ds.placeholder) return;

      // Move clone (only vertical, keep horizontal position fixed)
      const cloneTop = clientY - ds.offsetY;
      ds.dragClone.style.top = `${cloneTop}px`;
      ds.dragClone.style.left = `${ds.cloneLeft}px`;

      // Find insert position
      if (!ds.goalsList) return;

      const cards = Array.from(ds.goalsList.querySelectorAll('.goal-item:not(.dragging)'));
      if (cards.length === 0) return;

      const dragCenterY = cloneTop + (ds.placeholder.offsetHeight / 2);

      let insertBeforeCard = null;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (dragCenterY < midY) {
          insertBeforeCard = card;
          break;
        }
      }

      // Move placeholder
      if (insertBeforeCard) {
        ds.goalsList.insertBefore(ds.placeholder, insertBeforeCard);
      } else {
        ds.goalsList.appendChild(ds.placeholder);
      }
    }

    async handleGoalDragEnd() {
      const ds = this.dragState;
      if (!ds.isDragging) return;

      // Remove listeners
      document.removeEventListener('mousemove', this.boundGoalDragMove);
      document.removeEventListener('mouseup', this.boundGoalDragEnd);
      document.removeEventListener('touchmove', this.boundGoalTouchMove);
      document.removeEventListener('touchend', this.boundGoalTouchEnd);

      ds.isDragging = false;

      // Animate clone back to placeholder position
      if (ds.dragClone && ds.placeholder) {
        const placeholderRect = ds.placeholder.getBoundingClientRect();

        ds.dragClone.style.transition = 'all 0.2s ease';
        ds.dragClone.style.transform = 'scale(1)';
        ds.dragClone.style.left = `${placeholderRect.left}px`;
        ds.dragClone.style.top = `${placeholderRect.top}px`;
        ds.dragClone.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Calculate new order using insertIndex approach (like main dragDrop.js)
      if (ds.goalsList && ds.placeholder && ds.draggedGoalId) {
        const allElements = Array.from(ds.goalsList.children);

        // Count non-dragging cards BEFORE the placeholder to get insert index
        let insertIndex = 0;
        for (const el of allElements) {
          if (el === ds.placeholder) break;
          if (el.classList.contains('goal-item') && !el.classList.contains('dragging')) {
            insertIndex++;
          }
        }

        // Get current visual order
        const currentOrder = this.getSortedGoals().map(g => g.id);

        // Find and remove dragged item from its current position
        const draggedCurrentIndex = currentOrder.indexOf(ds.draggedGoalId);
        if (draggedCurrentIndex !== -1) {
          currentOrder.splice(draggedCurrentIndex, 1);
        }

        // Insert at new position
        // No adjustment needed - insertIndex is the count of non-dragging cards before placeholder
        // which directly maps to the correct array index after removal
        currentOrder.splice(insertIndex, 0, ds.draggedGoalId);

        // Save new order
        await this.saveGoalOrder(currentOrder);
      }

      // Clean up
      if (ds.dragClone) {
        ds.dragClone.remove();
        ds.dragClone = null;
      }

      if (ds.placeholder) {
        ds.placeholder.remove();
        ds.placeholder = null;
      }

      if (ds.draggedCard) {
        ds.draggedCard.classList.remove('dragging');
        ds.draggedCard = null;
      }

      ds.draggedGoalId = null;
      ds.goalsList = null;

      // Re-render
      this.render();
    }

    async saveGoalOrder(newOrder) {
      try {
        const siteKey = getSiteKey();
        const result = await chrome.storage.local.get(STORAGE_KEYS.WIDGET_GOAL_ORDER);
        const allSiteOrders = result[STORAGE_KEYS.WIDGET_GOAL_ORDER] || {};

        allSiteOrders[siteKey] = newOrder;
        widgetState.goalOrder = newOrder;

        await chrome.storage.local.set({
          [STORAGE_KEYS.WIDGET_GOAL_ORDER]: allSiteOrders
        });

        console.log('[Widget] Goal order saved for', siteKey, ':', newOrder);
      } catch (error) {
        console.error('[Widget] Error saving goal order:', error);
      }
    }

    toggleExpanded(expanded = !widgetState.expanded) {
      widgetState.expanded = expanded;
      const panel = this.container.querySelector('.widget-panel');
      if (panel) {
        panel.classList.toggle('visible', expanded);
      }
    }

    /**
     * US-024: Open the main popup via service worker
     * Uses chrome.action.openPopup() which requires Chrome 127+
     */
    async openPopup() {
      try {
        console.log('[Widget] Requesting popup open');
        const response = await chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        if (response && !response.success) {
          console.warn('[Widget] Could not open popup:', response.error);
          // Show visual feedback that user should click the extension icon
          this.showOpenPopupHint();
        }
      } catch (error) {
        console.error('[Widget] Error opening popup:', error);
        this.showOpenPopupHint();
      }
    }

    /**
     * US-024: Show a hint to user when popup can't be opened programmatically
     */
    showOpenPopupHint() {
      const btn = this.container.querySelector('.widget-open-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `${ICONS.info} Click extension icon`;
        btn.style.background = 'var(--widget-warning)';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
        }, 3000);
      }
    }

    /**
     * US-025: Dismiss widget for current session only
     * Widget can be restored via context menu (US-027) or by refreshing the page
     */
    dismissWidget() {
      widgetState.dismissed = true;
      this.container.classList.add('hidden');
      console.log('[Widget] Dismissed for current session');
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

        // Use targeted update
        this.updateGoalItem(goal.id);
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
          goal.progress = goal.progress + response.elapsedSeconds; // Allow overflow
        }

        // Use targeted update
        this.updateGoalItem(goal.id);
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

        // Use targeted update instead of full re-render
        this.updateGoalItem(goalId);

        console.log('[Widget] Goal progress updated:', goalId, newProgress);
      } catch (error) {
        console.error('[Widget] Error updating goal progress:', error);
      }
    }

    // Update a specific goal item without re-rendering the entire panel
    updateGoalItem(goalId) {
      const goal = widgetState.goals.find(g => g.id === goalId);
      if (!goal) return;

      const goalElement = this.shadow.querySelector(`[data-goal-id="${goalId}"]`);
      if (!goalElement) {
        // If element not found, do a full render
        this.render();
        return;
      }

      const isCompleted = goal.progress >= goal.target;
      const progressPercent = Math.min((goal.progress / goal.target) * 100, 100);

      // Update completed state
      goalElement.classList.toggle('completed', isCompleted);

      // Update progress text
      const progressText = goalElement.querySelector('.goal-progress-text');
      if (progressText) {
        progressText.textContent = this.formatProgress(goal);
      }

      // Update progress bar
      const progressFill = goalElement.querySelector('.goal-progress-fill');
      if (progressFill) {
        progressFill.style.width = `${progressPercent}%`;
      }

      // Update controls
      const controlsContainer = goalElement.querySelector('.goal-controls');
      if (controlsContainer) {
        controlsContainer.innerHTML = this.renderGoalControls(goal);
      }

      // Update badge
      this.updateBadge();

      // Update footer summary
      this.updateFooterSummary();
    }

    updateBadge() {
      const incompleteCount = widgetState.goals.filter(g => g.progress < g.target).length;
      const badge = this.shadow.querySelector('.widget-badge');
      if (badge) {
        badge.textContent = incompleteCount === 0 ? '✓' : incompleteCount;
        badge.classList.toggle('complete', incompleteCount === 0 && widgetState.goals.length > 0);
        badge.classList.toggle('hidden', widgetState.goals.length === 0);
      }
    }

    updateFooterSummary() {
      const completedCount = widgetState.goals.filter(g => g.progress >= g.target).length;
      const summary = this.shadow.querySelector('.widget-summary');
      if (summary) {
        summary.textContent = `${completedCount}/${widgetState.goals.length} completed`;
      }
    }

    setupStorageListener() {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;

        let needsFullRender = false;

        if (changes[STORAGE_KEYS.GOALS]) {
          const oldGoals = widgetState.goals;
          const newGoals = changes[STORAGE_KEYS.GOALS].newValue || [];
          widgetState.goals = newGoals;

          // Only do full render if goals were added/removed, not just updated
          if (oldGoals.length !== newGoals.length ||
              !oldGoals.every(og => newGoals.some(ng => ng.id === og.id))) {
            needsFullRender = true;
          } else {
            // US-023: Update each changed goal individually for real-time sync
            // Find goals that changed and update them
            newGoals.forEach(newGoal => {
              const oldGoal = oldGoals.find(og => og.id === newGoal.id);
              if (oldGoal) {
                // Check if progress or isActive changed
                if (oldGoal.progress !== newGoal.progress ||
                    oldGoal.isActive !== newGoal.isActive) {
                  this.updateGoalItem(newGoal.id);
                }
              }
            });
            // Also update badge and summary
            this.updateBadge();
            this.updateFooterSummary();
          }
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

          // Handle theme change (light/dark)
          const newTheme = this.detectTheme();
          if (newTheme !== widgetState.theme) {
            widgetState.theme = newTheme;
            if (this.host) {
              this.host.setAttribute('data-theme', newTheme);
            }
          }

          // Handle color theme change
          const newColorTheme = newSettings.colorTheme || 'default';
          if (newColorTheme !== widgetState.colorTheme) {
            widgetState.colorTheme = newColorTheme;
            if (this.host) {
              if (newColorTheme && newColorTheme !== 'default') {
                this.host.setAttribute('data-color-theme', newColorTheme);
              } else {
                this.host.removeAttribute('data-color-theme');
              }
            }
          }

          needsFullRender = true;
        }

        if (changes[STORAGE_KEYS.ACTIVE_TIMERS]) {
          widgetState.activeTimers = changes[STORAGE_KEYS.ACTIVE_TIMERS].newValue || {};
          // Don't need full render for timer state changes
        }

        if (needsFullRender && this.container && widgetState.enabled) {
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
            // Timer continues even after target is reached (allows overflow)
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
