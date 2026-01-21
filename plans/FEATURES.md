# Daily Goals Tracker - Chrome Extension

## Overview
A Chrome extension for tracking daily goals with support for timers, counters, and checkboxes. Users can set goals with various timeframes and track their discipline through detailed reports and analytics.

---

## Goal Types

### Timer
- **Description**: Time-based goals (e.g., study for 3 hours)
- **Actions**: Play, Pause, Reset
- **Tracking**: Duration in hours/minutes/seconds
- **Display**: HH:MM:SS format with progress bar

### Counter
- **Description**: Count-based goals (e.g., complete 10 tasks)
- **Actions**: Increment (+1), Decrement (-1), Reset
- **Tracking**: Current count vs target count (e.g., 5/10)
- **Display**: Current/target with progress bar

### Checkbox
- **Description**: Simple completion goals (e.g., meditate)
- **Actions**: Toggle, Reset
- **Tracking**: Completed or not
- **Display**: Checkbox with completion indicator

---

## Timeframes

| Timeframe | Reset Schedule |
|-----------|----------------|
| Daily | Resets at midnight every day |
| Weekly | Resets at midnight on Monday |
| Monthly | Resets at midnight on the 1st |
| Yearly | Resets at midnight on January 1st |

---

## Screens

### 1. View Goals (Main Screen)
The default screen when user clicks the extension. **Read-only for goal configuration** - only allows progress updates.

**Components:**
- Header with quick stats (goals completed today, current streak)
- Goals list with progress controls:
  - Timer: Play/Pause button, elapsed time display
  - Counter: +/- buttons, current/target display
  - Checkbox: Toggle checkbox
- Progress bars showing completion percentage
- Navigation buttons to "Manage Goals" and "Reports"
- Empty state when no goals exist

### 2. Manage Goals Screen
Secondary screen for CRUD operations on goals.

**Components:**
- Back button to View Goals
- "Add Goal" button (prominent)
- List of existing goals with:
  - Edit button
  - Delete button (with confirmation dialog)
- Drag and drop to reorder goals
- Goal form (for add/edit):
  - Title input
  - Type selector (timer/counter/checkbox)
  - Target input (hours for timer, count for counter)
  - Timeframe selector (daily/weekly/monthly/yearly)
  - Category selector (optional)
  - Save and Cancel buttons

### 3. Reports Screen
Analytics and statistics dashboard.

**Components:**
- Discipline score (0-100 or letter grade)
- Current streak counter
- Best streak record
- Date range selector
- Completion stats:
  - Overall completion rate
  - Goals completed today/week/month
  - Completion rate by goal type
  - Completion rate by category
- Activity Timeline:
  - Heatmap showing active hours for timers
  - Scatter plot of counter increments
  - Checkbox completion timestamps
  - Most productive hours identification
- Charts:
  - Weekly completion bar chart
  - Goal-by-goal progress breakdown
  - Timer usage over time
  - Streak history visualization
- Achievements/Badges section

### 4. Settings Screen
Configuration and preferences.

**Components:**
- Sound settings (mute toggle, volume control)
- Notification settings (enable/disable, reminder time)
- Theme toggle (light/dark/auto)
- Export/Import data buttons

---

## Features

### Sound Effects
Satisfying audio feedback for goal interactions:

| Event | Sound |
|-------|-------|
| Goal completed | Celebration chime/ding |
| Timer start | Soft start tone |
| Timer pause | Pause click |
| Counter increment | Soft tick/pop |
| Counter decrement | Reverse tick |
| Checkbox toggle | Satisfying check sound |
| Streak milestone | Achievement fanfare |
| All goals completed | Victory sound |

Settings: Volume control and mute option

### Activity Timeline
Visual timeline showing when user worked on goals:
- Heatmap showing active hours for timer goals
- Scatter plot of counter increments throughout the day
- Checkbox completion timestamps
- Weekly view showing patterns
- Identify most productive hours

### Achievements System
Gamification with badges and milestones:

| Badge | Condition |
|-------|-----------|
| First Step | Complete your first goal |
| Consistent | 7-day streak |
| Dedicated | 30-day streak |
| Unstoppable | 100-day streak |
| Early Bird | Complete a goal before 8 AM |
| Night Owl | Complete a goal after 10 PM |
| Perfectionist | 100% completion for a week |
| Marathon | 10 hours on a single timer goal |
| Centurion | Reach 100 on a counter goal |

### Notifications
Smart reminders and alerts:
- Daily reminder to check goals (configurable time)
- Goal deadline approaching (for daily goals near midnight)
- Streak at risk warning
- Celebration notification when all goals completed
- Weekly summary notification
- Break reminder for long timer sessions

### Focus Mode
Distraction-free goal tracking:
- Minimal UI showing only active timer
- Optional: Block distracting websites while timer is running
- Pomodoro mode (25 min work / 5 min break cycles)
- Session notes to log what you accomplished

### Themes
Visual customization:
- Light mode
- Dark mode
- Auto (follow system preference)
- Custom accent colors for goals
- Minimal/Compact view option

### Goal Categories
Organize goals into categories:
- Create custom categories (Work, Health, Learning, etc.)
- Color-code categories
- Filter goals by category
- Category-specific stats in reports

### Smart Features
Intelligent assistance:
- Goal suggestions based on common patterns
- Optimal time recommendations based on your history
- Predicted completion likelihood
- Auto-pause timer after inactivity (configurable)

### Data Export/Import
Backup and portability:
- Export all data as JSON
- Export reports as CSV
- Import goals from backup
- Optional: Cloud sync with Google account

### Browser Badge
Quick access outside the popup:
- Show count of incomplete goals on extension icon
- Show timer countdown for active timer
- Color change when all goals done (green)
- Update in real-time

### Daily Journal
Reflection and notes:
- Daily notes section
- Tag entries with mood
- Link notes to specific goals
- Review past journal entries in reports

---

## Technical Requirements

### Platform
- Chrome Extension (Manifest V3)

### Storage
- Chrome Storage API (local)
- Optional: chrome.storage.sync for cloud backup

### Background Processing
- Service Worker for:
  - Persistent timers (continue when popup closed)
  - Scheduled goal resets (using chrome.alarms)
  - Badge updates

### Chrome APIs Used
- `chrome.storage.local` - Store goals and activity data
- `chrome.storage.sync` - Optional cloud sync
- `chrome.alarms` - Scheduled resets and reminders
- `chrome.runtime` - Service worker communication
- `chrome.notifications` - Desktop notifications
- `chrome.action` - Extension badge

### Libraries (Optional)
- Chart.js or lightweight alternative for charts
- Web Audio API for sounds (native)

---

## UI Specifications

### Popup Dimensions
- Width: 380px
- Min Height: 500px
- Max Height: 600px

### Data Models

#### Goal
```json
{
  "id": "uuid",
  "title": "string",
  "type": "timer | counter | checkbox",
  "target": "number (seconds for timer, count for counter, 1 for checkbox)",
  "progress": "number",
  "timeframe": "daily | weekly | monthly | yearly",
  "category": "string | null",
  "isActive": "boolean (for timer)",
  "createdAt": "timestamp",
  "lastResetAt": "timestamp",
  "order": "number"
}
```

#### Activity Log
```json
{
  "id": "uuid",
  "goalId": "uuid",
  "timestamp": "timestamp",
  "action": "start | pause | increment | decrement | toggle | reset | complete",
  "value": "number | null"
}
```

#### Category
```json
{
  "id": "uuid",
  "name": "string",
  "color": "hex color"
}
```

#### Achievement
```json
{
  "id": "string",
  "unlockedAt": "timestamp | null"
}
```
