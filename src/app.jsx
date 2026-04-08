import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useInput } from 'ink';
import cfonts from 'cfonts';
import { loadTasks, saveTasks } from '../core/storage.js';
import { addTask, markDone, markSkipped, clearDone, getStreak } from '../core/commands.js';

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

const COMMANDS = [
  { value: '/add', label: '/add    - Add a new task', color: COLORS.green },
  { value: '/habit', label: '/habit  - Add a new habit', color: COLORS.cyan },
  { value: '/done', label: '/done   - Mark a task done', color: COLORS.rose },
  { value: '/skip', label: '/skip   - Skip a habit today', color: COLORS.amber },
  { value: '/list', label: '/list   - Show all tasks', color: COLORS.green },
  { value: '/streak', label: '/streak - Show habit streaks', color: COLORS.amber },
  { value: '/clear', label: '/clear  - Remove completed tasks', color: COLORS.dim },
  { value: '/delete', label: '/delete - Delete a task or habit', color: COLORS.rose },
  { value: '/help', label: '/help   - Show all commands', color: COLORS.violet },
  { value: '/exit', label: '/exit   - Quit F.R.I.D.A.Y', color: COLORS.dim },
];

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

function formatHelp() {
  return [
    '/add <title>',
    '/habit <title>',
    '/done <title>',
    '/skip <title>',
    '/list',
    '/streak',
    '/clear',
    '/delete <id or title>',
    '/help',
    '/exit',
  ].join('  |  ');
}

function App() {
  const [screen, setScreen] = useState('greeting');
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');
  const [echo, setEcho] = useState('Type /help to see available commands.');
  const [echoIsCommand, setEchoIsCommand] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showStreakPanel, setShowStreakPanel] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [continueBlink, setContinueBlink] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setContinueBlink((v) => !v), 800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== 'exit') return undefined;
    const timer = setTimeout(() => process.exit(0), 1500);
    return () => clearTimeout(timer);
  }, [screen]);

  const dateText = useMemo(() => new Date().toLocaleString(), []);
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Datta';
    if (hour < 17) return 'Good afternoon, Datta';
    return 'Good evening, Datta';
  }, []);
  const taskCount = tasks.filter((task) => task.type === 'task').length;
  const taskItems = tasks.filter((task) => task.type === 'task');
  const habitItems = tasks.filter((task) => task.type === 'habit');

  const updateSuggestions = (nextInput) => {
    if (!nextInput.startsWith('/')) {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    const filtered = nextInput === '/'
      ? COMMANDS
      : COMMANDS.filter((cmd) => cmd.value.startsWith(nextInput));

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
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

    if (command === '/add') {
      if (!arg) {
        setEcho('Please provide a title. Example: /add Read 10 pages');
        return;
      }

      let title = arg;
      let type = 'task';
      if (/\s+habit$/i.test(arg)) {
        type = 'habit';
        title = arg.replace(/\s+habit$/i, '').trim();
      }
      if (!title) {
        setEcho('Please provide a title before "habit".');
        return;
      }

      const updated = await addTask(tasks, title, type);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho('Task added');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/habit') {
      if (!arg) {
        setEcho('Please provide a title. Example: /habit Drink water');
        setEchoIsCommand(false);
        return;
      }

      const updated = await addTask(tasks, arg, 'habit');
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho('Habit added');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/done') {
      if (!arg) {
        setEcho('Please provide an id. Example: /done <id>');
        return;
      }
      const resolvedId = resolveTaskIdFromArg(arg);
      if (!resolvedId) {
        setEcho('No matching task found');
        return;
      }
      const task = tasks.find((item) => item.id === resolvedId);
      if (!task) {
        setEcho('No matching task found');
        return;
      }
      const updated = await markDone(tasks, task.id);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho('Marked done');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/skip') {
      if (!arg) {
        setEcho('Please provide an id. Example: /skip <id>');
        return;
      }
      const resolvedId = resolveTaskIdFromArg(arg);
      if (!resolvedId) {
        setEcho('No matching task found');
        return;
      }
      const task = tasks.find((item) => item.id === resolvedId);
      if (!task) {
        setEcho('No matching task found');
        return;
      }
      const updated = await markSkipped(tasks, task.id);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho('Skipped');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/list') {
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho(`Loaded ${refreshed.length} tasks`);
      setEchoIsCommand(false);
      return;
    }

    if (command === '/streak') {
      const habits = tasks.filter((task) => task.type === 'habit');
      if (habits.length === 0) {
        setEcho('No habits yet.');
        return;
      }
      const summary = habits
        .map((habit) => `${habit.title}: ${getStreak(tasks, habit.id)}d`)
        .join(' | ');
      setEcho(summary);
      setEchoIsCommand(false);
      setShowStreakPanel(true);
      return;
    }

    if (command === '/clear') {
      const updated = await clearDone(tasks);
      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho('Cleared done tasks');
      setEchoIsCommand(false);
      return;
    }

    if (command === '/delete') {
      if (!arg) {
        setEcho('Please provide an id or title. Example: /delete drink water');
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
        setEcho('No matching task found');
        return;
      }

      saveTasks(updated);
      const refreshed = loadTasks();
      setTasks(refreshed);
      setEcho(`Deleted ${deletedCount} item(s)`);
      setEchoIsCommand(false);
      return;
    }

    if (command === '/help') {
      setEcho(formatHelp());
      setEchoIsCommand(false);
      return;
    }

    if (command === '/exit') {
      setScreen('exit');
      setEchoIsCommand(false);
      return;
    }

    setEcho(`Unknown command: ${command}. Type /help`);
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

    if (key.ctrl && keyInput === 'c') {
      process.exit(0);
    }

    if (key.backspace || key.delete) {
      const nextInput = input.slice(0, -1);
      setInput(nextInput);
      updateSuggestions(nextInput);
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
      autocompleteFromSelection();
      return;
    }

    if (key.return) {
      const submitted = input.trim();
      if (submitted.length > 0) {
        if (showSuggestions && selectedIndex >= 0 && suggestions[selectedIndex]) {
          const slug = suggestions[selectedIndex].value;
          const needsArg = slug === '/add' || slug === '/habit' || slug === '/done' || slug === '/skip' || slug === '/delete';

          if (needsArg) {
            setInput(`${slug} `);
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
          executeCommand(submitted);
        } else {
          setEcho(`echo: ${submitted}`);
          setEchoIsCommand(true);
        }
      }

      setInput('');
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    if (keyInput) {
      const nextInput = input + keyInput;
      setInput(nextInput);
      updateSuggestions(nextInput);
    }
  });

  return (
    <Box flexDirection="column">
      {screen === 'greeting' ? (
        <Box borderStyle="round" borderColor={COLORS.cyan} flexDirection="column">
          <Text color={COLORS.bright}>  {greetingText}  </Text>
          <Text color={COLORS.muted}>  Your tasks. Your habits. Your day.  </Text>
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
      <Box>
        <Text color={COLORS.dim}>{dateText}</Text>
        <Text color={COLORS.dim}>  ·  </Text>
        <Text color={COLORS.dim}>{taskCount} tasks today</Text>
      </Box>

      <Box />

      <Box flexDirection="column">
        <Text color={COLORS.green}>Tasks</Text>
        <Text color={COLORS.dim}>────────────</Text>
        {taskItems.length === 0 ? (
          <Text color={COLORS.dim}>No tasks added yet.</Text>
        ) : (
          taskItems.map((task) => (
            <Box key={task.id}>
              <Text color={task.status === 'done' ? COLORS.rose : COLORS.green}>
                {task.status === 'done' ? '[✓] ' : task.status === 'skipped' ? '[~] ' : '[·] '}
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
        <Text color={COLORS.cyan}>Habits</Text>
        <Text color={COLORS.dim}>────────────</Text>
        {habitItems.length === 0 ? (
          <Text color={COLORS.dim}>No habits added yet.</Text>
        ) : (
          habitItems.map((habit) => {
            const streak = habit.streak || 0;
            const filled = Math.min(Math.max(streak, 0), 7);
            const bar = `${'█'.repeat(filled)}${'░'.repeat(7 - filled)}`;
            return (
              <Box key={habit.id}>
                <Text color={COLORS.cyan}>[·] </Text>
                <Text color={habit.status === 'pending' ? COLORS.cyan : COLORS.dim}>{habit.title}</Text>
                <Text color={COLORS.dim}>  </Text>
                <Text color={COLORS.amber}>{streak}d</Text>
                <Text color={COLORS.dim}>  </Text>
                <Text color={COLORS.amber}>{'█'.repeat(filled)}</Text>
                <Text color={COLORS.dim}>{'░'.repeat(7 - filled)}</Text>
                {showStreakPanel ? <Text color={COLORS.dim}>  ({bar})</Text> : null}
              </Box>
            );
          })
        )}
      </Box>

      <Box />

      {echo ? <Text color={echoIsCommand ? COLORS.amber : COLORS.muted}>{echo}</Text> : null}

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
              <Text color={COLORS.green}>› </Text>
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

cfonts.say('FRIDAY', {
  font: 'block',
  colors: ['#cc8b3c'],
  background: 'transparent',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: 0,
});

render(<App />);
