# F.R.I.D.A.Y

> Terminal productivity CLI. Tasks, habits, streaks — dry personality included.

[![npm](https://img.shields.io/npm/v/@sridattasai_v/friday)](https://www.npmjs.com/package/@sridattasai_v/friday)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Install

```
npm install -g @sridattasai_v/friday
```

## Run

```
friday
```

## What it does

- Task and habit management from the terminal
- 14-day habit history dot row (▓ done · ▒ skipped · ░ missed)
- Streak tracking per habit
- Accent color system — entire UI follows your chosen color
- Personality engine with dry / warm / casual greeting styles
- Interactive settings panel with live preview
- Full command prefix suggestions while typing
- Data persists locally at ~/.friday/

## Commands

| Command | Description |
|---|---|
| `/add task <title>` | Add a task |
| `/add habit <title>` | Add a habit |
| `/done <title>` | Mark done |
| `/skip <title>` | Skip a habit for today |
| `/delete <title>` | Delete a task or habit |
| `/streak` | Show habit streaks |
| `/list` | Reload task list |
| `/clear` | Remove completed tasks |
| `/settings` | Open interactive settings panel |
| `/features` | Open power commands panel |
| `/help` | Show all commands |
| `/exit` | Quit F.R.I.D.A.Y |

## Settings

Open `/settings` and use arrow keys to navigate:

| Setting | How to change |
|---|---|
| name | ENTER to edit, type, ENTER to confirm |
| greeting style | ← → to cycle dry / warm / casual |
| banner color | ← → to cycle presets, h to type hex |
| banner font | ← → to cycle cfonts fonts |

Changes apply instantly. Data saved to `~/.friday/config.json`.

## Screenshots

### Greeting screen
![Greeting screen](./Greeting-Screen.png)

### Main dashboard
![Dashboard](./Main-dashboards.png)

### Command suggestions
![Command suggestions](./Command-suggestions.png)

### Exit screen
![Exit screen](./Exit-screen.png)

## Tech Stack

- Node.js 18+ (ESM)
- [Ink](https://github.com/vadimdemedes/ink) v7 + React 19
- [cfonts](https://github.com/dominikwilkowski/cfonts)
- Local JSON storage via filesystem

## Project Structure

```
bin/friday.js          entry point (shebang + ESM import)
src/app.jsx            main Ink component
src/Onboarding.jsx     first-launch onboarding flow
core/commands.js       task/habit mutations
core/storage.js        read/write ~/.friday/data.json
core/personality.js    getResponse() personality engine
core/config.js         read/write ~/.friday/config.json
```

## Local Development

```
git clone https://github.com/Sridattasai18/Friday
cd Friday
npm install
npm start
```

## Roadmap

- **v1** — task + habit manager with personality (current)
- **v2** — smart suggestions based on patterns
- **v3** — local AI agent via Ollama, fully offline

## License

MIT © sridattasai_v