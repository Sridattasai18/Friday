/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMANDS.JS - Task & Habit Mutation Functions
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Pure functions that manipulate tasks/habits data.
 * All functions return NEW arrays/objects (immutable style).
 * 
 * Data Model:
 * {
 *   id: string (UUID),
 *   title: string,
 *   type: 'task' | 'habit',
 *   status: 'pending' | 'in-progress' | 'done' | 'skipped',
 *   streak: number (habits only),
 *   createdAt: ISO timestamp,
 *   updatedAt: ISO timestamp,
 *   completedAt: ISO timestamp | null,
 *   log: { 'YYYY-MM-DD': 'done' | 'skipped' } (habits only)
 * }
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new task or habit to the list
 * @param {Array} tasks - Current tasks array
 * @param {string} title - Task/habit title
 * @param {string} type - 'task' or 'habit'
 * @returns {Array} New tasks array with added item
 */
export function addTask(tasks, title, type = 'task') {
  const newTask = {
    id: crypto.randomUUID(),
    title,
    type,
    status: 'pending',
    streak: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  return [...tasks, newTask];
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE OPERATIONS - Status Changes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark a task/habit as done
 * - For habits: increments streak and logs today's completion
 * - For tasks: just marks as complete
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Task/habit UUID
 * @returns {Array} Updated tasks array
 */
export function markDone(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const log = task.log || {};
    
    return {
      ...task,
      status: 'done',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      // Only habits track streaks
      streak: task.type === 'habit' ? task.streak + 1 : task.streak,
      lastCompletedDate: task.type === 'habit' ? todayIsoDate : task.lastCompletedDate,
      // Log today's completion for habits (used for 14-day dot visualization)
      log: { ...log, [todayIsoDate]: 'done' },
    };
  });
}

/**
 * Mark a habit as skipped (not applicable to tasks)
 * - Logs skip but doesn't break the streak
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Habit UUID
 * @returns {Array} Updated tasks array
 */
export function markSkipped(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const log = task.log || {};
    
    return {
      ...task,
      status: 'skipped',
      updatedAt: new Date().toISOString(),
      // Log today's skip (shows as amber dot in UI)
      log: { ...log, [todayIsoDate]: 'skipped' },
    };
  });
}

/**
 * Mark a task/habit as in-progress (actively working on it)
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Task/habit UUID
 * @returns {Array} Updated tasks array
 */
export function markInProgress(tasks, id) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    return {
      ...task,
      status: 'in-progress',
      updatedAt: new Date().toISOString(),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE OPERATIONS - Content Changes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update a task/habit title
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Task/habit UUID
 * @param {string} newTitle - New title text
 * @returns {Array} Updated tasks array
 */
export function updateTask(tasks, id, newTitle) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    return {
      ...task,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove all completed tasks (not habits - habits persist for streak tracking)
 * @param {Array} tasks - Current tasks array
 * @returns {Array} Filtered tasks array
 */
export function clearDone(tasks) {
  return tasks.filter(
    (task) => !(task.status === 'done' && task.type === 'task')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter tasks by status
 * @param {Array} tasks - Current tasks array
 * @param {string} status - Status to filter by: 'pending', 'in-progress', 'done', 'skipped', 'todo'
 * @returns {Array} Filtered tasks array
 * 
 * Special case: 'todo' returns pending + in-progress (i.e., not complete)
 */
export function filterByStatus(tasks, status) {
  if (status === 'todo') {
    // 'todo' = actionable items (pending + in-progress, excluding done/skipped)
    return tasks.filter(
      (task) => task.status === 'pending' || task.status === 'in-progress'
    );
  }
  return tasks.filter((task) => task.status === status);
}

/**
 * Get the current streak for a habit
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Habit UUID
 * @returns {number} Streak count (0 if not found or not a habit)
 */
export function getStreak(tasks, id) {
  const task = tasks.find((t) => t.id === id);
  return task ? task.streak : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// HABIT-SPECIFIC OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute streak by counting consecutive 'done' days backwards from today
 * Used when reconstructing streak from log (e.g., after reset)
 * @param {Object} log - Habit log: { 'YYYY-MM-DD': 'done' | 'skipped' }
 * @returns {number} Consecutive days with 'done' status
 * @private
 */
function computeStreakFromLog(log = {}) {
  const today = new Date();
  let streak = 0;

  // Walk backwards from today, checking up to 10 years (3650 days)
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    
    if (log[key] === 'done') {
      streak += 1;
      continue;
    }
    // Break on first non-done day (gap in streak)
    break;
  }

  return streak;
}

/**
 * Get the most recent 'done' date from a habit log
 * @param {Object} log - Habit log: { 'YYYY-MM-DD': 'done' | 'skipped' }
 * @returns {string|null} Most recent date with 'done' status, or null
 * @private
 */
function getLastDoneDate(log = {}) {
  const doneDates = Object.keys(log)
    .filter((k) => log[k] === 'done')
    .sort(); // Chronological order
  return doneDates.length > 0 ? doneDates[doneDates.length - 1] : null;
}

/**
 * Reset a specific day in a habit's log
 * - Removes the date entry from the log
 * - Recalculates streak from remaining log
 * - If resetting today, sets status back to 'pending'
 * @param {Array} tasks - Current tasks array
 * @param {string} id - Habit UUID
 * @param {string} isoDate - Date to reset ('YYYY-MM-DD')
 * @returns {Array} Updated tasks array
 */
export function resetHabitDay(tasks, id, isoDate) {
  const todayIsoDate = new Date().toISOString().split('T')[0];

  return tasks.map((task) => {
    if (task.id !== id) return task;
    if (task.type !== 'habit') return task; // Only habits have logs

    const log = task.log || {};
    const nextLog = { ...log };
    delete nextLog[isoDate]; // Remove the specified date

    // Recalculate streak from remaining log
    const nextStreak = computeStreakFromLog(nextLog);
    const lastDoneDate = getLastDoneDate(nextLog);
    
    // If resetting today, mark as pending again
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
