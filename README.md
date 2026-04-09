# F.R.I.D.A.Y (v1)

**F.R.I.D.A.Y v1.0 — CLI task and habit system**

F.R.I.D.A.Y is a personal Node.js terminal app for managing daily tasks and habits with an Ink + React interface.
It is local-first: your data and settings stay on your machine.

## What it does

- Manage tasks and habits from the terminal
- Track habit streaks with visual streak bars
- Show command suggestions and task-name suggestions while typing
- Quick command launcher (`/features`) for power commands
- Settings panel (`/settings`) with local config persistence
- Dynamic greeting and typed UI responses
- Persist tasks in `data.json` and settings in `~/.friday/config.json`

## Tech Stack

- Node.js (ESM)
- [Ink](https://github.com/vadimdemedes/ink) + React
- [cfonts](https://github.com/dominikwilkowski/cfonts)
- Local storage via filesystem JSON

## Commands

- `/add task <title>` - add a task
- `/add habit <title>` - add a habit
- `/add <title> habit` - legacy habit style (still supported)
- `/done <id or title>` - mark a task/habit as done
- `/skip <id or title>` - skip a habit for today
- `/list` - reload and show current tasks
- `/streak` - show habit streak summary
- `/clear` - remove completed tasks
- `/delete <id or title>` - delete matching task/habit
- `/features` - open the feature launcher panel
- `/settings` - show settings panel
- `/settings name <value>` - update display name
- `/settings theme <dark|light>` - update theme setting
- `/help` - open command help panel
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
- `core/personality.js` - response engine and greeting lines
- `core/config.js` - load/save config in `~/.friday/config.json`
- `data.json` - local persisted data

## Screenshots

### Greeting screen
![Greeting screen](Greeting-Screen.png)

### Main dashboard
![Dashboard](Main-dashboards.png)

### Command suggestions
![Command suggestions](Command-suggestions.png)

### Exit screen
![Exit screen](Exit-screen.png)

## Project Status

- In development
- Version: **1.0.0**
- Focused on UI polish and command UX improvements

## Deploy to GitHub

If this project is already a git repo (it is), run:

```bash
git add .
git commit -m "Update README and docs"
git branch -M main
git remote add origin https://github.com/<your-username>/F.R.I.D.A.Y.git
git push -u origin main
```

If `origin` already exists, update it first:

```bash
git remote set-url origin https://github.com/<your-username>/F.R.I.D.A.Y.git
git push -u origin main
```

If you use GitHub CLI (`gh`), you can create + push in one flow:

```bash
gh repo create F.R.I.D.A.Y --public --source=. --remote=origin --push
```

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
