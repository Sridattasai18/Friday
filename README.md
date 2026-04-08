# F.R.I.D.A.Y (v1)

**F.R.I.D.A.Y v1.0 — Early Stage**

F.R.I.D.A.Y is a personal Node.js terminal app for managing daily tasks and habits with a modern Ink + React UI.

This project is still in development, and this is **Version 1**.

## What it does

- Manage tasks and habits from the terminal
- Track habit streaks and show streak bars
- Show command suggestions while typing `/...`
- Dynamic greeting screen based on time of day
- Exit confirmation screen before shutdown
- Persist all data in `data.json`

## Tech Stack

- Node.js (ESM)
- [Ink](https://github.com/vadimdemedes/ink) + React
- [cfonts](https://github.com/dominikwilkowski/cfonts)
- Local storage via filesystem JSON

## Commands

- `/add <title>` - add a new task
- `/habit <title>` - add a new habit
- `/done <id or title>` - mark a task/habit as done
- `/skip <id or title>` - mark as skipped
- `/list` - reload and show current tasks
- `/streak` - show habit streak summary
- `/clear` - remove completed tasks (task type)
- `/delete <id or title>` - delete matching task/habit
- `/help` - show command help
- `/exit` - open exit screen and quit

## Run Locally

```bash
npm install
npm start
```

Optional UI demo:

```bash
npm run demo
```

## Project Structure

- `src/app.jsx` - main Ink app entry
- `src/demo.jsx` - standalone UI demo
- `core/commands.js` - business actions for tasks/habits
- `core/storage.js` - read/write task data to `data.json`
- `data.json` - local persisted data

## Screenshots

Add these images inside a `screenshots/` folder:

- `screenshots/greeting.png` - startup greeting + FRIDAY banner
- `screenshots/dashboard.png` - tasks and habits dashboard with streak bars
- `screenshots/commands.png` - slash command suggestions while typing
- `screenshots/exit.png` - exit confirmation screen

Example markdown:

```md
### Greeting screen
![Greeting screen](screenshots/greeting.png)

### Main dashboard
![Dashboard](screenshots/dashboard.png)

### Command suggestions
![Command suggestions](screenshots/commands.png)

### Exit screen
![Exit screen](screenshots/exit.png)
```

## Project Status

- In development
- Version: **1.0.0**
- Focused on UI polish and command UX improvements

## Where this is going

F.R.I.D.A.Y starts as a daily task and habit tracker (v1), but the vision is bigger.
I want this to evolve into a full local productivity agent powered by open-source AI
that runs entirely on your machine, with no API costs and no credit limits.

- **v1** -> daily task + habit manager (current)
- **v2** -> smart suggestions based on your patterns
- **v3** -> local AI agent (Ollama integration) that understands your schedule,
  reminds you, and helps you plan your day - fully offline, fully free

---

If you try it and have ideas, feedback is always welcome.
