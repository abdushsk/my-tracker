/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    THEME CONFIGURATION - SINGLE FILE                      ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  ADD THEME:    Copy any theme below, change id + colors                   ║
 * ║  UPDATE THEME: Edit the colors directly                                   ║
 * ║  REMOVE THEME: Delete the theme object                                    ║
 * ║                                                                           ║
 * ║  That's it! No other files to edit. CSS is auto-generated.               ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

export const THEMES = {
  /**
   * Default Theme - Emerald Green
   */
  default: {
    name: 'Default',
    preview: 'linear-gradient(135deg, #10B981, #059669)',
    light: {
      accent: '#10B981',
      accentHover: '#059669',
      accentActive: '#047857',
      accentSubtle: '#D1FAE5',
      accentText: '#065F46',
      bodyGradient: 'none',
      headerGradient: 'none',
    },
    dark: {
      accent: '#34D399',
      accentHover: '#6EE7B7',
      accentActive: '#A7F3D0',
      accentSubtle: 'rgba(52, 211, 153, 0.25)',
      accentText: '#A7F3D0',
      bodyGradient: 'none',
      headerGradient: 'none',
    },
  },

  /**
   * Ocean Theme - Blue
   */
  ocean: {
    name: 'Ocean',
    preview: 'linear-gradient(135deg, #0077B6, #00B4D8)',
    light: {
      accent: '#0077B6',
      accentHover: '#005F8D',
      accentActive: '#004C73',
      accentSubtle: '#CAF0F8',
      accentText: '#023E5C',
      info: '#00B4D8',
      infoSubtle: '#CAF0F8',
      typeTimer: '#00B4D8',
      typeTimerSubtle: '#CAF0F8',
      typeCheckbox: '#0077B6',
      typeCheckboxSubtle: '#90E0EF',
      heatmap0: '#D0E8EE',
      heatmap1: '#CAF0F8',
      heatmap2: '#90E0EF',
      heatmap3: '#00B4D8',
      heatmap4: '#0077B6',
      bodyGradient: 'linear-gradient(180deg, #E8F6F9 0%, #FFFFFF 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(0, 119, 182, 0.06) 0%, transparent 100%)',
    },
    dark: {
      accent: '#00B4D8',
      accentHover: '#48CAE4',
      accentActive: '#90E0EF',
      accentSubtle: 'rgba(0, 180, 216, 0.25)',
      accentText: '#90E0EF',
      info: '#48CAE4',
      infoSubtle: 'rgba(72, 202, 228, 0.25)',
      typeTimer: '#48CAE4',
      typeTimerSubtle: 'rgba(72, 202, 228, 0.25)',
      typeCheckbox: '#00B4D8',
      typeCheckboxSubtle: 'rgba(0, 180, 216, 0.25)',
      heatmap0: '#2e2e2e',
      heatmap1: '#0A5272',
      heatmap2: '#0088CC',
      heatmap3: '#00B4D8',
      heatmap4: '#48CAE4',
      bodyGradient: 'linear-gradient(180deg, #0A1929 0%, #121212 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(0, 180, 216, 0.08) 0%, transparent 100%)',
    },
  },

  /**
   * Forest Theme - Green
   */
  forest: {
    name: 'Forest',
    preview: 'linear-gradient(135deg, #2D5016, #7CB342)',
    light: {
      accent: '#2D5016',
      accentHover: '#1E3A0F',
      accentActive: '#38721b',
      accentSubtle: '#D4E9C7',
      accentText: '#1E3A0F',
      info: '#7CB342',
      infoSubtle: '#E8F5E0',
      typeTimer: '#7CB342',
      typeTimerSubtle: '#E8F5E0',
      typeCheckbox: '#4A7C23',
      typeCheckboxSubtle: '#D4E9C7',
      heatmap0: '#f7f7f7',
      heatmap1: '#E8F5E0',
      heatmap2: '#C5E1A5',
      heatmap3: '#7CB342',
      heatmap4: '#4A7C23',
      bodyGradient: 'linear-gradient(180deg, #EDF5E8 0%, #FFFFFF 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(74, 124, 35, 0.06) 0%, transparent 100%)',
    },
    dark: {
      accent: '#7CB342',
      accentHover: '#9CCC65',
      accentActive: '#AED581',
      accentSubtle: 'rgba(124, 179, 66, 0.25)',
      accentText: '#AED581',
      info: '#9CCC65',
      infoSubtle: 'rgba(156, 204, 101, 0.25)',
      typeTimer: '#9CCC65',
      typeTimerSubtle: 'rgba(156, 204, 101, 0.25)',
      typeCheckbox: '#7CB342',
      typeCheckboxSubtle: 'rgba(124, 179, 66, 0.25)',
      heatmap0: '#2e2e2e',
      heatmap1: '#2A4A1A',
      heatmap2: '#5A8C33',
      heatmap3: '#7CB342',
      heatmap4: '#9CCC65',
      bodyGradient: 'linear-gradient(180deg, #0D1F0A 0%, #121212 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(124, 179, 66, 0.08) 0%, transparent 100%)',
    },
  },

  /**
   * Sunset Theme - Orange
   */
  sunset: {
    name: 'Sunset',
    preview: 'linear-gradient(135deg, #E65100, #F7931E)',
    light: {
      accent: '#E65100',
      accentHover: '#BF360C',
      accentActive: '#a03b19',
      accentSubtle: '#FFE0B2',
      accentText: '#BF360C',
      warning: '#F7931E',
      warningHover: '#E07A00',
      warningSubtle: '#FFE0B2',
      typeTimer: '#F7931E',
      typeTimerSubtle: '#FFE0B2',
      typeCounter: '#FF6B35',
      typeCounterSubtle: '#FFCCBC',
      typeCheckbox: '#FF6B35',
      typeCheckboxSubtle: '#FFCCBC',
      heatmap0: '#f7f7f7',
      heatmap1: '#FFE0B2',
      heatmap2: '#FFCC80',
      heatmap3: '#FF9800',
      heatmap4: '#E65100',
      bodyGradient: 'linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(255, 107, 53, 0.06) 0%, transparent 100%)',
    },
    dark: {
      accent: '#FF8A50',
      accentHover: '#FFAB91',
      accentActive: '#FFCCBC',
      accentSubtle: 'rgba(255, 138, 80, 0.25)',
      accentText: '#FFCCBC',
      warning: '#FFB74D',
      warningHover: '#FFA726',
      warningSubtle: 'rgba(255, 183, 77, 0.25)',
      typeTimer: '#FFB74D',
      typeTimerSubtle: 'rgba(255, 183, 77, 0.25)',
      typeCounter: '#FF8A50',
      typeCounterSubtle: 'rgba(255, 138, 80, 0.25)',
      typeCheckbox: '#FF8A50',
      typeCheckboxSubtle: 'rgba(255, 138, 80, 0.25)',
      heatmap0: '#2e2e2e',
      heatmap1: '#5A2E17',
      heatmap2: '#CF460C',
      heatmap3: '#E65100',
      heatmap4: '#FF8A50',
      bodyGradient: 'linear-gradient(180deg, #291005 0%, #121212 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(255, 138, 80, 0.08) 0%, transparent 100%)',
    },
  },

  /**
   * Lavender Theme - Purple
   */
  lavender: {
    name: 'Lavender',
    preview: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
    light: {
      accent: '#7C3AED',
      accentHover: '#6D28D9',
      accentActive: '#5B21B6',
      accentSubtle: '#EDE9FE',
      accentText: '#5B21B6',
      info: '#A78BFA',
      infoSubtle: '#EDE9FE',
      typeTimer: '#A78BFA',
      typeTimerSubtle: '#EDE9FE',
      typeCheckbox: '#8B5CF6',
      typeCheckboxSubtle: '#DDD6FE',
      typeAvoidance: '#7C3AED',
      typeAvoidanceSubtle: '#EDE9FE',
      heatmap0: '#f7f7f7',
      heatmap1: '#EDE9FE',
      heatmap2: '#DDD6FE',
      heatmap3: '#A78BFA',
      heatmap4: '#7C3AED',
      bodyGradient: 'linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, transparent 100%)',
    },
    dark: {
      accent: '#A78BFA',
      accentHover: '#C4B5FD',
      accentActive: '#DDD6FE',
      accentSubtle: 'rgba(167, 139, 250, 0.25)',
      accentText: '#DDD6FE',
      info: '#C4B5FD',
      infoSubtle: 'rgba(196, 181, 253, 0.25)',
      typeTimer: '#C4B5FD',
      typeTimerSubtle: 'rgba(196, 181, 253, 0.25)',
      typeCheckbox: '#A78BFA',
      typeCheckboxSubtle: 'rgba(167, 139, 250, 0.25)',
      typeAvoidance: '#A78BFA',
      typeAvoidanceSubtle: 'rgba(167, 139, 250, 0.25)',
      heatmap0: '#2e2e2e',
      heatmap1: '#3D2F6B',
      heatmap2: '#6B31C6',
      heatmap3: '#7C3AED',
      heatmap4: '#A78BFA',
      bodyGradient: 'linear-gradient(180deg, #1A0F29 0%, #121212 20%)',
      headerGradient: 'linear-gradient(180deg, rgba(167, 139, 250, 0.08) 0%, transparent 100%)',
    },
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export const AVAILABLE_COLOR_THEMES = Object.keys(THEMES);
export const getThemeMetadata = (id) => THEMES[id] || null;
export const getAllThemes = () => AVAILABLE_COLOR_THEMES.map(id => ({
  id,
  name: THEMES[id].name,
  preview: THEMES[id].preview,
}));

// =============================================================================
// CSS GENERATOR - Converts theme config to CSS variables
// =============================================================================

/**
 * Generate CSS variables for a theme
 */
function generateThemeCSS(id, colors, isDark) {
  const vars = [];

  if (colors.accent) vars.push(`--accent: ${colors.accent}`);
  if (colors.accentHover) vars.push(`--accent-hover: ${colors.accentHover}`);
  if (colors.accentActive) vars.push(`--accent-active: ${colors.accentActive}`);
  if (colors.accentSubtle) vars.push(`--accent-subtle: ${colors.accentSubtle}`);
  if (colors.accentText) vars.push(`--accent-text: ${colors.accentText}`);
  if (colors.info) vars.push(`--info: ${colors.info}`);
  if (colors.infoSubtle) vars.push(`--info-subtle: ${colors.infoSubtle}`);
  if (colors.warning) vars.push(`--warning: ${colors.warning}`);
  if (colors.warningHover) vars.push(`--warning-hover: ${colors.warningHover}`);
  if (colors.warningSubtle) vars.push(`--warning-subtle: ${colors.warningSubtle}`);
  if (colors.typeTimer) vars.push(`--type-timer: ${colors.typeTimer}`);
  if (colors.typeTimerSubtle) vars.push(`--type-timer-subtle: ${colors.typeTimerSubtle}`);
  if (colors.typeCounter) vars.push(`--type-counter: ${colors.typeCounter}`);
  if (colors.typeCounterSubtle) vars.push(`--type-counter-subtle: ${colors.typeCounterSubtle}`);
  if (colors.typeCheckbox) vars.push(`--type-checkbox: ${colors.typeCheckbox}`);
  if (colors.typeCheckboxSubtle) vars.push(`--type-checkbox-subtle: ${colors.typeCheckboxSubtle}`);
  if (colors.typeAvoidance) vars.push(`--type-avoidance: ${colors.typeAvoidance}`);
  if (colors.typeAvoidanceSubtle) vars.push(`--type-avoidance-subtle: ${colors.typeAvoidanceSubtle}`);
  if (colors.heatmap0) vars.push(`--heatmap-level-0: ${colors.heatmap0}`);
  if (colors.heatmap1) vars.push(`--heatmap-level-1: ${colors.heatmap1}`);
  if (colors.heatmap2) vars.push(`--heatmap-level-2: ${colors.heatmap2}`);
  if (colors.heatmap3) vars.push(`--heatmap-level-3: ${colors.heatmap3}`);
  if (colors.heatmap4) vars.push(`--heatmap-level-4: ${colors.heatmap4}`);
  if (colors.bodyGradient) vars.push(`--body-gradient: ${colors.bodyGradient}`);
  if (colors.headerGradient) vars.push(`--header-gradient: ${colors.headerGradient}`);

  // US-008: Chart bar colors - always derive from accent for theme consistency
  vars.push(`--chart-bar-excellent: var(--accent)`);
  vars.push(`--chart-bar-good: var(--accent-hover)`);
  vars.push(`--chart-bar-moderate: var(--accent-active)`);
  vars.push(`--chart-bar-low: var(--border)`);

  // Legacy aliases
  vars.push(`--primary: var(--accent)`);
  vars.push(`--primary-hover: var(--accent-hover)`);
  vars.push(`--primary-light: var(--accent-subtle)`);

  const selector = isDark
    ? `[data-theme="dark"][data-color-theme="${id}"]`
    : `[data-color-theme="${id}"]`;

  return `${selector} {\n  ${vars.join(';\n  ')};\n}`;
}

/**
 * Generate all theme CSS and inject into document
 */
export function injectThemeCSS() {
  let css = `
/* Auto-generated theme CSS from theme-config.js */
[data-color-theme] body,
[data-color-theme] .popup-container {
  background: var(--body-gradient);
}
[data-color-theme] .screen-header {
  background: var(--header-gradient);
}
`;

  Object.entries(THEMES).forEach(([id, theme]) => {
    if (id === 'default') return; // Default uses :root
    css += '\n' + generateThemeCSS(id, theme.light, false);
    css += '\n' + generateThemeCSS(id, theme.dark, true);
  });

  // Inject or update style element
  let styleEl = document.getElementById('theme-css');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
