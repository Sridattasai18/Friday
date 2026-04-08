import chalk from 'chalk';
import ora from 'ora';
import didYouMean from 'didyoumean';
import { loadTasks, saveTasks } from './core/storage.js';
import {
  addTask,
  markDone,
  markSkipped,
  clearDone,
  getStreak,
} from './core/commands.js';
import {
  renderWelcome,
  renderTaskList,
  renderSuccess,
  renderError,
  renderInfo,
  renderHelp,
  renderStats,
} from './ui/renderer.js';
import { startPrompt } from './ui/prompt.js';

function normalizeToDateOnly(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function findTaskByTitle(tasks, rawTitle) {
  const query = rawTitle.trim().toLowerCase();
  return tasks.find((task) => task.title.trim().toLowerCase() === query);
}

export function resetHabits(tasks) {
  const today = normalizeToDateOnly(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const updatedTasks = tasks.map((task) => {
    if (task.type !== 'habit') {
      return task;
    }

    const lastDateSource = task.lastCompletedDate || task.completedAt;
    const lastCompletedDate = lastDateSource ? normalizeToDateOnly(lastDateSource) : null;

    if (task.status === 'done' && lastCompletedDate && lastCompletedDate < today) {
      return {
        ...task,
        status: 'pending',
        completedAt: null,
      };
    }

    const isMissedYesterday =
      !lastCompletedDate || lastCompletedDate < yesterday;

    if (task.status === 'pending' && task.streak > 0 && isMissedYesterday) {
      return {
        ...task,
        streak: 0,
      };
    }

    return task;
  });

  saveTasks(updatedTasks);
  return updatedTasks;
}

let tasks = [];
const knownCommands = ['/add', '/done', '/skip', '/list', '/streak', '/clear', '/help', '/exit'];

async function bootstrap() {
  tasks = loadTasks();
  tasks = resetHabits(tasks);

  // Startup banner should render exactly once.
  renderWelcome(tasks);

  const spinner = ora({
    text: 'Loading your tasks...',
    color: 'yellow',
  }).start();
  await new Promise((resolve) => setTimeout(resolve, 600));
  spinner.stop();

  renderTaskList(tasks);
  renderStats(tasks);
}

function onCommand(input) {
  const normalizedInput = input.startsWith('/') ? input : `/${input}`;
  const commandKey = normalizedInput.split(/\s+/)[0];

  if (normalizedInput.startsWith('/add ')) {
    const raw = normalizedInput.slice(5).trim();
    if (!raw) {
      renderError('Please provide a title. Example: /add Read 10 pages');
      return;
    }

    let title = raw;
    let type = 'task';
    if (/\s+habit$/i.test(raw)) {
      type = 'habit';
      title = raw.replace(/\s+habit$/i, '').trim();
    }

    if (!title) {
      renderError('Please provide a title before "habit".');
      return;
    }

    tasks = addTask(tasks, title, type);
    saveTasks(tasks);
    renderSuccess(`Added ${type}: ${title}`);
    return;
  }

  if (normalizedInput.startsWith('/done ')) {
    const title = normalizedInput.slice(6).trim();
    if (!title) {
      renderError('Please provide a title. Example: /done Read 10 pages');
      return;
    }

    const task = findTaskByTitle(tasks, title);
    if (!task) {
      renderError(`Task not found: ${title}`);
      return;
    }

    tasks = markDone(tasks, task.id);
    saveTasks(tasks);
    renderSuccess(`Completed: ${task.title}`);
    return;
  }

  if (normalizedInput.startsWith('/skip ')) {
    const title = normalizedInput.slice(6).trim();
    if (!title) {
      renderError('Please provide a title. Example: /skip Read 10 pages');
      return;
    }

    const task = findTaskByTitle(tasks, title);
    if (!task) {
      renderError(`Task not found: ${title}`);
      return;
    }

    tasks = markSkipped(tasks, task.id);
    saveTasks(tasks);
    renderSuccess(`Skipped: ${task.title}`);
    return;
  }

  if (normalizedInput === '/list') {
    renderTaskList(tasks);
    renderStats(tasks);
    return;
  }

  if (normalizedInput === '/streak') {
    const habits = tasks.filter((task) => task.type === 'habit');
    if (habits.length === 0) {
      renderInfo('No habits yet.');
      return;
    }

    for (const habit of habits) {
      const streak = getStreak(tasks, habit.id);
      const filled = Math.min(Math.max(streak, 0), 10);
      const bar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
      const status = streak >= 3 ? '🔥' : streak === 0 ? '❌' : '';
      const iconSuffix = status ? `  ${status}` : '';
      console.log(`  ${habit.title.padEnd(18)} ${bar}  ${streak} days${iconSuffix}`);
    }
    console.log('');
    return;
  }

  if (normalizedInput === '/clear') {
    tasks = clearDone(tasks);
    saveTasks(tasks);
    renderInfo('Cleared done tasks');
    return;
  }

  if (normalizedInput === '/help') {
    renderHelp();
    return;
  }

  if (normalizedInput === '/exit') {
    console.log(chalk.dim('\n  see you tomorrow. goodbye.\n'));
    process.exit(0);
  }

  const suggestion = didYouMean(commandKey, knownCommands);
  if (suggestion) {
    renderError(`Unknown command. Did you mean ${suggestion}?`);
    return;
  }

  renderError('Unknown command. Type /help');
}

await bootstrap();
startPrompt(onCommand);
