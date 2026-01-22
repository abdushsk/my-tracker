# Daily Goals Tracker - Design System v2.0

> **Design Philosophy:** Minimal yet feature-rich. Every pixel earns its place.

---

## 1. Design Principles

### 1.1 Core Values

| Principle | Description |
|-----------|-------------|
| **Minimal** | Remove visual clutter. White space is a feature, not emptiness. |
| **Purposeful** | Every element serves a function. No decorative-only elements. |
| **Smooth** | Transitions feel natural. Interactions provide immediate feedback. |
| **Focused** | Guide attention to what matters. Progressive disclosure of complexity. |
| **Consistent** | Same patterns everywhere. Learn once, use everywhere. |

### 1.2 Design Mantras

```
"When in doubt, leave it out."
"Complexity should be opt-in."
"Motion with meaning, not motion for motion's sake."
"Readable at a glance, detailed on demand."
```

---

## 2. Visual Language

### 2.1 Color System

**Primary Palette (Minimal)**

```css
/* Light Mode */
--surface:        #FFFFFF;
--surface-raised: #FAFAFA;
--surface-sunken: #F5F5F5;
--border:         #E0E0E0;
--border-subtle:  #EEEEEE;

--text-primary:   #1A1A1A;
--text-secondary: #666666;
--text-muted:     #999999;
--text-disabled:  #BDBDBD;

/* Single Accent Color */
--accent:         #10B981;       /* Emerald green - success, primary actions */
--accent-hover:   #059669;
--accent-subtle:  #D1FAE5;
--accent-text:    #065F46;

/* Semantic Only (used sparingly) */
--danger:         #EF4444;
--warning:        #F59E0B;
--info:           #3B82F6;
```

**Dark Mode**

```css
--surface:        #0F0F0F;
--surface-raised: #1A1A1A;
--surface-sunken: #0A0A0A;
--border:         #2A2A2A;
--border-subtle:  #1F1F1F;

--text-primary:   #FAFAFA;
--text-secondary: #A3A3A3;
--text-muted:     #737373;
--text-disabled:  #525252;

--accent:         #34D399;
--accent-hover:   #6EE7B7;
--accent-subtle:  rgba(52, 211, 153, 0.15);
--accent-text:    #A7F3D0;
```

**Goal Type Colors (Subtle, Badge-Only)**

```css
--type-timer:     #3B82F6;   /* Blue */
--type-counter:   #F59E0B;   /* Amber */
--type-checkbox:  #10B981;   /* Green */
--type-avoidance: #8B5CF6;   /* Purple */
```

### 2.2 Typography

**Font Stack**

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
```

**Scale (Fewer Sizes)**

```css
--text-xs:   11px;   /* Badges, labels */
--text-sm:   13px;   /* Secondary content */
--text-base: 14px;   /* Body text, inputs */
--text-lg:   16px;   /* Card titles, headers */
--text-xl:   20px;   /* Screen titles */

--leading-tight:  1.25;
--leading-normal: 1.5;

--weight-normal:   400;
--weight-medium:   500;
--weight-semibold: 600;
```

### 2.3 Spacing System

**4px Base Unit**

```css
--space-0:  0;
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
```

### 2.4 Borders & Radius

```css
--radius-sm:   4px;   /* Buttons, inputs */
--radius-md:   8px;   /* Cards */
--radius-lg:   12px;  /* Modals, dialogs */
--radius-full: 9999px; /* Pills, avatars */

--border-width: 1px;
```

### 2.5 Shadows (Minimal)

```css
/* Light mode - very subtle */
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:  0 2px 8px rgba(0, 0, 0, 0.06);
--shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.08);

/* Dark mode - even more subtle */
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md:  0 2px 8px rgba(0, 0, 0, 0.25);
--shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.3);
```

---

## 3. Component Design

### 3.1 Goal Cards (Redesigned)

**Current Problems:**
- Too many visual elements competing for attention
- Progress bars, badges, icons, timeframe indicators all visible at once
- Category stripes add visual noise

**New Design: Progressive Disclosure**

```
┌─────────────────────────────────────────────┐
│ ○ Read for 30 minutes                    ▶  │
│   ━━━━━━━━━━░░░░░░░░░░░  15/30 min          │
└─────────────────────────────────────────────┘

State: Default (collapsed)
- Checkbox/icon on left (minimal, 16px)
- Title (primary focus)
- Single action button on right
- Thin progress bar below (2px height)
- Progress text right-aligned, muted
```

**Expanded State (on hover/focus)**

```
┌─────────────────────────────────────────────┐
│ ○ Read for 30 minutes                    ▶  │
│   ━━━━━━━━━━━━░░░░░░░░░  15/30 min          │
├─────────────────────────────────────────────┤
│ Daily • Learning • 5 day streak             │
└─────────────────────────────────────────────┘

- Secondary info revealed on interaction
- Timeframe, category, streak shown in muted text
```

**Completed State**

```
┌─────────────────────────────────────────────┐
│ ✓ Read for 30 minutes                       │
│   ━━━━━━━━━━━━━━━━━━━━━  Complete            │
└─────────────────────────────────────────────┘

- Checkmark replaces icon
- Card slightly dimmed (opacity: 0.7)
- Progress bar solid accent color
```

### 3.2 Header (Simplified)

**Current Problems:**
- Level badge, XP bar, stats, filters, settings - too crowded
- Competing for attention in 380px width

**New Design: Contextual Header**

```
┌─────────────────────────────────────────────┐
│ Today                               [≡] [⚙] │
│ 3 of 5 complete                             │
└─────────────────────────────────────────────┘

- "Today" as simple title (or "This Week" for weekly view)
- Progress summary in muted text
- Filter (≡) and Settings (⚙) as icon buttons
- Level/XP visible only in profile/settings
```

### 3.3 Navigation (Bottom Bar)

**Current Problems:**
- Multiple navigation buttons taking space
- Inconsistent footer across screens

**New Design: Minimal Tab Bar**

```
┌─────────────────────────────────────────────┐
│     [○]        [📊]        [⚙]              │
│    Goals      Reports    Settings           │
└─────────────────────────────────────────────┘

- 3 primary destinations only
- Active state: filled icon + accent color
- Labels hidden until hover (optional)
- Floating action button (+) for quick add
```

### 3.4 Forms (Streamlined)

**Input Fields**

```css
/* Clean, borderless appearance */
.input {
  background: var(--surface-sunken);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  transition: background 150ms, box-shadow 150ms;
}

.input:focus {
  background: var(--surface);
  box-shadow: 0 0 0 2px var(--accent);
  outline: none;
}
```

**Toggle Switches**

```
OFF: [ ○     ]  (gray track)
ON:  [     ● ]  (accent track)

- 40px width, 24px height
- Smooth slide animation
- No labels inside switch
```

### 3.5 Buttons

**Primary (Accent)**
```css
.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--weight-medium);
  transition: background 150ms, transform 100ms;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

**Ghost (Secondary)**
```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: var(--space-2) var(--space-4);
}

.btn-ghost:hover {
  background: var(--surface-sunken);
  color: var(--text-primary);
}
```

**Icon Buttons**
```css
.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--surface-sunken);
  color: var(--text-primary);
}
```

---

## 4. Motion & Animation

### 4.1 Principles

```
1. Fast: Most transitions under 200ms
2. Natural: Ease-out for entering, ease-in for leaving
3. Purposeful: Motion guides attention or confirms action
4. Optional: Respect prefers-reduced-motion
```

### 4.2 Timing Functions

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);      /* Elements entering */
--ease-in:  cubic-bezier(0.4, 0, 1, 1);      /* Elements leaving */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Moving elements */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful bounce */
```

### 4.3 Standard Durations

```css
--duration-instant: 50ms;   /* Micro-interactions */
--duration-fast:    100ms;  /* Hover states */
--duration-normal:  200ms;  /* Most transitions */
--duration-slow:    300ms;  /* Complex animations */
```

### 4.4 Animations Inventory

**Completion Celebration (Subtle)**
```css
@keyframes check-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Apply to checkmark icon */
.completed .check-icon {
  animation: check-pop 300ms var(--spring);
}
```

**Progress Bar Fill**
```css
.progress-fill {
  transition: width 400ms var(--ease-out);
}
```

**Card Enter (for new goals)**
```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Toast Notification**
```css
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 4.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Interaction Patterns

### 5.1 Touch Targets

```css
/* Minimum 44px for touch, 32px for mouse */
.interactive {
  min-height: 44px;
  min-width: 44px;
}

@media (pointer: fine) {
  .interactive {
    min-height: 32px;
    min-width: 32px;
  }
}
```

### 5.2 Focus States

```css
/* Visible focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Remove default focus for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 5.3 Loading States

**Skeleton Screens (not spinners)**

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-sunken) 0%,
    var(--surface-raised) 50%,
    var(--surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 5.4 Empty States

```
┌─────────────────────────────────────────────┐
│                                             │
│            [Simple illustration]            │
│                                             │
│           No goals yet                      │
│           Start by adding your first goal   │
│                                             │
│              [ + Add Goal ]                 │
│                                             │
└─────────────────────────────────────────────┘

- Centered content
- Minimal illustration (optional, line-art style)
- Clear headline
- Helpful subtext
- Single action button
```

---

## 6. Screen Layouts

### 6.1 View Goals (Main Screen)

```
┌─────────────────────────────────────────────┐
│ Today                               [≡] [⚙] │
│ 3 of 5 complete                             │
├─────────────────────────────────────────────┤
│                                             │
│ ○ Read for 30 minutes                    ▶  │
│   ━━━━━━━━░░░░░░░░░░░░  15/30 min           │
│                                             │
│ ✓ Morning workout                           │
│   ━━━━━━━━━━━━━━━━━━━━  Complete            │
│                                             │
│ ○ Write 500 words                      [3]  │
│   ━━━━━━━━━━━━░░░░░░░░  300/500             │
│                                             │
│ ○ No social media                       ✓   │
│   ━━━━━━━━━━━━━━━━━━━━  Day 12              │
│                                             │
│ ✓ Review flashcards                         │
│   ━━━━━━━━━━━━━━━━━━━━  Complete            │
│                                             │
├─────────────────────────────────────────────┤
│     [○]        [📊]        [+]        [⚙]   │
└─────────────────────────────────────────────┘
```

### 6.2 Goal Form (Full Page)

```
┌─────────────────────────────────────────────┐
│ ← New Goal                                  │
├─────────────────────────────────────────────┤
│                                             │
│ Title                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ Enter goal title...                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Type                                        │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Timer │ │Count │ │Check │ │Avoid │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                             │
│ Target                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 30                              minutes │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Frequency                                   │
│ ┌──────────┐ ┌──────────┐                  │
│ │  Daily   │ │  Weekly  │                  │
│ └──────────┘ └──────────┘                  │
│                                             │
├─────────────────────────────────────────────┤
│                            [ Cancel ] [Save]│
└─────────────────────────────────────────────┘
```

### 6.3 Reports Screen

```
┌─────────────────────────────────────────────┐
│ ← Reports                                   │
├─────────────────────────────────────────────┤
│                                             │
│  This Week                                  │
│  ┌───────────────────────────────────────┐  │
│  │ 85% completion rate                   │  │
│  │ ████████████████████░░░░             │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Daily Breakdown                            │
│  Mon  ████████████████████  100%            │
│  Tue  ████████████████░░░░   80%            │
│  Wed  ████████████████████  100%            │
│  Thu  ████████████░░░░░░░░   60%            │
│  Fri  ████████████████░░░░   80%            │
│  Sat  ───────────────────    --             │
│  Sun  ───────────────────    --             │
│                                             │
│  Current Streak: 5 days                     │
│  Best Streak: 12 days                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 7. Iconography

### 7.1 Icon System

**Style:** Outline icons, 1.5px stroke, rounded caps

**Size Scale:**
```css
--icon-sm: 16px;   /* Inline, badges */
--icon-md: 20px;   /* Buttons, lists */
--icon-lg: 24px;   /* Headers */
```

**Core Icons Needed:**
```
Navigation:
- Goals (circle/checkbox)
- Reports (bar chart)
- Settings (gear)
- Back arrow
- Menu/filter

Actions:
- Play (timer start)
- Pause (timer pause)
- Plus (add)
- Check (complete)
- Edit (pencil)
- Delete (trash)
- More (dots)

Goal Types:
- Timer (clock)
- Counter (hash/number)
- Checkbox (square check)
- Avoidance (shield)

Status:
- Streak (flame)
- Locked (padlock)
- Star (achievement)
```

### 7.2 Icon Usage Guidelines

```
1. One icon per action (don't stack)
2. Icons should be recognizable without labels
3. Use consistent weight across all icons
4. Color: inherit from text color (no multi-color icons)
```

---

## 8. Accessibility

### 8.1 Color Contrast

```
All text meets WCAG AA:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum
```

### 8.2 Focus Management

```javascript
// When opening modals
modal.addEventListener('open', () => {
  previousFocus = document.activeElement;
  firstFocusableElement.focus();
});

// When closing modals
modal.addEventListener('close', () => {
  previousFocus?.focus();
});
```

### 8.3 Screen Reader Text

```html
<!-- Visually hidden but announced -->
<span class="sr-only">15 of 30 minutes completed</span>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
```

---

## 9. Implementation Priorities

### Phase 1: Foundation (High Impact)
1. [ ] Implement new color system (CSS variables)
2. [ ] Simplify goal cards (remove visual clutter)
3. [ ] Streamline header
4. [ ] Reduce shadows and borders

### Phase 2: Refinement
5. [ ] Update typography scale
6. [ ] Implement new button styles
7. [ ] Add proper focus states
8. [ ] Smooth out animations

### Phase 3: Polish
9. [ ] Empty states
10. [ ] Loading skeletons
11. [ ] Icon consistency
12. [ ] Final motion tuning

---

## 10. Design Tokens Export

```css
:root {
  /* Colors */
  --surface: #FFFFFF;
  --surface-raised: #FAFAFA;
  --surface-sunken: #F5F5F5;
  --border: #E0E0E0;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --text-muted: #999999;
  --accent: #10B981;
  --accent-hover: #059669;
  --accent-subtle: #D1FAE5;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);

  /* Motion */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}

[data-theme="dark"] {
  --surface: #0F0F0F;
  --surface-raised: #1A1A1A;
  --surface-sunken: #0A0A0A;
  --border: #2A2A2A;
  --text-primary: #FAFAFA;
  --text-secondary: #A3A3A3;
  --text-muted: #737373;
  --accent: #34D399;
  --accent-hover: #6EE7B7;
  --accent-subtle: rgba(52, 211, 153, 0.15);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.25);
}
```

---

*Document Version: 2.0*
*Last Updated: January 2026*
*Platform: Chrome Extension (Manifest V3)*
