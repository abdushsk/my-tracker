# Daily Goals Tracker - UI Design Document

This document defines the consistent design patterns, spacing system, typography, colors, and component styles used throughout the Daily Goals Tracker Chrome extension.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Spacing System](#spacing-system)
3. [Typography Scale](#typography-scale)
4. [Color Palette](#color-palette)
5. [Shadows & Elevation](#shadows--elevation)
6. [Border Radius](#border-radius)
7. [Transitions & Animations](#transitions--animations)
8. [Button Variants](#button-variants)
9. [Form Patterns](#form-patterns)
10. [Card Components](#card-components)
11. [Icon Usage](#icon-usage)
12. [Animation Standards](#animation-standards)
13. [Current Inconsistencies](#current-inconsistencies)
14. [Accessibility Guidelines](#accessibility-guidelines)

---

## Design Principles

1. **Consistency**: Use design tokens (CSS variables) everywhere; avoid hardcoded values
2. **Minimalism**: Clean interfaces with purposeful whitespace
3. **Feedback**: Immediate visual/audio feedback for all interactions
4. **Accessibility**: WCAG AA compliance, keyboard navigable, screen reader support
5. **Performance**: Smooth 60fps animations, efficient CSS

---

## Spacing System

Based on a **4px base unit** with an 8px-centric scale.

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 4px | Tight spacing, icon gaps, small margins |
| `--spacing-sm` | 8px | Component internal padding, list gaps |
| `--spacing-md` | 16px | Section padding, card padding, standard gaps |
| `--spacing-lg` | 24px | Section margins, large component spacing |
| `--spacing-xl` | 32px | Page margins, major section breaks |

### Usage Guidelines

```css
/* Component internal spacing */
.component {
  padding: var(--spacing-md);
  gap: var(--spacing-sm);
}

/* Section spacing */
.section {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
}

/* Icon + text alignment */
.icon-text {
  gap: var(--spacing-xs);
}
```

### Common Patterns

| Context | Spacing |
|---------|---------|
| Card padding | `--spacing-md` (16px) |
| Card internal gap | `--spacing-sm` (8px) |
| List item gap | `--spacing-sm` to `--spacing-md` |
| Header padding | `--spacing-md` (16px) |
| Footer padding | `--spacing-sm` to `--spacing-md` |
| Button icon gap | `--spacing-xs` to `--spacing-sm` |
| Form field gap | `--spacing-md` (16px) |
| Form label gap | `--spacing-xs` (4px) |

---

## Typography Scale

Font family: System font stack for native feel across platforms.

```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | 11px | Badges, timestamps, meta text |
| `--font-size-sm` | 12px | Secondary text, labels, captions |
| `--font-size-base` | 14px | Body text, buttons, inputs |
| `--font-size-lg` | 16px | Card titles, section headers |
| `--font-size-xl` | 18px | Screen titles, primary headers |
| `--font-size-2xl` | 24px | Large display numbers, scores |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-normal` | 400 | Body text, descriptions |
| `--font-weight-medium` | 500 | Labels, secondary headings |
| `--font-weight-semibold` | 600 | Titles, important text, buttons |
| `--font-weight-bold` | 700 | Display numbers, emphasis |

### Line Height

```css
--line-height: 1.5;  /* Default for body text */
/* Headings use 1.25 */
```

### Typography Patterns

```css
/* Page/Screen title */
.screen-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

/* Card title */
.card-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

/* Secondary/Meta text */
.meta-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Badge text */
.badge {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}

/* Section header */
.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Monospace (timers, numbers) */
.timer-display {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## Color Palette

### Light Mode (Default)

#### Primary Colors (Green - Success/Action)
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | #4CAF50 | Primary actions, success states, active goals |
| `--primary-hover` | #43A047 | Hover state for primary elements |
| `--primary-light` | #E8F5E9 | Backgrounds, highlights, focus rings |

#### Secondary Colors (Blue - Timer/Info)
| Token | Value | Usage |
|-------|-------|-------|
| `--secondary` | #2196F3 | Timer goals, informational elements |
| `--secondary-hover` | #1E88E5 | Hover state |
| `--secondary-light` | #E3F2FD | Timer backgrounds |

#### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | #4CAF50 | Completion, positive states |
| `--success-light` | #E8F5E9 | Success backgrounds |
| `--danger` | #F44336 | Errors, destructive actions |
| `--danger-hover` | #E53935 | Danger hover state |
| `--danger-light` | #FFEBEE | Error backgrounds |
| `--warning` | #FF9800 | Warnings, active timers, streaks |
| `--warning-light` | #FFF3E0 | Warning backgrounds |

#### Neutral Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | #FFFFFF | Primary background |
| `--background-secondary` | #F5F5F5 | Secondary surfaces, cards on scroll areas |
| `--background-card` | #FFFFFF | Card backgrounds |
| `--text` | #212121 | Primary text |
| `--text-secondary` | #757575 | Secondary text, labels |
| `--text-muted` | #9E9E9E | Disabled, placeholder text |
| `--text-inverse` | #FFFFFF | Text on dark backgrounds |
| `--border` | #E0E0E0 | Borders, dividers |
| `--border-focus` | #4CAF50 | Focus state borders |

#### Special Colors
| Context | Color | Usage |
|---------|-------|-------|
| Counter type | #E65100 (orange) | Counter goal accent |
| Yearly timeframe | #7B1FA2 (purple) | Yearly badge |
| Gold/Trophy | #FFB300 | Best streak, achievements |

### Dark Mode

Dark mode uses adjusted values for visibility while maintaining the same token names:

- Backgrounds become dark grays (#121212, #1E1E1E)
- Text becomes light (#E0E0E0, #BDBDBD)
- Primary colors brighten slightly for contrast
- Shadows become more pronounced

### Color Usage by Goal Type

| Goal Type | Primary Color | Background |
|-----------|--------------|------------|
| Timer | `--secondary` (blue) | `--secondary-light` |
| Counter | #FB8C00 (orange) | `--warning-light` |
| Checkbox | `--primary` (green) | `--primary-light` |

### Timeframe Badge Colors

| Timeframe | Background | Text |
|-----------|------------|------|
| Daily | `--primary-light` | `--primary` |
| Weekly | `--secondary-light` | `--secondary` |
| Monthly | `--warning-light` | #E65100 |
| Yearly | #F3E5F5 | #7B1FA2 |

---

## Shadows & Elevation

Three levels of elevation using box-shadow:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation, buttons |
| `--shadow` | `0 2px 4px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 4px 8px rgba(0,0,0,0.15)` | Modals, elevated cards on hover |

### Shadow Patterns

```css
/* Default card */
.card {
  box-shadow: var(--shadow-sm);
}

/* Card hover */
.card:hover {
  box-shadow: var(--shadow);
}

/* Modal/Dialog */
.modal {
  box-shadow: var(--shadow-lg), 0 8px 32px rgba(0,0,0,0.2);
}

/* Completed goal glow */
.goal-completed {
  box-shadow: var(--shadow), 0 0 0 3px rgba(76,175,80,0.15), 0 0 20px rgba(76,175,80,0.2);
}
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, inputs |
| `--radius-md` | 6px | Buttons, badges |
| `--radius` | 8px | Default radius for most components |
| `--radius-lg` | 12px | Cards, modals |
| `--radius-full` | 9999px | Pills, circular buttons, progress bars |

### Radius Patterns

```css
/* Buttons */
.btn { border-radius: var(--radius); }

/* Cards */
.card { border-radius: var(--radius-lg); }

/* Badges/Pills */
.badge { border-radius: var(--radius-full); }

/* Inputs */
.input { border-radius: var(--radius-sm); }

/* Circular buttons (play/pause) */
.icon-btn-round { border-radius: var(--radius-full); }
```

---

## Transitions & Animations

### Transition Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 150ms ease | Hover states, small elements |
| `--transition-normal` | 200ms ease | General transitions |
| `--transition` | 200ms ease | Alias for normal |
| `--transition-slow` | 300ms ease | Large elements, modals |

### Standard Transitions

```css
/* Buttons */
.btn {
  transition: all var(--transition-fast);
}

/* Cards */
.card {
  transition: box-shadow var(--transition), transform var(--transition);
}

/* Form inputs */
.input {
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

/* Theme changes */
* {
  transition: background-color var(--transition),
              border-color var(--transition),
              color var(--transition);
}
```

---

## Button Variants

### Base Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius);
  transition: all var(--transition-fast);
}
```

### Button Sizes

| Size | Padding | Font Size |
|------|---------|-----------|
| Default | `8px 16px` | 14px |
| Large | `16px 24px` | 14px-16px |
| Small | `4px 8px` | 12px |

### Button Variants

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | `--primary` | `--text-inverse` | none | Main actions |
| Secondary | `--background` | `--text-secondary` | `--border` | Cancel, secondary actions |
| Danger | `--danger` | `--text-inverse` | none | Destructive actions |
| Ghost | transparent | `--text-secondary` | none | Subtle actions |

### Button States

```css
/* Hover */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

/* Active */
.btn:active {
  transform: scale(0.95); /* or translateY(0) */
}

/* Disabled */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Focus */
.btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Icon Buttons

Circular or square buttons containing only an icon:

| Size | Dimensions | Icon Size |
|------|------------|-----------|
| Default | 32px × 32px | 18-20px |
| Large | 48px × 48px | 22px |
| Small | 28px × 28px | 14-16px |
| Compact | 36px × 36px | 18px |

```css
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--background-secondary);
  color: var(--text);
}
```

---

## Form Patterns

### Form Group Structure

```html
<div class="form-group">
  <label class="form-label">
    Label <span class="required-indicator">*</span>
  </label>
  <input class="form-input" />
  <span class="form-error">Error message</span>
</div>
```

### Form Input Styles

```css
.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

/* States */
.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-input.has-error {
  border-color: var(--danger);
  background-color: var(--danger-light);
}

.form-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
}
```

### Type Selector (Button Group)

```css
.type-option {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-sm);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  min-height: 80px;
}

.type-option.active {
  border-color: var(--primary);
  background-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,0.15);
}
```

### Form Error Display

```css
.form-error {
  font-size: var(--font-size-xs);
  color: var(--danger);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.form-error.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Card Components

### Goal Card

```css
.goal-card {
  padding: var(--spacing-md);
  background: var(--background-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.goal-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

/* Completed state */
.goal-card.goal-completed {
  border-color: var(--success);
  border-width: 2px;
  background: linear-gradient(135deg, var(--background-card) 0%, var(--success-light) 100%);
  box-shadow: var(--shadow), 0 0 0 3px rgba(76,175,80,0.15);
}
```

### Card Structure

```
┌─────────────────────────────────────┐
│ HEADER: [drag] [icon] Title [badge] │
├─────────────────────────────────────┤
│ BODY:                               │
│   Progress section                  │
│   Controls section                  │
└─────────────────────────────────────┘
```

### Compact Card Variant

In compact mode:
- Padding: `8px 16px` (reduced)
- Body layout: horizontal (flex-row)
- Hidden: timeframe badge, timer display, progress text
- Smaller: type indicator (22px), controls

### Management List Item

```css
.manage-goal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
}
```

---

## Icon Usage

### Icon Sources

- SVG inline icons for all UI elements
- Stroke-based icons (not filled) for consistency
- 2px stroke width standard

### Icon Sizes

| Context | Size | Line Height |
|---------|------|-------------|
| Navigation | 20px | 24px container |
| Card type indicator | 16px | 28px container |
| Button icon | 18-20px | - |
| Action button | 18px | 36px container |
| Large button (play) | 22px | 48px container |

### Icon Containers

Type indicators use colored backgrounds:

```css
.goal-type-indicator {
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  /* Background color varies by type */
}
```

### Common Icons

| Icon | Usage |
|------|-------|
| Clock | Timer goals |
| Hash/Counter | Counter goals |
| Check square | Checkbox goals |
| Play/Pause | Timer control |
| Plus/Minus | Counter controls |
| Checkmark | Completion |
| Grip (6 dots) | Drag handle |
| Arrow left | Back navigation |
| Gear | Settings |
| Chart | Reports |
| Edit (pencil) | Edit action |
| Trash | Delete action |
| X | Close/cancel |
| Flame | Streak |
| Trophy | Best streak |

---

## Animation Standards

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| ease | `ease` | General purpose |
| bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Completion celebrations |

### Standard Animations

#### Button Press
```css
.btn:active {
  transform: scale(0.95);
}
```

#### Card Hover
```css
.card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
```

#### Checkbox Toggle
```css
@keyframes checkbox-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

#### Completion Badge
```css
@keyframes completion-badge-appear {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(10deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
```

#### Timer Pulse (Active)
```css
@keyframes timer-pulse {
  0%, 100% { box-shadow: var(--shadow-sm), 0 0 0 0 rgba(255,152,0,0.4); }
  50% { box-shadow: var(--shadow-sm), 0 0 0 8px rgba(255,152,0,0); }
}
```

#### Progress Shimmer (Completed)
```css
@keyframes shimmer-sweep {
  0% { left: -100%; }
  100% { left: 100%; }
}
```

#### Flame Glow (Streak)
```css
@keyframes flame-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(255,152,0,0.3)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 6px rgba(255,152,0,0.5)); transform: scale(1.05); }
}
```

#### Float (Empty State)
```css
@keyframes empty-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

### Animation Guidelines

1. **Duration**: Keep animations short (150-300ms for interactions, up to 1.5s for ambient)
2. **Purpose**: Every animation should serve a purpose (feedback, guidance, delight)
3. **Performance**: Use `transform` and `opacity` for smooth 60fps
4. **Reduced Motion**: Respect `prefers-reduced-motion` system setting
5. **Easing**: Use `ease` or `ease-out` for natural feel

---

## Current Inconsistencies

These issues should be addressed in US-061 (Refactor UI to Match Design Document):

### Spacing Issues

1. **Inconsistent gaps**: Some lists use `--spacing-sm`, others use `--spacing-md`
2. **Button padding variance**: Some buttons use inline styles rather than variables
3. **Card padding**: Goal cards use 16px, but some sections have different values

### Typography Issues

1. **Hardcoded font sizes**: Some elements use `px` values instead of variables
2. **Inconsistent letter-spacing**: Applied to some uppercase text but not all
3. **Line-height variance**: Not consistently applied

### Color Issues

1. **Hardcoded colors**: Counter orange (#E65100, #FB8C00, #F57C00) not in variables
2. **Purple color** for yearly timeframe (#7B1FA2, #F3E5F5) not in variables
3. **Gold color** (#FFB300, #FFD700) for achievements not standardized

### Component Issues

1. **Back button styles**: Duplicated across headers (manage-goals-header, reports-header, goal-form-header)
2. **Header spacer**: Uses hardcoded 70px width instead of flexible approach
3. **Stats group alignment**: Stat items in header could use consistent flex patterns

### Border/Radius Issues

1. **Border widths**: Most use 1px, completed cards use 2px - should be consistent or documented
2. **Progress bar height**: Varies (6px, 8px) between contexts

### Animation Issues

1. **Transition properties**: Some use `all`, others specify properties - be explicit
2. **Animation durations**: Slight variance in similar animations

### Accessibility Issues

1. **Focus states**: Not all interactive elements have visible focus indicators
2. **Color contrast**: Some muted text may not meet AA standards
3. **Touch targets**: Some compact mode buttons may be too small (minimum 44px recommended)

---

## Accessibility Guidelines

### Color Contrast

- Normal text: 4.5:1 minimum ratio
- Large text (18px+): 3:1 minimum ratio
- UI components: 3:1 minimum ratio

### Focus States

All interactive elements must have visible focus indicators:

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Touch Targets

- Minimum size: 44px × 44px for touch devices
- Compact mode may reduce this, document tradeoffs

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Arrow key navigation in groups (type selector, etc.)

### Screen Readers

- Proper ARIA labels on icons and interactive elements
- Live regions for dynamic updates
- Semantic HTML structure

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Checklist

When implementing new components:

1. [ ] Use CSS variables for all values (no hardcoded colors, sizes, etc.)
2. [ ] Follow spacing system (4px/8px base)
3. [ ] Apply correct typography scale
4. [ ] Include hover, active, focus, and disabled states
5. [ ] Add appropriate transitions
6. [ ] Consider dark mode compatibility
7. [ ] Test keyboard navigation
8. [ ] Verify color contrast
9. [ ] Test with reduced motion preference
10. [ ] Document any new patterns in this file

---

*Last updated: 2026-01-22*
*Version: 1.0*
