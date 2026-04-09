import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useInput } from 'ink';
import cfonts from 'cfonts';
import { loadTasks, saveTasks } from '../core/storage.js';
import { addTask, markDone, markSkipped, clearDone, getStreak, resetHabitDay } from '../core/commands.js';
import { getResponse } from '../core/personality.js';
import { loadConfig, saveConfig } from '../core/config.js';
import Onboarding from './Onboarding.jsx';

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h; let s;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) =>
    Math.round(x * 255).toString(16).padStart(2, '0')
  ).join('')}`;
}

function buildAccentPalette(accentHex) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(accentHex) ? accentHex : '#cc8b3c';
  const [h, s] = hexToHsl(hex);

  return {
    accent: hex,
    cyan: hslToHex((h + 150) % 360, Math.min(s, 70), 60),
    green: hslToHex((h + 120) % 360, Math.min(s, 65), 55),
    amber: hslToHex((h + 30) % 360, Math.min(s, 80), 60),
    rose: hslToHex((h + 180) % 360, Math.min(s, 70), 65),
    violet: hslToHex((h + 60) % 360, Math.min(s, 60), 65),
    dim: '#4b5563',
    muted: '#9ca3af',
    bright: '#f9fafb',
  };
}

const SECTION_DIVIDER = '─'.repeat(28);

const BANNER_FONTS = [
  'block', 'simple', '3d', 'simple3d', 'chrome',
  'huge', 'shade', 'slick', 'grid', 'tiny',
];

const GREETING_STYLES = ['dry', 'warm', 'casual'];

const SETTINGS_FIELDS = [
  {
    key: 'name',
    label: 'name',
    hint: 'ENTER to edit · type new name · ENTER to confirm',
  },
  {
    key: 'greetingStyle',
    label: 'greeting',
    hint: 'LEFT/RIGHT to cycle dry | warm | casual',
  },
  {
    key: 'bannerColor',
    label: 'banner color',
    hint: 'LEFT/RIGHT presets · h = type hex',
  },
  {
    key: 'bannerFont',
    label: 'banner font',
    hint: 'LEFT/RIGHT to cycle · takes effect on relaunch',
  },
];

const COLOR_PRESETS = {
  amber: '#cc8b3c',
  green: '#34d399',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  rose: '#fb7185',
};

const COLOR_PRESET_ORDER = ['amber', 'green', 'cyan', 'violet', 'rose'];

const COMMAND_CONTEXT = {
  '/add': 'adding a task or habit...',
  '/done': 'marking as done...',
  '/delete': 'deleting an item...',
  '/skip': 'skipping a habit...',
  '/streak': 'checking streaks...',
  '/clear': 'clearing completed tasks...',
  '/reset': 'resetting a habit day...',
  '/list': 'loading your list...',
  '/settings': 'opening settings...',
  '/features': 'opening features...',
  '/help': 'showing all commands...',
  '/resetday': 'resetting a habit day...',
  '/exit': 'shutting down...',
};

function normalizeToDateOnly(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function resetHabits(tasks) {
  const today = normalizeToDateOnly(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const updatedTasks = tasks.map((task) => {
    if (task.type !== 'habit') return task;

    const lastDateSource = task.lastCompletedDate || task.completedAt;
    const lastCompletedDate = lastDateSource ? normalizeToDateOnly(lastDateSource) : null;

    if (task.status === 'done' && lastCompletedDate && lastCompletedDate < today) {
      return {
        ...task,
        status: 'pending',
        completedAt: null,
      };
    }

    const isMissedYesterday = !lastCompletedDate || lastCompletedDate < yesterday;
    if (task.status === 'pending' && task.streak > 0 && isMissedYesterday) {
      return { ...task, streak: 0 };
    }

    return task;
  });

  saveTasks(updatedTasks);
  return updatedTasks;
}

function buildDotRow(log = {}, colors) {
  const today = new Date();
  const dots = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const status = log[key];
    if (status === 'done') dots.push({ char: '▓ ', color: colors.green });
    if (status === 'skipped') dots.push({ char: '▒ ', color: colors.amber });
    if (!status) dots.push({ char: '░ ', color: colors.dim });
  }
  return dots;
}

function buildDateAxis() {
  const today = new Date();
  const labels = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d);
  }
  const left = `${labels[0].getMonth() + 1}/${labels[0].getDate()}`;
  const right = `${labels[13].getMonth() + 1}/${labels[13].getDate()}`;
  const middle = ' '.repeat(28 - left.length - right.length);
  return left + middle + right;
}

function formatHelpLines(colors) {
  return [
    { cmd: '/add <title>', desc: 'add a task or habit', color: colors.green },
    { cmd: '/done <title>', desc: 'mark a task or habit done', color: colors.green },
    { cmd: '/delete <title>', desc: 'delete a task or habit', color: colors.rose },
    { cmd: '/skip <title>', desc: 'skip a habit for today', color: colors.amber },
    { cmd: '/streak', desc: 'show all habit streaks', color: colors.amber },
    { cmd: '/list', desc: 'reload and show all tasks', color: colors.cyan },
    { cmd: '/clear', desc: 'remove all completed tasks', color: colors.dim },
    { cmd: '/reset', desc: 'open day reset for habits', color: colors.rose },
    { cmd: '/settings <key>', desc: 'change name or color', color: colors.violet },
    { cmd: '/features', desc: 'open power commands panel', color: colors.cyan },
    { cmd: '/help', desc: 'show this list', color: colors.violet },
    { cmd: '/resetday <habit> <YYYY-MM-DD>', desc: 'clear one habit log day', color: colors.rose },
    { cmd: '/exit', desc: 'quit F.R.I.D.A.Y', color: colors.dim },
  ];
}

function App() {
  const bootConfig = loadConfig();
  const [screen, setScreen] = useState('greeting');
  const [bootDone, setBootDone] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState(loadConfig());
  const COLORS = useMemo(
    () => buildAccentPalette(config.bannerColor || '#cc8b3c'),
    [config.bannerColor]
  );
  const statusIcon = {
    done: { icon: '●', label: 'DONE', color: COLORS.dim },
    skipped: { icon: '◌', label: 'SKIPPED', color: COLORS.amber },
    pending: { icon: '○', label: 'PENDING', color: COLORS.green },
  };
  const QUICK_COMMANDS = useMemo(() => ([
    { value: '/add', label: '/add    - Add a task or habit', color: COLORS.green },
    { value: '/done', label: '/done   - Mark as done', color: COLORS.green },
    { value: '/delete', label: '/delete - Delete an item', color: COLORS.rose },
    { value: '/features', label: '/features - Open power commands', color: COLORS.amber },
    { value: '/settings', label: '/settings - View/edit settings', color: COLORS.violet },
    { value: '/exit', label: '/exit   - Quit F.R.I.D.A.Y', color: COLORS.dim },
  ]), [COLORS]);
  const ALL_COMMANDS = useMemo(() => ([
    { value: '/add', label: '/add      - Add a task or habit', color: COLORS.green },
    { value: '/done', label: '/done     - Mark as done', color: COLORS.green },
    { value: '/skip', label: '/skip     - Skip a habit today', color: COLORS.amber },
    { value: '/delete', label: '/delete   - Delete an item', color: COLORS.rose },
    { value: '/clear', label: '/clear    - Remove completed tasks', color: COLORS.dim },
    { value: '/reset', label: '/reset    - Reset habit day (1-14)', color: COLORS.rose },
    { value: '/streak', label: '/streak   - Show habit streaks', color: COLORS.amber },
    { value: '/list', label: '/list     - Reload task list', color: COLORS.green },
    { value: '/help', label: '/help     - Show all commands', color: COLORS.violet },
    { value: '/resetday', label: '/resetday - Reset a habit day', color: COLORS.rose },
    { value: '/settings', label: '/settings - View/edit settings', color: COLORS.violet },
    { value: '/features', label: '/features - Open power commands', color: COLORS.cyan },
    { value: '/exit', label: '/exit     - Quit F.R.I.D.A.Y', color: COLORS.dim },
  ]), [COLORS]);
  const ADD_SUB_COMMANDS = useMemo(() => ([
    { value: '/add task', label: '/task  - Add a new task', color: COLORS.green },
    { value: '/add habit', label: '/habit - Add a new habit', color: COLORS.cyan },
  ]), [COLORS]);
  const FEATURE_COMMANDS = useMemo(() => ([
    { value: '/streak', label: '/streak - Show habit streaks', color: COLORS.amber },
    { value: '/reset', label: '/reset  - Reset a habit day', color: COLORS.rose },
    { value: '/list', label: '/list   - Reload task list', color: COLORS.green },
    { value: '/clear', label: '/clear  - Remove completed tasks', color: COLORS.dim },
    { value: '/help', label: '/help   - Show all commands', color: COLORS.violet },
  ]), [COLORS]);
  const [input, setInput] = useState('');
  const [activeCommand, setActiveCommand] = useState('');
  const [echo, setEcho] = useState('Type /help to see available commands.');
  const [echoTone, setEchoTone] = useState('info');
  const [echoVisible, setEchoVisible] = useState(true);
  const [echoAnimating, setEchoAnimating] = useState(false);
  const [echoIsCommand, setEchoIsCommand] = useState(false);
  const [greetingDisplayed, setGreetingDisplayed] = useState('');
  const [greetingDone, setGreetingDone] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addSubMode, setAddSubMode] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState([]);
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [taskSuggestionIndex, setTaskSuggestionIndex] = useState(0);
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const [featuresIndex, setFeaturesIndex] = useState(0);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetHabitIndex, setResetHabitIndex] = useState(0);
  const [resetDayIndex, setResetDayIndex] = useState(0);
  const [settingsFieldIndex, setSettingsFieldIndex] = useState(0);
  const [settingsEditMode, setSettingsEditMode] = useState(false);
  const [settingsEditValue, setSettingsEditValue] = useState('');
  const [bannerColorInputMode, setBannerColorInputMode] = useState(false);
  const [showStreakPanel, setShowStreakPanel] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [continueBlink, setContinueBlink] = useState(true);

  useEffect(() => {
    if (bootDone) {
      setConfig(loadConfig());
    }
  }, [bootDone]);

  useEffect(() => {
    const shouldBlinkCursor = screen === 'app'
      && !showHelpPanel
      && !showFeaturesPanel
      && !showSettingsPanel
      && !showResetPanel
      && !showSuggestions
      && !showTaskSuggestions;

    if (!shouldBlinkCursor) {
      setCursorVisible(true);
      return undefined;
    }

    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, [screen, showHelpPanel, showFeaturesPanel, showSettingsPanel, showResetPanel, showSuggestions, showTaskSuggestions]);

  useEffect(() => {
    if (screen !== 'greeting') {
      setContinueBlink(true);
      return undefined;
    }
    const timer = setInterval(() => setContinueBlink((v) => !v), 800);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'exit') return undefined;
    const timer = setTimeout(() => process.exit(0), 1500);
    return () => clearTimeout(timer);
  }, [screen]);

  const taskCount = tasks.filter((task) => task.type === 'task').length;
  const pendingTaskCount = tasks.filter((task) => task.type === 'task' && task.status !== 'done').length;
  const dateText = useMemo(() => new Date().toLocaleString(), []);
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return getResponse('greeting', {
      name: config.name,
      pendingCount: pendingTaskCount,
      timeOfDay,
      style: config.greetingStyle || 'dry',
    });
  }, [pendingTaskCount, config.name, config.greetingStyle]);
  const taskItems = tasks.filter((task) => task.type === 'task');
  const habitItems = tasks.filter((task) => task.type === 'habit');
  const topStreak = habitItems.reduce((max, habit) => Math.max(max, habit.streak || 0), 0);
  const echoColor = echoAnimating
    ? COLORS.bright
    : (echoTone === 'error' ? COLORS.rose : echoTone === 'success' ? COLORS.green : COLORS.muted);

  const triggerEcho = (message, tone) => {
    setEchoAnimating(true);
    setEchoVisible(true);
    setEcho(message);
    setEchoTone(tone);
    setTimeout(() => setEchoAnimating(false), 80);
  };

  useEffect(() => {
    if (screen !== 'app') return undefined;

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const full = getResponse('greeting', {
      name: config.name,
      pendingCount: pendingTaskCount,
      timeOfDay,
      style: config.greetingStyle || 'dry',
    });
    setGreetingDisplayed(full);
    setGreetingDone(true);
  }, [screen, pendingTaskCount, config.name, config.greetingStyle]);

  const updateTaskSuggestions = (currentInput) => {
    const trimmed = currentInput.trimStart();
    const firstSpaceIdx = trimmed.indexOf(' ');
    const command = firstSpaceIdx === -1 ? trimmed : trimmed.slice(0, firstSpaceIdx);
    const hasArgPrefix = firstSpaceIdx !== -1;
    const typedArg = hasArgPrefix ? trimmed.slice(firstSpaceIdx + 1) : '';
    const eligible = command === '/done' || command === '/skip' || command === '/delete';

    if (eligible && hasArgPrefix && typedArg.trim().length > 0) {
      const normalized = typedArg.trim().toLowerCase();
      const matches = tasks
        .filter((t) => t.title.toLowerCase().includes(normalized))
        .slice(0, 5);
      setTaskSuggestions(matches);
      setShowTaskSuggestions(matches.length > 0);
      setTaskSuggestionIndex(0);
      return;
    }

    setShowTaskSuggestions(false);
    setTaskSuggestions([]);
    setTaskSuggestionIndex(0);
  };

  const updateSuggestions = (nextInput) => {
    if (!nextInput.startsWith('/')) {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      updateTaskSuggestions(nextInput);
      return;
    }

    let filtered = [];
    if (addSubMode) {
      filtered = ADD_SUB_COMMANDS.filter((cmd) => cmd.value.startsWith(nextInput));
    } else if (nextInput === '/') {
      filtered = QUICK_COMMANDS;
    } else if (nextInput.startsWith('/add ')) {
      updateTaskSuggestions(nextInput);
      return;
    } else {
      filtered = ALL_COMMANDS.filter((cmd) =>
        cmd.value.startsWith(nextInput) || nextInput.startsWith(cmd.value)
      );
    }

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
    updateTaskSuggestions(nextInput);
  };

  const autocompleteFromSelection = () => {
    if (!showSuggestions || suggestions.length === 0) return false;
    const selected = suggestions[selectedIndex] || suggestions[0];
    setInput(selected.value);
    updateSuggestions(selected.value);
    return true;
  };

  const resolveTaskIdFromArg = (arg) => {
    if (!arg) return null;
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidLike.test(arg)) return arg;

    const normalized = arg.toLowerCase();
    const matchedTask = tasks.find((task) =>
      task.title.toLowerCase().includes(normalized)
    );
    return matchedTask ? matchedTask.id : null;
  };

  const executeCommand = async (rawInput) => {
    const trimmed = rawInput.trim();
    const firstSpaceIdx = trimmed.indexOf(' ');
    const command = firstSpaceIdx === -1 ? trimmed : trimmed.slice(0, firstSpaceIdx);
    const arg = firstSpaceIdx === -1 ? '' : trimmed.slice(firstSpaceIdx + 1).trim();
    setShowStreakPanel(false);
    setShowFeaturesPanel(false);

    if (command === '/add') {
      let type = 'task';
      let title = arg;

      if (arg.startsWith('task ')) {
        type = 'task';
        title = arg.slice(5).trim();
      } else if (arg.startsWith('habit ')) {
        type = 'habit';
        title = arg.slice(6).trim();
      } else if (/\s+habit$/i.test(arg)) {
        type = 'habit';
        title = arg.replace(/\s+habit$/i, '').trim();
      }

      if (!title) {
        triggerEcho('What should I call it? Example: /add task Read 10 pages', 'error');
        return;
      }

      const updated = await addTask(tasks, title, type);
      saveTasks(updated);
      setTasks(loadTasks());
      triggerEcho(getResponse(type === 'habit' ? 'habitAdded' : 'taskAdded'), 'success');
      return;
    }

    if (command === '/done') {
      if (!arg) {
        triggerEcho('Please provide an id. Example: /done <id>', 'error');
        return;
      }
      const resolvedId = resolveTaskIdFromArg(arg);
      if (!resolvedId) {
        triggerEcho('No matching task found', 'error');
        return;
      }
      const task = tasks.find((item) => item.id === resolvedId);
      if (!task) {
        triggerEcho('No matching task found', 'error');
        return;
      }
      const updated = await markDone(tasks, task.id);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      if (task.type === 'habit') {
        const updatedHabit = updated.find((item) => item.id === task.id);
        triggerEcho(getResponse('habitDone', { streak: updatedHabit?.streak || 0 }), 'success');
      } else {
        triggerEcho(getResponse('taskDone'), 'success');
      }
      setEchoIsCommand(false);
      return;
    }

    if (command === '/skip') {
      if (!arg) {
        triggerEcho('Please provide an id. Example: /skip <id>', 'error');
        return;
      }
      const resolvedId = resolveTaskIdFromArg(arg);
      if (!resolvedId) {
        triggerEcho('No matching task found', 'error');
        return;
      }
      const task = tasks.find((item) => item.id === resolvedId);
      if (!task) {
        triggerEcho('No matching task found', 'error');
        return;
      }
      const updated = await markSkipped(tasks, task.id);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      triggerEcho(getResponse('skipped'), 'success');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/list') {
      const refreshed = loadTasks();
      setTasks(refreshed);
      triggerEcho(`Loaded ${refreshed.length} tasks`, 'info');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/features') {
      setShowFeaturesPanel(true);
      setFeaturesIndex(0);
      triggerEcho('Select a feature to run.', 'info');
      return;
    }

    if (command === '/reset') {
      const habits = tasks.filter((task) => task.type === 'habit');
      if (habits.length === 0) {
        triggerEcho('No habits to reset.', 'error');
        return;
      }
      setShowResetPanel(true);
      setResetHabitIndex(0);
      setResetDayIndex(0);
      triggerEcho('Pick habit and day (1-14), then ENTER.', 'info');
      return;
    }

    if (command === '/streak') {
      const habits = tasks.filter((task) => task.type === 'habit');
      if (habits.length === 0) {
        triggerEcho('No habits yet.', 'error');
        return;
      }
      const summary = habits
        .map((habit) => `${habit.title}: ${getStreak(tasks, habit.id)}d`)
        .join(' | ');
      triggerEcho(summary, 'info');
      setEchoIsCommand(false);
      setShowStreakPanel(true);
      return;
    }

    if (command === '/clear') {
      const updated = await clearDone(tasks);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      triggerEcho(getResponse('cleared'), 'success');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/delete') {
      if (!arg) {
        triggerEcho('Please provide an id or title. Example: /delete drink water', 'error');
        return;
      }

      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let updated = tasks;

      if (uuidLike.test(arg)) {
        updated = tasks.filter((task) => task.id !== arg);
      } else {
        const normalized = arg.toLowerCase();
        updated = tasks.filter((task) => !task.title.toLowerCase().includes(normalized));
      }

      const deletedCount = tasks.length - updated.length;
      if (deletedCount === 0) {
        triggerEcho('No matching task found', 'error');
        return;
      }

      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      triggerEcho(getResponse('deleted'), 'success');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/help') {
      setShowHelpPanel(true);
      triggerEcho("Here's everything you can do.", 'info');
      return;
    }

    if (command === '/resetday') {
      if (!arg) {
        triggerEcho('Usage: /resetday <habit> <YYYY-MM-DD>', 'error');
        return;
      }
      const parts = arg.split(' ');
      const date = parts[parts.length - 1];
      const habitArg = parts.slice(0, -1).join(' ').trim();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (!habitArg || !dateRegex.test(date)) {
        triggerEcho('Usage: /resetday <habit> <YYYY-MM-DD>', 'error');
        return;
      }

      const resolvedId = resolveTaskIdFromArg(habitArg);
      if (!resolvedId) {
        triggerEcho('No matching habit found', 'error');
        return;
      }
      const habit = tasks.find((item) => item.id === resolvedId);
      if (!habit || habit.type !== 'habit') {
        triggerEcho('No matching habit found', 'error');
        return;
      }

      const updated = resetHabitDay(tasks, habit.id, date);
      saveTasks(updated);
      setTasks(loadTasks());
      triggerEcho(`Reset ${habit.title} on ${date}.`, 'success');
      return;
    }

    if (command === '/settings') {
      if (!arg) {
        setShowSettingsPanel(true);
        triggerEcho('Use /settings <key> <value> to edit.', 'info');
        return;
      }
      const parts = arg.split(' ');
      const key = parts[0];
      const value = parts.slice(1).join(' ').trim();

      if (key === 'name') {
        if (!value) {
          triggerEcho('Provide a name. Example: /settings name Datta', 'error');
          return;
        }
        const updated = { ...loadConfig(), name: value };
        saveConfig(updated);
        setConfig(updated);
        triggerEcho(`Name updated to ${value}.`, 'success');
        return;
      }
      if (key === 'color') {
        const preset = COLOR_PRESETS[value.toLowerCase()];
        const hex = preset || value;
        const isValidHex = /^#[0-9a-fA-F]{6}$/.test(hex);
        if (!isValidHex) {
          triggerEcho(
            'Pick a preset (amber/green/cyan/violet/rose) or a hex like #ff6600',
            'error'
          );
          return;
        }
        const updated = { ...loadConfig(), bannerColor: hex };
        saveConfig(updated);
        setConfig(updated);
        triggerEcho(`Banner color set to ${hex}. Restart to apply.`, 'success');
        return;
      }
      triggerEcho(`Unknown setting: ${key}. Try name or color.`, 'error');
      return;
    }

    if (command === '/exit') {
      setScreen('exit');
      setEchoIsCommand(false);
      return;
    }

    triggerEcho(getResponse('unknownCommand'), 'error');
    setEchoIsCommand(false);
  };

  useInput((keyInput, key) => {
    if (screen === 'greeting') {
      if (key.return) {
        const initial = resetHabits(loadTasks());
        setTasks(initial);
        setScreen('app');
      }
      if (key.ctrl && keyInput === 'c') process.exit(0);
      return;
    }

    if (screen === 'exit') return;

    if (showFeaturesPanel) {
      if (key.upArrow) {
        setFeaturesIndex((prev) => (prev - 1 + FEATURE_COMMANDS.length) % FEATURE_COMMANDS.length);
        return;
      }
      if (key.downArrow) {
        setFeaturesIndex((prev) => (prev + 1) % FEATURE_COMMANDS.length);
        return;
      }
      if (key.return) {
        const selectedFeature = FEATURE_COMMANDS[featuresIndex];
        setShowFeaturesPanel(false);
        executeCommand(selectedFeature.value);
        return;
      }
      if (key.escape || key.backspace || key.delete) {
        setShowFeaturesPanel(false);
        return;
      }
    }

    if (showResetPanel) {
      const habits = tasks.filter((task) => task.type === 'habit');
      if (habits.length === 0) {
        setShowResetPanel(false);
        return;
      }

      if (key.escape || key.backspace || key.delete) {
        setShowResetPanel(false);
        setResetHabitIndex(0);
        setResetDayIndex(0);
        return;
      }
      if (key.upArrow) {
        setResetHabitIndex((prev) => (prev - 1 + habits.length) % habits.length);
        return;
      }
      if (key.downArrow) {
        setResetHabitIndex((prev) => (prev + 1) % habits.length);
        return;
      }
      if (key.leftArrow) {
        setResetDayIndex((prev) => (prev + 1) % 14);
        return;
      }
      if (key.rightArrow) {
        setResetDayIndex((prev) => (prev - 1 + 14) % 14);
        return;
      }
      if (key.return) {
        const selectedHabit = habits[resetHabitIndex];
        if (!selectedHabit) return;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - resetDayIndex);
        const isoDate = targetDate.toISOString().split('T')[0];
        const updated = resetHabitDay(tasks, selectedHabit.id, isoDate);
        saveTasks(updated);
        setTasks(loadTasks());
        triggerEcho(`Reset ${selectedHabit.title} on day ${resetDayIndex + 1} (${isoDate}).`, 'success');
        setShowResetPanel(false);
        return;
      }
      return;
    }

    if (showHelpPanel) {
      if (key.return || key.escape) {
        setShowHelpPanel(false);
        return;
      }
    }

    if (showSettingsPanel) {
      // ESC always exits edit mode first, then closes panel
      if (key.escape) {
        if (settingsEditMode) {
          setSettingsEditMode(false);
          setSettingsEditValue('');
          setBannerColorInputMode(false);
        } else {
          setShowSettingsPanel(false);
          setSettingsFieldIndex(0);
        }
        return;
      }

      // Navigate fields when not in edit mode
      if (!settingsEditMode) {
        const selectedField = SETTINGS_FIELDS[settingsFieldIndex];
        if (key.upArrow) {
          setSettingsFieldIndex((prev) =>
            (prev - 1 + SETTINGS_FIELDS.length) % SETTINGS_FIELDS.length
          );
          return;
        }
        if (key.downArrow) {
          setSettingsFieldIndex((prev) =>
            (prev + 1) % SETTINGS_FIELDS.length
          );
          return;
        }
        if (keyInput === 'h' && selectedField?.key === 'bannerColor') {
          setBannerColorInputMode(true);
          setSettingsEditMode(true);
          setSettingsEditValue('#');
          return;
        }
        if (key.return) {
          const field = SETTINGS_FIELDS[settingsFieldIndex];
          if (field.key === 'name') {
            setSettingsEditMode(true);
            setSettingsEditValue(config.name);
          }
          // bannerColor and bannerFont use LEFT/RIGHT; ENTER confirms current
          if (field.key === 'bannerColor' || field.key === 'bannerFont') {
            setSettingsEditMode(true);
            setSettingsEditValue('');
          }
          return;
        }
        // LEFT/RIGHT for greeting style / banner color / font (works without entering edit mode)
        if (key.leftArrow || key.rightArrow) {
          const field = SETTINGS_FIELDS[settingsFieldIndex];
          if (field.key === 'greetingStyle') {
            const rawIdx = GREETING_STYLES.indexOf(config.greetingStyle || 'dry');
            const currentIdx = rawIdx >= 0 ? rawIdx : 0;
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % GREETING_STYLES.length
              : (currentIdx - 1 + GREETING_STYLES.length) % GREETING_STYLES.length;
            const next = GREETING_STYLES[nextIdx];
            saveConfig({ greetingStyle: next });
            setConfig((prev) => ({ ...prev, greetingStyle: next }));
            return;
          }
          if (field.key === 'bannerColor') {
            const currentHex = config.bannerColor;
            const currentName = Object.entries(COLOR_PRESETS).find(
              ([, v]) => v === currentHex
            )?.[0];
            const currentIdx = COLOR_PRESET_ORDER.indexOf(currentName);
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % COLOR_PRESET_ORDER.length
              : (currentIdx - 1 + COLOR_PRESET_ORDER.length) % COLOR_PRESET_ORDER.length;
            const nextName = COLOR_PRESET_ORDER[nextIdx] ?? COLOR_PRESET_ORDER[0];
            const nextColor = COLOR_PRESETS[nextName];
            saveConfig({ bannerColor: nextColor });
            setConfig((prev) => ({ ...prev, bannerColor: nextColor }));
            return;
          }
          if (field.key === 'bannerFont') {
            const rawIdx = BANNER_FONTS.indexOf(config.bannerFont || 'block');
            const currentIdx = rawIdx >= 0 ? rawIdx : 0;
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % BANNER_FONTS.length
              : (currentIdx - 1 + BANNER_FONTS.length) % BANNER_FONTS.length;
            const nextFont = BANNER_FONTS[nextIdx];
            saveConfig({ bannerFont: nextFont });
            setConfig((prev) => ({ ...prev, bannerFont: nextFont }));
            return;
          }
        }
      }

      // Edit mode — name field text input
      if (settingsEditMode && SETTINGS_FIELDS[settingsFieldIndex].key === 'name') {
        if (key.return) {
          const trimmed = settingsEditValue.trim();
          if (trimmed.length > 0) {
            saveConfig({ name: trimmed });
            setConfig((prev) => ({ ...prev, name: trimmed }));
          }
          setSettingsEditMode(false);
          setSettingsEditValue('');
          return;
        }
        if (key.backspace || key.delete) {
          setSettingsEditValue((prev) => prev.slice(0, -1));
          return;
        }
        if (keyInput && !key.ctrl) {
          setSettingsEditValue((prev) => prev + keyInput);
          return;
        }
      }

      // Edit mode — bannerColor hex typing
      if (
        settingsEditMode
        && bannerColorInputMode
        && SETTINGS_FIELDS[settingsFieldIndex].key === 'bannerColor'
      ) {
        if (key.return) {
          const value = settingsEditValue;
          const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
          if (isValidHex) {
            saveConfig({ bannerColor: value });
            setConfig((prev) => ({ ...prev, bannerColor: value }));
            setBannerColorInputMode(false);
            setSettingsEditMode(false);
            setSettingsEditValue('');
          } else {
            triggerEcho('invalid hex — use format #rrggbb', 'error');
          }
          return;
        }
        if (key.backspace || key.delete) {
          setSettingsEditValue((prev) => (prev.length <= 1 ? '#' : prev.slice(0, -1)));
          return;
        }
        if (keyInput && !key.ctrl) {
          setSettingsEditValue((prev) => prev + keyInput);
          return;
        }
      }

      // Edit mode — LEFT/RIGHT for greetingStyle, bannerColor, bannerFont (same as above, reachable from edit mode too)
      if (settingsEditMode) {
        const field = SETTINGS_FIELDS[settingsFieldIndex];
        if (key.leftArrow || key.rightArrow) {
          if (field.key === 'greetingStyle') {
            const rawIdx = GREETING_STYLES.indexOf(config.greetingStyle || 'dry');
            const currentIdx = rawIdx >= 0 ? rawIdx : 0;
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % GREETING_STYLES.length
              : (currentIdx - 1 + GREETING_STYLES.length) % GREETING_STYLES.length;
            const next = GREETING_STYLES[nextIdx];
            saveConfig({ greetingStyle: next });
            setConfig((prev) => ({ ...prev, greetingStyle: next }));
            return;
          }
          if (field.key === 'bannerColor') {
            const currentHex = config.bannerColor;
            const currentName = Object.entries(COLOR_PRESETS).find(
              ([, v]) => v === currentHex
            )?.[0];
            const currentIdx = COLOR_PRESET_ORDER.indexOf(currentName);
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % COLOR_PRESET_ORDER.length
              : (currentIdx - 1 + COLOR_PRESET_ORDER.length) % COLOR_PRESET_ORDER.length;
            const nextName = COLOR_PRESET_ORDER[nextIdx] ?? COLOR_PRESET_ORDER[0];
            const nextColor = COLOR_PRESETS[nextName];
            saveConfig({ bannerColor: nextColor });
            setConfig((prev) => ({ ...prev, bannerColor: nextColor }));
            return;
          }
          if (field.key === 'bannerFont') {
            const rawIdx = BANNER_FONTS.indexOf(config.bannerFont || 'block');
            const currentIdx = rawIdx >= 0 ? rawIdx : 0;
            const nextIdx = key.rightArrow
              ? (currentIdx + 1) % BANNER_FONTS.length
              : (currentIdx - 1 + BANNER_FONTS.length) % BANNER_FONTS.length;
            const nextFont = BANNER_FONTS[nextIdx];
            saveConfig({ bannerFont: nextFont });
            setConfig((prev) => ({ ...prev, bannerFont: nextFont }));
            return;
          }
        }
        if (key.return) {
          setSettingsEditMode(false);
          setSettingsEditValue('');
          setBannerColorInputMode(false);
          return;
        }
      }

      return; // consume all input while panel is open
    }

    if (key.ctrl && keyInput === 'c') {
      process.exit(0);
    }

    if (key.escape) {
      setInput('');
      setAddSubMode(false);
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      setShowTaskSuggestions(false);
      setTaskSuggestions([]);
      setTaskSuggestionIndex(0);
      setActiveCommand('');
      return;
    }

    if (key.backspace || key.delete) {
      const nextInput = input.slice(0, -1);
      setInput(nextInput);
      if (addSubMode && nextInput.length <= '/add'.length) {
        setAddSubMode(false);
      }
      updateSuggestions(nextInput);
      return;
    }

    if (showTaskSuggestions && taskSuggestions.length > 0 && key.upArrow) {
      setTaskSuggestionIndex((prev) => (prev - 1 + taskSuggestions.length) % taskSuggestions.length);
      return;
    }

    if (showTaskSuggestions && taskSuggestions.length > 0 && key.downArrow) {
      setTaskSuggestionIndex((prev) => (prev + 1) % taskSuggestions.length);
      return;
    }

    if (key.upArrow && showSuggestions && suggestions.length > 0) {
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (key.downArrow && showSuggestions && suggestions.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (key.tab) {
      if (showTaskSuggestions && taskSuggestions.length > 0) {
        const trimmed = input.trim();
        const firstSpaceIdx = trimmed.indexOf(' ');
        const command = firstSpaceIdx === -1 ? trimmed : trimmed.slice(0, firstSpaceIdx);
        const selectedTask = taskSuggestions[taskSuggestionIndex];
        if (selectedTask) {
          const completedInput = `${command} ${selectedTask.title}`;
          setInput(completedInput);
          setShowTaskSuggestions(false);
          setTaskSuggestions([]);
          setTaskSuggestionIndex(0);
          updateSuggestions(completedInput);
          return;
        }
      }
      autocompleteFromSelection();
      return;
    }

    if (key.return) {
      setActiveCommand('');
      if (showTaskSuggestions && taskSuggestions.length > 0) {
        const trimmed = input.trim();
        const firstSpaceIdx = trimmed.indexOf(' ');
        const command = firstSpaceIdx === -1 ? trimmed : trimmed.slice(0, firstSpaceIdx);
        const selectedTask = taskSuggestions[taskSuggestionIndex];
        if (selectedTask && (command === '/done' || command === '/skip' || command === '/delete')) {
          const completedInput = `${command} ${selectedTask.title}`;
          executeCommand(completedInput);
          setInput('');
          setShowTaskSuggestions(false);
          setTaskSuggestions([]);
          setTaskSuggestionIndex(0);
          setShowSuggestions(false);
          setSuggestions([]);
          setSelectedIndex(0);
          return;
        }
      }
      const submitted = input.trim();
      if (submitted.length > 0) {
        if (showSuggestions && selectedIndex >= 0 && suggestions[selectedIndex]) {
          const slug = suggestions[selectedIndex].value;
          if (slug === '/add') {
            setInput('/add ');
            setAddSubMode(true);
            setSuggestions(ADD_SUB_COMMANDS);
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
          }

          if (slug === '/add task' || slug === '/add habit') {
            setInput(`${slug} `);
            setAddSubMode(false);
            setShowSuggestions(false);
            setSuggestions([]);
            setSelectedIndex(0);
            return;
          }

          const needsArg = slug === '/done' || slug === '/skip' || slug === '/delete';

          if (needsArg) {
            setInput(`${slug} `);
            setAddSubMode(false);
            setShowSuggestions(false);
            setSuggestions([]);
            setSelectedIndex(0);
            return;
          }

          executeCommand(slug);
          setInput('');
          setShowSuggestions(false);
          setSuggestions([]);
          setSelectedIndex(0);
          return;
        }

        if (submitted.startsWith('/')) {
          setAddSubMode(false);
          executeCommand(submitted);
        } else {
          setEcho(`echo: ${submitted}`);
          setEchoTone('info');
          setEchoIsCommand(true);
        }
      }

      setInput('');
      setAddSubMode(false);
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    if (keyInput) {
      const nextInput = input + keyInput;
      setInput(nextInput);
      updateSuggestions(nextInput);
      const detectedCommand = Object.keys(COMMAND_CONTEXT).find(cmd =>
        nextInput.startsWith(cmd)
      );
      setActiveCommand(detectedCommand ? `▸ ${detectedCommand} — ${COMMAND_CONTEXT[detectedCommand]}` : '');
    }
  });

  return (
    !bootDone && bootConfig.firstLaunch ? (
      <Onboarding onComplete={() => setBootDone(true)} />
    ) : (
    <Box flexDirection="column">
      {screen === 'greeting' ? (
        <Box borderStyle="round" borderColor={COLORS.amber} flexDirection="column" paddingX={1}>
          <Text color={COLORS.bright}>  {greetingText}  </Text>
          <Text color={COLORS.muted}>  Your tasks. Your habits. Your day.  </Text>
          <Text color={COLORS.dim}>  {SECTION_DIVIDER}  </Text>
          <Box gap={2}>
            <Text color={COLORS.dim}>Tasks: <Text color={COLORS.green}>{pendingTaskCount}</Text></Text>
            <Text color={COLORS.dim}>Habits: <Text color={COLORS.cyan}>{habitItems.length}</Text></Text>
            <Text color={COLORS.dim}>Top streak: <Text color={COLORS.amber}>{topStreak}d</Text></Text>
          </Box>
          <Text> </Text>
          <Text color={COLORS.amber}>
            {continueBlink ? '  Press ENTER to continue  ' : '                           '}
          </Text>
        </Box>
      ) : null}

      {screen === 'exit' ? (
        <Box borderStyle="round" borderColor={COLORS.rose} flexDirection="column">
          <Text color={COLORS.bright}>  Goodbye. Stay consistent.  </Text>
          <Text color={COLORS.dim}>  F.R.I.D.A.Y shutting down...  </Text>
        </Box>
      ) : null}

      {screen === 'app' ? (
        <>
      <Text color={COLORS.muted}>{greetingDisplayed}{!greetingDone ? '▌' : ''}</Text>
      <Box>
        <Text color={COLORS.dim}>{dateText}</Text>
        <Text color={COLORS.dim}>  ·  </Text>
        <Text color={COLORS.dim}>{taskCount} tasks today</Text>
      </Box>

      <Box />

      <Box flexDirection="column">
        <Box>
          <Text color={COLORS.cyan}>▍</Text>
          <Text color={COLORS.cyan}> HABITS </Text>
          <Text color={COLORS.dim}>({habitItems.length})</Text>
        </Box>
        <Text color={COLORS.dim}>{SECTION_DIVIDER}</Text>
        {habitItems.length === 0 ? (
          <Text color={COLORS.dim}>No habits added yet.</Text>
        ) : (
          habitItems.map((habit) => {
            const streak = habit.streak || 0;
            return (
              <Box key={habit.id} marginLeft={1}>
                <Text color={statusIcon[habit.status] ? statusIcon[habit.status].color : COLORS.cyan}>
                  {statusIcon[habit.status] ? `${statusIcon[habit.status].icon} ${statusIcon[habit.status].label} ` : '○ PENDING '}
                </Text>
                <Text color={habit.status === 'pending' ? COLORS.cyan : COLORS.dim}>{habit.title}</Text>
                <Text color={COLORS.dim}>  </Text>
                {buildDotRow(habit.log, COLORS).map((dot, i) => (
                  <Text key={i} color={dot.color}>{dot.char}</Text>
                ))}
                <Text color={COLORS.dim}>  {habit.streak}d</Text>
                {showStreakPanel ? <Text color={COLORS.dim}>  ({streak}d)</Text> : null}
              </Box>
            );
          })
        )}
        <Box marginLeft={1}>
          <Text color={COLORS.dim}>{'     '}</Text>
          <Text color={COLORS.dim}>{buildDateAxis()}</Text>
        </Box>
      </Box>

      <Box />

      <Box flexDirection="column">
        <Box>
          <Text color={COLORS.amber}>▍</Text>
          <Text color={COLORS.green}> TASKS </Text>
          <Text color={COLORS.dim}>({taskItems.length})</Text>
        </Box>
        <Text color={COLORS.dim}>{SECTION_DIVIDER}</Text>
        {taskItems.length === 0 ? (
          <Text color={COLORS.dim}>No tasks added yet.</Text>
        ) : (
          taskItems.map((task) => (
            <Box key={task.id} marginLeft={1}>
              <Text color={statusIcon[task.status] ? statusIcon[task.status].color : COLORS.green}>
                {statusIcon[task.status] ? `${statusIcon[task.status].icon} ${statusIcon[task.status].label} ` : '○ PENDING '}
              </Text>
              {task.status === 'done' ? (
                <Text color={COLORS.dim} strikethrough>
                  {task.title}
                </Text>
              ) : task.status === 'skipped' ? (
                <Text color={COLORS.dim}>{task.title}</Text>
              ) : (
                <Text color={COLORS.green}>{task.title}</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      <Box />

      <Text color={COLORS.dim}>{SECTION_DIVIDER}</Text>
      {showHelpPanel ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
          <Text color={COLORS.violet}>  ▸ HELP</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          {formatHelpLines(COLORS).map((line) => (
            <Box key={line.cmd}>
              <Text color={line.color}>  {line.cmd.padEnd(22)}</Text>
              <Text color={COLORS.dim}>  {line.desc}</Text>
            </Box>
          ))}
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Text color={COLORS.dim}>  Press ENTER or ESC to close</Text>
        </Box>
      ) : null}
      {showFeaturesPanel ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
          <Text color={COLORS.amber}>  ▸ FEATURES</Text>
          {FEATURE_COMMANDS.map((item, idx) => {
            const selected = idx === featuresIndex;
            return (
              <Text key={item.value} color={selected ? item.color : COLORS.dim} bold={selected}>
                {selected ? '› ' : '  '}
                {item.label}
              </Text>
            );
          })}
        </Box>
      ) : null}
      {showSettingsPanel ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.violet} paddingX={1}>
          <Text color={COLORS.violet}>  ▸ SETTINGS</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          {SETTINGS_FIELDS.map((field, idx) => {
            const selected = idx === settingsFieldIndex;
            const isEditing = selected && settingsEditMode;
            let valueDisplay;
            if (field.key === 'name') {
              valueDisplay = isEditing
                ? settingsEditValue + '█'
                : config.name;
            } else if (field.key === 'greetingStyle') {
              valueDisplay = config.greetingStyle || 'dry';
            } else if (field.key === 'bannerColor') {
              if (isEditing && bannerColorInputMode) {
                valueDisplay = settingsEditValue + '█';
              } else {
                // find preset name or show raw hex
                const presetName = Object.entries(COLOR_PRESETS).find(
                  ([, v]) => v === config.bannerColor
                )?.[0];
                valueDisplay = presetName
                  ? `${presetName} (${config.bannerColor})`
                  : config.bannerColor;
              }
            } else if (field.key === 'bannerFont') {
              const fontIdx = BANNER_FONTS.indexOf(config.bannerFont || 'block');
              const pos = fontIdx >= 0 ? fontIdx + 1 : 1;
              valueDisplay = `${config.bannerFont || 'block'} (${pos}/${BANNER_FONTS.length})`;
            }
            return (
              <Box key={field.key}>
                <Text color={selected ? COLORS.violet : COLORS.dim}>
                  {selected ? '› ' : '  '}
                </Text>
                <Text color={COLORS.dim}>{field.label.padEnd(14)}</Text>
                <Text color={selected ? COLORS.bright : COLORS.muted}>{valueDisplay}</Text>
                {selected && !isEditing && field.key === 'greetingStyle' && (
                  <Text color={COLORS.dim}>  ← → to cycle</Text>
                )}
                {selected && !isEditing && field.key === 'bannerColor' && (
                  <Text color={COLORS.dim}>  ← → presets  ·  h = type hex</Text>
                )}
                {selected && !isEditing && field.key === 'bannerFont' && (
                  <Text color={COLORS.dim}>  ← → to cycle · takes effect on relaunch</Text>
                )}
                {selected && !isEditing && field.key === 'name' && (
                  <Text color={COLORS.dim}>  ENTER to edit</Text>
                )}
              </Box>
            );
          })}
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Text color={COLORS.dim}>
            {settingsEditMode
              ? SETTINGS_FIELDS[settingsFieldIndex].hint + ' · ESC to cancel'
              : '↑ ↓ navigate  ·  ENTER select  ·  ESC close'}
          </Text>
        </Box>
      ) : null}
      {showResetPanel ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.rose} paddingX={1}>
          <Text color={COLORS.rose}>  ▸ RESET HABIT DAY</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          {habitItems.length === 0 ? (
            <Text color={COLORS.dim}>  No habits available.</Text>
          ) : (
            habitItems.map((habit, idx) => (
              <Text key={habit.id} color={idx === resetHabitIndex ? COLORS.bright : COLORS.dim}>
                {idx === resetHabitIndex ? '› ' : '  '}
                {habit.title}
              </Text>
            ))
          )}
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Text color={COLORS.muted}>  Selected day: {resetDayIndex + 1} (1=today, 14=13 days ago)</Text>
          <Text color={COLORS.dim}>  ↑ ↓ habit  ·  ← → day  ·  ENTER reset  ·  ESC close</Text>
        </Box>
      ) : null}
      <Text color={echoIsCommand ? COLORS.amber : echoColor}>→ {echoVisible ? (echo || ' ') : ' '}</Text>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={COLORS.dim}
        paddingX={1}
        display={showSuggestions && suggestions.length > 0 ? 'flex' : 'none'}
      >
        {suggestions.map((item, idx) => {
          const selected = idx === selectedIndex;
          return (
            <Text key={item.value} color={selected ? item.color : COLORS.dim} bold={selected}>
              {selected ? '› ' : '  '}
              {item.label}
            </Text>
          );
        })}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={COLORS.dim}
        paddingX={1}
        display={showTaskSuggestions && taskSuggestions.length > 0 ? 'flex' : 'none'}
      >
        {taskSuggestions.map((item, idx) => {
          const selected = idx === taskSuggestionIndex;
          return (
            <Text key={item.id} color={selected ? COLORS.amber : COLORS.dim}>
              {selected ? '› ' : '  '}
              {item.title}
              <Text color={COLORS.dim}>  [{item.type}]</Text>
            </Text>
          );
        })}
      </Box>

      <Text color={COLORS.dim}>{activeCommand || ' '}</Text>
      <Box>
        {(() => {
          const displayText = input + (cursorVisible ? '|' : ' ');
          const baseText = displayText.slice(0, -1);
          const caret = displayText.slice(-1);
          return (
            <>
              <Text color={COLORS.amber}>❯ </Text>
              <Text color={COLORS.bright}>{baseText}</Text>
              <Text color={COLORS.amber}>{caret}</Text>
            </>
          );
        })()}
      </Box>
      </>
      ) : null}
    </Box>
    )
  );
}

const initialConfig = loadConfig();
cfonts.say('FRIDAY', {
  font: initialConfig.bannerFont || 'block',
  colors: [initialConfig.bannerColor || '#cc8b3c'],
  background: 'transparent',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: 0,
});

render(<App />);
