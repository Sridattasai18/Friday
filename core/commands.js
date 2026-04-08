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
    return {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
      streak: task.type === 'habit' ? task.streak + 1 : task.streak,
      lastCompletedDate: task.type === 'habit' ? todayIsoDate : task.lastCompletedDate,
    };
  });
}

export function markSkipped(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    return { ...task, status: 'skipped' };
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
