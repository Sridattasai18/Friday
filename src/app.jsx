import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useInput } from 'ink';
import cfonts from 'cfonts';
import { loadTasks, saveTasks } from '../core/storage.js';
import { addTask, markDone, markSkipped, clearDone, getStreak } from '../core/commands.js';
import { getResponse } from '../core/personality.js';
import { loadConfig, saveConfig } from '../core/config.js';

const COLORS = {
  green: '#34d399',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  rose: '#fb7185',
  violet: '#a78bfa',
  dim: '#4b5563',
  muted: '#9ca3af',
  bright: '#f9fafb',
};
const SECTION_DIVIDER = '─'.repeat(28);
const statusIcon = {
  done: { icon: '●', label: 'DONE', color: COLORS.dim },
  skipped: { icon: '◌', label: 'SKIPPED', color: COLORS.amber },
  pending: { icon: '○', label: 'PENDING', color: COLORS.green },
};

const QUICK_COMMANDS = [
  { value: '/add', label: '/add    - Add a task or habit', color: COLORS.green },
  { value: '/done', label: '/done   - Mark as done', color: COLORS.green },
  { value: '/delete', label: '/delete - Delete an item', color: COLORS.rose },
  { value: '/features', label: '/features - Open power commands', color: COLORS.amber },
  { value: '/settings', label: '/settings - View/edit settings', color: COLORS.violet },
  { value: '/exit', label: '/exit   - Quit F.R.I.D.A.Y', color: COLORS.dim },
];

const ADD_SUB_COMMANDS = [
  { value: '/add task', label: '/task  - Add a new task', color: COLORS.green },
  { value: '/add habit', label: '/habit - Add a new habit', color: COLORS.cyan },
];

const FEATURE_COMMANDS = [
  { value: '/streak', label: '/streak - Show habit streaks', color: COLORS.amber },
  { value: '/list', label: '/list   - Reload task list', color: COLORS.green },
  { value: '/clear', label: '/clear  - Remove completed tasks', color: COLORS.dim },
  { value: '/help', label: '/help   - Show all commands', color: COLORS.violet },
];

const COLOR_PRESETS = {
  amber: '#cc8b3c',
  green: '#34d399',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  rose: '#fb7185',
};

const COMMAND_CONTEXT = {
  '/add': 'adding a task or habit...',
  '/done': 'marking as done...',
  '/delete': 'deleting an item...',
  '/skip': 'skipping a habit...',
  '/streak': 'checking streaks...',
  '/clear': 'clearing completed tasks...',
  '/list': 'loading your list...',
  '/settings': 'opening settings...',
  '/features': 'opening features...',
  '/help': 'showing all commands...',
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

function formatHelpLines() {
  return [
    { cmd: '/add <title>', desc: 'add a task or habit', color: COLORS.green },
    { cmd: '/done <title>', desc: 'mark a task or habit done', color: COLORS.green },
    { cmd: '/delete <title>', desc: 'delete a task or habit', color: COLORS.rose },
    { cmd: '/skip <title>', desc: 'skip a habit for today', color: COLORS.amber },
    { cmd: '/streak', desc: 'show all habit streaks', color: COLORS.amber },
    { cmd: '/list', desc: 'reload and show all tasks', color: COLORS.cyan },
    { cmd: '/clear', desc: 'remove all completed tasks', color: COLORS.dim },
    { cmd: '/settings <key>', desc: 'change name, theme or color', color: COLORS.violet },
    { cmd: '/features', desc: 'open power commands panel', color: COLORS.cyan },
    { cmd: '/help', desc: 'show this list', color: COLORS.violet },
    { cmd: '/exit', desc: 'quit F.R.I.D.A.Y', color: COLORS.dim },
  ];
}

function App() {
  const [screen, setScreen] = useState('greeting');
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState(loadConfig());
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
  const [showStreakPanel, setShowStreakPanel] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [continueBlink, setContinueBlink] = useState(true);

  useEffect(() => {
    const shouldBlinkCursor = screen === 'app'
      && !showHelpPanel
      && !showFeaturesPanel
      && !showSettingsPanel
      && !showSuggestions
      && !showTaskSuggestions;

    if (!shouldBlinkCursor) {
      setCursorVisible(true);
      return undefined;
    }

    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, [screen, showHelpPanel, showFeaturesPanel, showSettingsPanel, showSuggestions, showTaskSuggestions]);

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
    return getResponse('greeting', { name: config.name, pendingCount: pendingTaskCount, timeOfDay });
  }, [pendingTaskCount, config.name]);
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
    const full = getResponse('greeting', { name: config.name, pendingCount: pendingTaskCount, timeOfDay });
    let i = 0;

    setGreetingDisplayed('');
    setGreetingDone(false);

    const interval = setInterval(() => {
      i += 1;
      setGreetingDisplayed(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(interval);
        setGreetingDone(true);
      }
    }, 38);

    return () => clearInterval(interval);
  }, [screen, pendingTaskCount, config.name]);

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
      filtered = QUICK_COMMANDS.filter((cmd) => cmd.value.startsWith(nextInput));
    }

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
    updateTaskSuggestions(nextInput);
  };

  const refreshFromDisk = (nextEcho) => {
    const diskTasks = loadTasks();
    setTasks(diskTasks);
    if (nextEcho) {
      setEcho(nextEcho);
      setEchoIsCommand(false);
    }
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
      if (key === 'theme') {
        if (!['dark', 'light'].includes(value)) {
          triggerEcho('Theme must be dark or light. Example: /settings theme dark', 'error');
          return;
        }
        const updated = { ...loadConfig(), theme: value };
        saveConfig(updated);
        setConfig(updated);
        triggerEcho(`Theme set to ${value}. Restart F.R.I.D.A.Y to apply.`, 'success');
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
      triggerEcho(`Unknown setting: ${key}. Try name or theme.`, 'error');
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

    if (showHelpPanel) {
      if (key.return || key.escape) {
        setShowHelpPanel(false);
        return;
      }
    }

    if (showSettingsPanel) {
      if (key.return || key.escape) {
        setShowSettingsPanel(false);
        return;
      }
    }

    if (key.ctrl && keyInput === 'c') {
      process.exit(0);
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
            const filled = Math.min(Math.max(streak, 0), 10);
            const barColor = filled >= 5 ? COLORS.green : COLORS.amber;
            return (
              <Box key={habit.id} marginLeft={1}>
                <Text color={statusIcon[habit.status] ? statusIcon[habit.status].color : COLORS.cyan}>
                  {statusIcon[habit.status] ? `${statusIcon[habit.status].icon} ${statusIcon[habit.status].label} ` : '○ PENDING '}
                </Text>
                <Text color={habit.status === 'pending' ? COLORS.cyan : COLORS.dim}>{habit.title}</Text>
                <Text color={COLORS.dim}>  </Text>
                <Text color={barColor}>{streak}d</Text>
                <Text color={COLORS.dim}>  </Text>
                <Text color={barColor}>{'█'.repeat(filled)}</Text>
                <Text color={COLORS.dim}>{'░'.repeat(10 - filled)}</Text>
                {showStreakPanel ? <Text color={COLORS.dim}>  ({streak}d)</Text> : null}
              </Box>
            );
          })
        )}
      </Box>

      <Box />

      <Text color={COLORS.dim}>{SECTION_DIVIDER}</Text>
      {showHelpPanel ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
          <Text color={COLORS.violet}>  ▸ HELP</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          {formatHelpLines().map((line) => (
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
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
          <Text color={COLORS.violet}>  ▸ SETTINGS</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Box>
            <Text color={COLORS.dim}>  name        </Text>
            <Text color={COLORS.bright}>{config.name}</Text>
          </Box>
          <Box>
            <Text color={COLORS.dim}>  theme       </Text>
            <Text color={COLORS.bright}>{config.theme}</Text>
          </Box>
          <Box>
            <Text color={COLORS.dim}>  banner      </Text>
            <Text color={COLORS.amber}>{config.bannerColor}</Text>
          </Box>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Text color={COLORS.dim}>  /settings name {'<value>'}</Text>
          <Text color={COLORS.dim}>  /settings theme dark|light</Text>
          <Text color={COLORS.dim}>  /settings color amber|green|cyan|violet|rose|#hex</Text>
          <Text color={COLORS.dim}>  {'─'.repeat(44)}</Text>
          <Text color={COLORS.dim}>  Press ENTER or ESC to close</Text>
        </Box>
      ) : null}
      <Text color={echoIsCommand ? COLORS.amber : echoColor}>→ {echoVisible ? (echo || ' ') : ' '}</Text>

      {showSuggestions ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
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
      ) : <Box height={1} />}

      {showTaskSuggestions ? (
        <Box flexDirection="column" borderStyle="single" borderColor={COLORS.dim} paddingX={1}>
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
      ) : <Box height={1} />}

      {activeCommand ? (
        <Text color={COLORS.dim}>{activeCommand}</Text>
      ) : null}
      <Box>
        {/*
          No modal/overlay focus mode exists yet, so input remains focused.
          Cursor visibility can be gated here later if overlays are added.
        */}
        {(() => {
          const isInputFocused = true;
          const displayText = input + (isInputFocused && cursorVisible ? '|' : ' ');
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
  );
}

const initialConfig = loadConfig();
cfonts.say('FRIDAY', {
  font: 'block',
  colors: [initialConfig.bannerColor || '#cc8b3c'],
  background: 'transparent',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: 0,
});

render(<App />);
