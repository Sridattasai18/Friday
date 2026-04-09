export function addTask(tasks, title, type = 'task') {
  const newTask = {
    id: crypto.randomUUID(),
    title,
    type,
    status: 'pending',
    streak: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  return [...tasks, newTask];
}

export function markDone(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const log = task.log || {};
    return {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
      streak: task.type === 'habit' ? task.streak + 1 : task.streak,
      lastCompletedDate: task.type === 'habit' ? todayIsoDate : task.lastCompletedDate,
      log: { ...log, [todayIsoDate]: 'done' },
    };
  });
}

export function markSkipped(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const log = task.log || {};
    return {
      ...task,
      status: 'skipped',
      log: { ...log, [todayIsoDate]: 'skipped' },
    };
  });
}

export function clearDone(tasks) {
  return tasks.filter(
    (task) => !(task.status === 'done' && task.type === 'task')
  );
}

export function getStreak(tasks, id) {
  const task = tasks.find((t) => t.id === id);
  return task ? task.streak : 0;
}

function computeStreakFromLog(log = {}) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (log[key] === 'done') {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function getLastDoneDate(log = {}) {
  const doneDates = Object.keys(log)
    .filter((k) => log[k] === 'done')
    .sort();
  return doneDates.length > 0 ? doneDates[doneDates.length - 1] : null;
}

export function resetHabitDay(tasks, id, isoDate) {
  const todayIsoDate = new Date().toISOString().split('T')[0];

  return tasks.map((task) => {
    if (task.id !== id) return task;
    if (task.type !== 'habit') return task;

    const log = task.log || {};
    const nextLog = { ...log };
    delete nextLog[isoDate];

    const nextStreak = computeStreakFromLog(nextLog);
    const lastDoneDate = getLastDoneDate(nextLog);
    const status = isoDate === todayIsoDate ? 'pending' : task.status;

    return {
      ...task,
      status,
      streak: nextStreak,
      log: nextLog,
      lastCompletedDate: lastDoneDate,
      completedAt: status === 'pending' ? null : task.completedAt,
    };
  });
}
