/**
 * ════════════════════════════════════════════════════════════════════════════
 * STORAGE.JS - Local File System Persistence
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Handles reading/writing tasks data to ~/.friday/data.json
 * All data stays local - no cloud, no accounts, no external dependencies.
 * 
 * Storage Location: ~/.friday/
 * - data.json: Tasks and habits array
 * - config.json: User settings (managed by config.js)
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Data directory: ~/.friday/
const DATA_DIR = join(homedir(), '.friday');

// Full path to tasks data file: ~/.friday/data.json
const DATA_PATH = join(DATA_DIR, 'data.json');

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

// Create ~/.friday/ directory if it doesn't exist (runs at module load time)
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load all tasks and habits from ~/.friday/data.json
 * 
 * Behavior:
 * - If file doesn't exist: creates empty array and returns []
 * - If file is corrupt: returns [] (silent failure, preserves existing file)
 * - If file is valid: returns parsed array
 * 
 * @returns {Array} Array of task/habit objects
 */
export function loadTasks() {
  // First run: create empty data file
  if (!existsSync(DATA_PATH)) {
    writeFileSync(DATA_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  
  // Read and parse existing data
  try {
    const raw = readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // File is corrupt - return empty array, but don't overwrite
    // (User might be able to recover data manually)
    return [];
  }
}

/**
 * Save tasks and habits to ~/.friday/data.json
 * 
 * Writes formatted JSON (2-space indent) for human readability.
 * Overwrites existing file completely (no merging).
 * 
 * @param {Array} tasks - Array of task/habit objects to save
 */
export function saveTasks(tasks) {
  writeFileSync(DATA_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

/**
 * Generate a unique ID for a task/habit
 * 
 * NOTE: This function exists but is currently unused.
 * The code uses crypto.randomUUID() directly in commands.js instead.
 * Kept for backwards compatibility.
 * 
 * @returns {string} UUID v4
 * @deprecated Use crypto.randomUUID() directly instead
 */
export function generateId() {
  return uuidv4();
}
