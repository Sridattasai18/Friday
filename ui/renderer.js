import chalk from 'chalk';
import boxen from 'boxen';

const amber = chalk.hex('#cc8b3c');
const BAR_WIDTH = 16;

export function renderDivider(label) {
  console.log(chalk.dim(`── ${label} ──`));
}

export function renderWelcome(tasks = []) {
  console.clear();
  const LEFT_WIDTH = 30;
  const RIGHT_WIDTH = 36;
  const totalInnerWidth = LEFT_WIDTH + RIGHT_WIDTH + 1;
  const border = chalk.hex('#cc8b3c');

  function padTo(text, width) {
    const visible = text.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, width - visible.length);
    return text + ' '.repeat(pad);
  }

  const row = (left, right) =>
    border('│') +
    padTo(left, LEFT_WIDTH) +
    border('│') +
    padTo(right, RIGHT_WIDTH) +
    border('│');

  const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
  const activeHabits = tasks.filter(
    (task) => task.type === 'habit' && task.status !== 'skipped'
  );
  const combinedStreak = activeHabits.reduce(
    (total, habit) => total + (habit.streak || 0),
    0
  );

  const leftLines = [
    amber.bold('Welcome back, Datta!'),
    '',
    amber('  ▄███▄'),
    amber('  █ ◉ █'),
    amber('  ▀███▀'),
    '',
    chalk.dim('F.R.I.D.A.Y v1.0'),
    chalk.dim('/help for commands'),
    '',
  ];

  const rightLines = [
    amber.bold("Today's focus"),
    pendingTasks > 0 ? `${pendingTasks} tasks remaining` : 'All done! 🎉',
    '',
    amber.bold('Streak status'),
    `${activeHabits.length} habits active · ${combinedStreak} day streak`,
    '',
    amber.bold('Last active'),
    chalk.dim(new Date().toLocaleString()),
    '',
  ];

  const rows = Array.from({ length: Math.max(leftLines.length, rightLines.length) }, (_, idx) =>
    row(leftLines[idx] ?? '', rightLines[idx] ?? '')
  );

  const topPrefix = '─ F.R.I.D.A.Y v1.0 ';
  const topLine = `${border('┌')}${border(topPrefix)}${border(
    '─'.repeat(Math.max(0, totalInnerWidth - topPrefix.length))
  )}${border('┐')}`;
  const bottomLine = `${border('└')}${border('─'.repeat(totalInnerWidth))}${border('┘')}`;

  const dashboard = [topLine, ...rows, bottomLine].join('\n');
  console.log('\n' + boxen(dashboard, { padding: 0, borderStyle: 'none' }));
  console.log(chalk.dim('/model · /help for shortcuts · type any command to start\n'));
}

export function renderTaskList(tasks) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  console.log('\n' + chalk.dim(`── ${today} ──`));

  if (tasks.length === 0) {
    console.log(chalk.dim('  No tasks yet. Type /add to get started 🚀'));
    return;
  }

  const habits = tasks.filter((task) => task.type === 'habit');
  const regularTasks = tasks.filter((task) => task.type === 'task');

  renderDivider('habits');
  for (const habit of habits) {
    if (habit.status === 'pending') {
      const streak = habit.streak > 0 ? chalk.dim(` · streak ${habit.streak}d`) : '';
      console.log(`  ${amber('◼')} ${chalk.white(habit.title)} ${chalk.dim('[habit]')}${streak}`);
      continue;
    }

    if (habit.status === 'done') {
      const streak = habit.streak > 0 ? chalk.dim(` · streak ${habit.streak}d`) : '';
      console.log(`  ${chalk.green('✓')} ${chalk.dim.strikethrough(habit.title)} ${chalk.dim('[done]')}${streak}`);
      continue;
    }

    console.log(`  ${chalk.dim('—')} ${chalk.dim(habit.title)} ${chalk.dim('[skipped]')}`);
  }

  renderDivider('tasks');
  for (const task of regularTasks) {
    if (task.status === 'pending') {
      console.log(`  ${amber('◼')} ${chalk.white(task.title)} ${chalk.dim('[task]')}`);
      continue;
    }

    if (task.status === 'done') {
      const completedTime = task.completedAt
        ? new Date(task.completedAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
        : '';
      const timeSuffix = completedTime ? chalk.dim(` · ${completedTime}`) : '';
      console.log(`  ${chalk.green('✓')} ${chalk.dim.strikethrough(task.title)} ${chalk.dim('[done]')}${timeSuffix}`);
      continue;
    }

    console.log(`  ${chalk.dim('—')} ${chalk.dim(task.title)} ${chalk.dim('[skipped]')}`);
  }

  console.log('');
}

export function renderSuccess(message) {
  console.log(chalk.green(`  ✓ ${message}`));
}

export function renderError(message) {
  console.log(chalk.red(`  ✗ ${message}`));
}

export function renderInfo(message) {
  console.log(chalk.dim(`  ${message}`));
}

export function renderHelp() {
  console.log('\n' + chalk.dim('── commands ──'));
  const cmds = [
    ['/add <title> [habit]', 'add a task or habit'],
    ['/done <title>',        'mark a task as done'],
    ['/skip <title>',        'mark a task as skipped'],
    ['/list',                'show all tasks'],
    ['/streak',              'show habit streaks'],
    ['/clear',               'remove completed tasks'],
    ['/help',                'show this help'],
    ['/exit',                'quit Friday'],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${amber(cmd.padEnd(26))}${chalk.dim(desc)}`);
  }
  console.log('');
}

export function renderStats(tasks) {
  const done = tasks.filter((t) => t.status === 'done').length;
  const skipped = tasks.filter((t) => t.status === 'skipped').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const filled = total > 0 ? Math.round((done / total) * BAR_WIDTH) : 0;
  const progressBar = `${amber('█'.repeat(filled))}${chalk.dim('░'.repeat(BAR_WIDTH - filled))}`;

  console.log(
    `  ${chalk.green('✓')} ${chalk.green(done)} done  ` +
    `${chalk.dim('—')} ${chalk.dim(skipped)} skipped  ` +
    `${amber('◼')} ${amber(pending)} pending\n`
  );
  console.log(`  Progress  ${progressBar}  ${done}/${total} done (${percent}%)\n`);
}
