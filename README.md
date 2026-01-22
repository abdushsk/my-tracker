# Daily Goals Tracker

A Chrome extension for tracking daily goals with timers, counters, and checkboxes. Monitor your discipline through detailed reports and analytics.

## Features

### Goal Types
- **Timer** - Track time-based goals (e.g., study for 3 hours) with play, pause, and reset controls
- **Counter** - Track count-based goals (e.g., complete 10 tasks) with increment/decrement buttons
- **Checkbox** - Simple completion goals (e.g., meditate) with toggle functionality

### Timeframes
- Daily (resets at midnight)
- Weekly (resets on Monday)
- Monthly (resets on the 1st)
- Yearly (resets on January 1st)

### Reports & Analytics
- Discipline score tracking
- Streak counter with best streak records
- Completion statistics by goal type and category
- Activity heatmaps and charts
- Weekly completion visualizations

### Additional Features
- **Pomodoro Mode** - Built-in 25/5 work-break cycles
- **Focus Mode** - Distraction-free timer interface
- **Achievements System** - Unlock badges for milestones like streaks and goal completions
- **Daily Challenges** - Extra motivation with daily goals
- **Sound Effects** - Satisfying audio feedback for goal interactions
- **Themes** - Light, dark, and auto modes
- **Categories** - Organize goals with custom categories and colors
- **Keyboard Navigation** - Full keyboard support for accessibility
- **Data Export/Import** - Backup and restore your data as JSON

## Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/daily-goals-tracker.git
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/` \ `brave://extensions/` in your Chrome browser
   - Or go to Menu (three dots) > Extensions > Manage Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `daily-goals-tracker` folder (the root directory containing `manifest.json`)

5. **Pin the extension (optional)**
   - Click the puzzle piece icon in Chrome's toolbar
   - Click the pin icon next to "My Tracker" to keep it visible

### Updating

To update the extension after pulling new changes:
1. Go to `chrome://extensions/` / `brave://extensions/`
2. Click the refresh icon on the Daily Goals Tracker card
3. Or click "Update" at the top of the page to update all extensions

## Usage

1. **Click the extension icon** in your Chrome toolbar to open the popup
2. **Add a goal** by navigating to Manage Goals and clicking "Add Goal"
3. **Track your progress** on the main screen:
   - For timers: Click play to start, pause to stop
   - For counters: Use +/- buttons to update count
   - For checkboxes: Click to toggle completion
4. **View your stats** in the Reports section to monitor your discipline score and streaks

## Project Structure

```
daily-goals-tracker/
├── manifest.json          # Chrome extension manifest (v3)
├── src/
│   ├── assets/
│   │   ├── icons/         # Extension icons
│   │   └── sounds/        # Audio feedback files
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   └── popup/
│       ├── popup.html     # Main popup UI
│       ├── popup.js       # Main popup logic
│       ├── popup.css      # Styles
│       ├── screens/       # Screen components
│       ├── features/      # Feature modules
│       ├── utils/         # Utility functions
│       └── themes/        # Theme configurations
└── README.md
```

## Permissions

This extension requires the following permissions:
- **storage** - Save goals and progress data locally
- **alarms** - Schedule goal resets and reminders
- **notifications** - Send reminder and achievement notifications

## License

MIT License
