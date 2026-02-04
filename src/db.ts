import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Support test database via environment variable
const isTest = process.env.HABITS_TEST === "1";
const DATA_DIR = isTest ? "/tmp/habits-test" : join(homedir(), ".habits");
const DB_PATH = isTest ? ":memory:" : join(DATA_DIR, "habits.db");
const CONFIG_PATH = join(DATA_DIR, "config.json");

// Config interface
export interface Config {
  timezone?: string; // e.g., "America/Los_Angeles"
}

// Load config from file
export function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
    // Ignore parse errors, return default
  }
  return {};
}

// Save config to file
export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Get current config (cached)
let _config: Config | null = null;
export function getConfig(): Config {
  if (_config === null) {
    _config = loadConfig();
  }
  return _config;
}

// Update config and clear cache
export function updateConfig(updates: Partial<Config>): Config {
  const config = { ...loadConfig(), ...updates };
  saveConfig(config);
  _config = config;
  return config;
}

// Ensure data directory exists (skip for in-memory)
if (DB_PATH !== ":memory:" && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Initialize schema
export function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT,
      frequency TEXT DEFAULT 'daily',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id),
      UNIQUE(habit_id, logged_at)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT,
      mood INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(logged_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date)`);
}

export function getDbPath(): string {
  return DB_PATH;
}
