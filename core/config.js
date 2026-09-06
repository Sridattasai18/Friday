/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONFIG.JS - User Configuration Management
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Handles reading/writing user settings to ~/.friday/config.json
 * Settings: name, bannerColor, bannerFont, greetingStyle, firstLaunch
 * 
 * All settings have defaults, so missing config.json is not an error.
 * Changes are saved instantly (no confirmation needed).
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Config directory: ~/.friday/
const DIR = join(homedir(), '.friday');

// Full path to config file: ~/.friday/config.json
const CONFIG_PATH = join(DIR, 'config.json');

/**
 * Default configuration values
 * 
 * These are used:
 * 1. On first launch (no config.json exists)
 * 2. As fallbacks when config.json is missing keys
 * 3. When config.json is corrupt
 */
const DEFAULTS = {
  name: 'Datta',                    // User's name for greetings
  bannerColor: '#cc8b3c',           // Accent color (amber) - drives entire palette
  bannerFont: 'block',              // cfonts font name for ASCII banner
  greetingStyle: 'dry',             // Personality: 'dry' | 'warm' | 'casual'
  firstLaunch: true,                // Show onboarding on first run
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load user configuration from ~/.friday/config.json
 * 
 * Behavior:
 * - If file doesn't exist: returns DEFAULTS
 * - If file is corrupt: returns DEFAULTS (silent failure)
 * - If file is valid: merges saved config with DEFAULTS (so new keys always have values)
 * 
 * This merge strategy ensures:
 * - Old config files work when new settings are added
 * - Missing keys don't cause errors
 * - Users can manually delete config keys to reset them
 * 
 * @returns {Object} Complete config object with all keys
 */
export function loadConfig() {
  // First run or deleted config: use all defaults
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }
  
  // Read and merge existing config with defaults
  try {
    const savedConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    return { ...DEFAULTS, ...savedConfig };
  } catch {
    // File is corrupt: use defaults, but don't overwrite
    // (User might be able to fix manually)
    return { ...DEFAULTS };
  }
}

/**
 * Save configuration updates to ~/.friday/config.json
 * 
 * Merges updates with existing config (doesn't overwrite unspecified keys).
 * Creates ~/.friday/ directory if needed.
 * 
 * Example:
 *   saveConfig({ bannerColor: '#22d3ee' })  // Only changes color, keeps other settings
 * 
 * @param {Object} updates - Partial config object with keys to update
 */
export function saveConfig(updates) {
  // Merge updates with current config
  const merged = { ...loadConfig(), ...updates };
  
  // Ensure directory exists
  if (!existsSync(DIR)) {
    mkdirSync(DIR, { recursive: true });
  }
  
  // Write formatted JSON (2-space indent for readability)
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}
