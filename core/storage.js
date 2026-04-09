import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = join(homedir(), '.friday');
const DATA_PATH = join(DATA_DIR, 'data.json');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function loadTasks() {
  if (!existsSync(DATA_PATH)) {
    writeFileSync(DATA_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  writeFileSync(DATA_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function generateId() {
  return uuidv4();
}
