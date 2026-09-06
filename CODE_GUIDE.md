# Friday Code Organization Guide

## 📁 Project Structure Overview

```
Friday/
├── bin/
│   └── friday.js           # Entry point - spawns tsx to run JSX
├── core/                   # Business logic (pure functions, no UI)
│   ├── commands.js         # Task/habit mutations (CRUD operations)
│   ├── storage.js          # File system I/O (read/write JSON)
│   ├── config.js           # User settings management
│   └── personality.js      # Response generation engine
├── src/                    # UI layer (React + Ink)
│   ├── app.jsx             # Main application component
│   └── Onboarding.jsx      # First-launch setup wizard
└── ~/.friday/              # User data directory (created at runtime)
    ├── data.json           # Tasks and habits
    └── config.json         # User settings
```

---

## 🧩 Core Modules (Business Logic)

### **core/commands.js** - Task & Habit Mutations
**Purpose**: Pure functions that manipulate task/habit data (immutable style)

**Key Functions**:
```javascript
// CREATE
addTask(tasks, title, type)          // Add new task or habit

// UPDATE - Status
markDone(tasks, id)                  // Complete task/habit (increments streak)
markSkipped(tasks, id)               // Skip habit (logs but preserves streak)
markInProgress(tasks, id)            // Mark as actively working

// UPDATE - Content
updateTask(tasks, id, newTitle)      // Edit title

// DELETE
clearDone(tasks)                     // Remove completed tasks (not habits)

// QUERY
filterByStatus(tasks, status)        // Filter by pending/done/in-progress/todo
getStreak(tasks, id)                 // Get current streak count

// HABIT RESET
resetHabitDay(tasks, id, isoDate)    // Remove specific day from habit log
```

**Data Model**:
```javascript
{
  id: string,                        // UUID
  title: string,                     // Display text
  type: 'task' | 'habit',
  status: 'pending' | 'in-progress' | 'done' | 'skipped',
  streak: number,                    // Habits only
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp,
  completedAt: ISO timestamp | null,
  log: {                             // Habits only
    'YYYY-MM-DD': 'done' | 'skipped'
  }
}
```

**Design Pattern**: All functions return NEW arrays/objects (never mutate input)

---

### **core/storage.js** - File System Persistence
**Purpose**: Read/write tasks to `~/.friday/data.json`

**Key Functions**:
```javascript
loadTasks()                          // Read tasks from disk
saveTasks(tasks)                     // Write tasks to disk
generateId()                         // UUID generation (deprecated - use crypto.randomUUID())
```

**Storage Location**: `~/.friday/data.json` (auto-created if missing)

**Error Handling**: 
- Missing file → creates empty array
- Corrupt file → returns empty array (preserves file for manual recovery)

---

### **core/config.js** - User Settings
**Purpose**: Read/write user configuration to `~/.friday/config.json`

**Key Functions**:
```javascript
loadConfig()                         // Read config, merge with defaults
saveConfig(updates)                  // Update config (partial updates allowed)
```

**Default Settings**:
```javascript
{
  name: 'Datta',
  bannerColor: '#cc8b3c',
  bannerFont: 'block',
  greetingStyle: 'dry',
  firstLaunch: true
}
```

**Merge Strategy**: Saved config is merged with defaults, so new keys always have values

---

### **core/personality.js** - Response Generation
**Purpose**: Generate personality-driven messages

**Key Function**:
```javascript
getResponse(event, context)
```

**Event Types**:
- `greeting` - Time-of-day aware main greeting
- `greetingPreview` - Short preview for onboarding
- `taskAdded`, `habitAdded` - Confirmation messages
- `taskDone`, `taskStarted`, `taskUpdated` - Action feedback
- `habitDone` - Streak-scaled encouragement
- `skipped`, `deleted`, `cleared` - Standard confirmations

**Personality Styles**:
- **dry** (default): Efficient, minimal, direct
- **warm**: Supportive, compassionate, encouraging
- **casual**: Relaxed, friendly, laid-back

**Context Parameters**:
```javascript
{
  streak: number,              // For habitDone messages
  pendingCount: number,        // For greeting messages
  name: string,                // User's name
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  style: 'dry' | 'warm' | 'casual'
}
```

---

## 🎨 UI Layer (React + Ink)

### **src/app.jsx** - Main Application Component
**Purpose**: Terminal UI using React and Ink

**Architecture**:
- Single large component (~950 lines) managing all UI state
- Uses React hooks (useState, useEffect, useMemo)
- Ink provides terminal rendering (Box, Text components)

**Screen Flow**:
```
greeting → app → exit
   ↓
onboarding (if firstLaunch)
```

**Key Sections**:

1. **Color System**
```javascript
buildAccentPalette(accentHex)        // Generate entire palette from one color
hexToHsl() / hslToHex()              // Color space conversion
```

2. **Status Display**
```javascript
const statusIcon = {
  'pending': { icon: '·', label: 'TODO', color: amber },
  'in-progress': { icon: '>', label: 'DOING', color: cyan },
  'done': { icon: '✓', label: 'DONE', color: dim },
  'skipped': { icon: '×', label: 'SKIP', color: muted }
}
```

3. **Command System**
```javascript
executeCommand(rawInput)             // Parse and dispatch commands
resolveTaskIdFromArg(arg)           // UUID or fuzzy title match
```

4. **Suggestion System**
```javascript
updateSuggestions(input)            // Command prefix matching
updateTaskSuggestions(input)        // Task/habit autocomplete
```

5. **UI Utilities**
```javascript
formatRelativeTime(isoTimestamp)    // "2h ago", "3d ago"
buildDotRow(log, colors)            // 14-day habit visualization
buildDateAxis()                     // Date labels for habit row
```

**Command List**:
- `/add [task|habit] <title>` - Create new item
- `/start <id>` - Mark as in-progress
- `/done <id>` - Mark as complete
- `/update <id> <new title>` - Edit title
- `/skip <id>` - Skip habit
- `/delete <id>` - Remove item
- `/list [status]` - Filter by status
- `/clear` - Remove done tasks
- `/streak` - Show habit streaks
- `/reset` - Interactive habit day reset
- `/settings` - Interactive settings panel
- `/features` - Power commands panel
- `/help` - Show all commands
- `/exit` - Quit

---

### **src/Onboarding.jsx** - First-Launch Setup
**Purpose**: Two-step wizard for new users

**Steps**:
1. Enter name (text input)
2. Pick greeting style (arrow keys: dry/warm/casual)

**On Complete**: Saves config with `firstLaunch: false`

---

## 🔄 Data Flow

### Typical Command Flow:
```
User types command
     ↓
useInput() captures keystroke
     ↓
executeCommand() parses input
     ↓
calls core/commands.js function
     ↓
saveTasks() writes to disk
     ↓
loadTasks() reads back (state refresh)
     ↓
setTasks() updates React state
     ↓
UI re-renders with new data
     ↓
triggerEcho() shows personality response
```

### State Management:
- **Local state**: All state lives in App component (no Redux/Context)
- **Persistence**: Every mutation writes to `~/.friday/data.json` immediately
- **Reload pattern**: After save, always reload from disk (ensures consistency)

---

## 🎯 Key Design Principles

### 1. **Local-First**
- No network calls (except future GitHub integration)
- All data in `~/.friday/`
- Works offline 100%

### 2. **Immutable Data**
- All `core/commands.js` functions return NEW arrays/objects
- Never mutate input parameters
- Functional programming style

### 3. **Personality-Driven**
- All messages go through `getResponse()`
- Three distinct personality styles
- Context-aware responses

### 4. **Progressive Enhancement**
- Old data files work with new code (merge with defaults)
- Missing keys don't cause errors
- Backwards compatible data model

### 5. **Terminal-Native**
- Keyboard-driven (no mouse)
- High-contrast colors
- ASCII-only (works in any terminal)

---

## 🛠️ Adding a New Feature

### Example: Adding a "priority" field to tasks

1. **Update Data Model** (`core/commands.js`):
```javascript
export function addTask(tasks, title, type = 'task') {
  const newTask = {
    // ... existing fields ...
    priority: 'normal',  // Add new field with default
  };
  return [...tasks, newTask];
}

export function setPriority(tasks, id, priority) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    return { ...task, priority, updatedAt: new Date().toISOString() };
  });
}
```

2. **Add Command Handler** (`src/app.jsx`):
```javascript
if (command === '/priority') {
  // ... parse input, call setPriority(), save, reload ...
}
```

3. **Update UI Rendering** (`src/app.jsx`):
```javascript
<Text color={task.priority === 'high' ? COLORS.rose : COLORS.dim}>
  {task.title}
</Text>
```

4. **Add Personality Response** (`core/personality.js`):
```javascript
prioritySet: [
  'Priority set.',
  'Noted. Focus on what matters.',
]
```

5. **Update Help Panel**:
```javascript
{ cmd: '/priority <id> <high|normal|low>', desc: 'set task priority' }
```

---

## 🧪 Testing Strategy

Currently no automated tests. Manual testing workflow:

1. Test data mutations:
```bash
/add task Test task
/start test
/update <id> Updated title
/done <id>
/list done
```

2. Test habit streaks:
```bash
/add habit Daily exercise
/done daily
# Check streak increments
/reset
# Check day reset panel
```

3. Test settings:
```bash
/settings
# Arrow keys to navigate
# Change each setting
# Verify instant saves
```

4. Test edge cases:
- Empty list
- Single item
- Many items (scrolling)
- Corrupt data file
- Missing config

---

## 📦 npm Publishing Checklist

See `RELEASE_CHECKLIST.md` for full details.

Quick version:
1. Update `package.json` version
2. Update `README.md` version badge
3. Test locally: `npm start`
4. Commit: `git add . && git commit -m "Release vX.X.X"`
5. Tag: `git tag vX.X.X`
6. Push: `git push origin main --tags`
7. Publish: `npm publish`

---

## 🐛 Common Issues & Solutions

### Issue: tsx not found
**Solution**: `npm install` (tsx is in devDependencies)

### Issue: Data not persisting
**Check**: `~/.friday/data.json` exists and is writable

### Issue: Settings not saving
**Check**: `~/.friday/config.json` exists and is writable

### Issue: UI looks broken
**Likely**: Terminal doesn't support colors or unicode
**Solution**: Use a modern terminal (Windows Terminal, iTerm2, etc.)

### Issue: Commands not working
**Debug**: Check `executeCommand()` function in `src/app.jsx`
**Likely**: Command parsing issue or missing import

---

## 🔍 Code Reading Order

For new contributors, read in this order:

1. **core/storage.js** (simplest - just file I/O)
2. **core/config.js** (similar to storage, but with defaults)
3. **core/commands.js** (core business logic)
4. **core/personality.js** (response generation)
5. **src/Onboarding.jsx** (small React component)
6. **src/app.jsx** (main UI - save for last, it's big!)

---

## 💡 Tips for Understanding app.jsx

**Search landmarks**:
- `const statusIcon =` → Status display configuration
- `const executeCommand =` → Command dispatch logic
- `const updateSuggestions =` → Autocomplete system
- `useInput()` → Keyboard handling
- `{habitItems.map()` → Habit rendering
- `{taskItems.map()` → Task rendering

**State variables to understand**:
- `tasks` → Current task/habit list
- `input` → Command input buffer
- `screen` → Current screen (greeting/app/exit)
- `showXPanel` → Modal panel visibility
- `config` → User settings

**Helper functions**:
- `triggerEcho()` → Show feedback message
- `resolveTaskIdFromArg()` → UUID or title lookup
- `formatRelativeTime()` → "2h ago" formatting
- `buildDotRow()` → 14-day habit dots

---

## 📚 Further Reading

- **Ink Documentation**: https://github.com/vadimdemedes/ink
- **React Hooks**: https://react.dev/reference/react
- **cfonts**: https://github.com/dominikwilkowski/cfonts
- **Semantic Versioning**: https://semver.org/

---

**Questions? Issues?**
Open an issue on GitHub: https://github.com/Sridattasai18/Friday/issues
