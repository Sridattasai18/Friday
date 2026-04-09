import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DIR = join(homedir(), '.friday');
const CONFIG_PATH = join(DIR, 'config.json');

const DEFAULTS = {
  name: 'Datta',
  theme: 'dark',
  bannerColor: '#cc8b3c',
  firstLaunch: true,
};

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(config) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
