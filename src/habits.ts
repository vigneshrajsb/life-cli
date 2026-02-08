import { db, getConfig } from "./db";

export interface Habit {
  id: number;
  name: string;
  emoji: string | null;
  frequency: string;
  active: number;
  created_at: string;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  logged_at: string;
  notes: string | null;
}

// Get today's date in YYYY-MM-DD format (uses configured timezone)
function today(): string {
  const config = getConfig();
  const now = new Date();
  
  if (config.timezone) {
    // Use Intl to get date parts in the configured timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-CA format gives us YYYY-MM-DD
    return formatter.format(now);
  }
  
  // Fallback: use local system time (not UTC)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addHabit(name: string, emoji?: string, frequency: string = "daily"): Habit {
  const stmt = db.prepare(
    "INSERT INTO habits (name, emoji, frequency) VALUES (?, ?, ?) RETURNING *"
  );
  return stmt.get(name, emoji || null, frequency) as Habit;
}

export function listHabits(includeInactive: boolean = false): Habit[] {
  const query = includeInactive
    ? "SELECT * FROM habits ORDER BY created_at"
    : "SELECT * FROM habits WHERE active = 1 ORDER BY created_at";
  return db.query(query).all() as Habit[];
}

export function getHabit(nameOrId: string | number): Habit | null {
  const stmt = db.prepare(
    "SELECT * FROM habits WHERE id = ? OR LOWER(name) = LOWER(?)"
  );
  return stmt.get(nameOrId, nameOrId) as Habit | null;
}

export function logHabit(nameOrId: string | number, date?: string, notes?: string): boolean {
  const habit = getHabit(nameOrId);
  if (!habit) return false;

  const logDate = date || today();
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO habit_logs (habit_id, logged_at, notes) VALUES (?, ?, ?)"
  );
  stmt.run(habit.id, logDate, notes || null);
  return true;
}

export function unlogHabit(nameOrId: string | number, date?: string): boolean {
  const habit = getHabit(nameOrId);
  if (!habit) return false;

  const logDate = date || today();
  const stmt = db.prepare("DELETE FROM habit_logs WHERE habit_id = ? AND logged_at = ?");
  stmt.run(habit.id, logDate);
  return true;
}

export function getLogsForDate(date?: string): { habit: Habit; logged: boolean; notes: string | null }[] {
  const targetDate = date || today();
  const habits = listHabits();
  
  const logStmt = db.prepare(
    "SELECT * FROM habit_logs WHERE habit_id = ? AND logged_at = ?"
  );

  return habits.map((habit) => {
    const log = logStmt.get(habit.id, targetDate) as HabitLog | null;
    return {
      habit,
      logged: !!log,
      notes: log?.notes || null,
    };
  });
}

export function logMultiple(indices: number[], date?: string): { logged: string[]; failed: string[] } {
  const habits = listHabits();
  const logged: string[] = [];
  const failed: string[] = [];

  for (const idx of indices) {
    if (idx >= 1 && idx <= habits.length) {
      const habit = habits[idx - 1]!;
      if (logHabit(habit.id, date)) {
        logged.push(habit.name);
      } else {
        failed.push(habit.name);
      }
    }
  }

  return { logged, failed };
}

// Helper to get date string N days ago in configured timezone
function getDateOffset(daysAgo: number): string {
  const config = getConfig();
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  
  if (config.timezone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now);
  }
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStreak(nameOrId: string | number): number {
  const habit = getHabit(nameOrId);
  if (!habit) return 0;

  const logs = db.query(
    "SELECT logged_at FROM habit_logs WHERE habit_id = ? ORDER BY logged_at DESC"
  ).all(habit.id) as { logged_at: string }[];

  if (logs.length === 0) return 0;

  let streak = 0;
  const todayStr = getDateOffset(0);
  
  // Check if today is logged, if not start from yesterday
  let daysBack = logs[0]!.logged_at === todayStr ? 0 : 1;

  for (const log of logs) {
    const expectedDate = getDateOffset(daysBack);
    if (log.logged_at === expectedDate) {
      streak++;
      daysBack++;
    } else if (log.logged_at < expectedDate) {
      break;
    }
  }

  return streak;
}

export function deactivateHabit(nameOrId: string | number): boolean {
  const habit = getHabit(nameOrId);
  if (!habit) return false;

  db.prepare("UPDATE habits SET active = 0 WHERE id = ?").run(habit.id);
  return true;
}

export function activateHabit(nameOrId: string | number): boolean {
  const habit = getHabit(nameOrId);
  if (!habit) return false;

  db.prepare("UPDATE habits SET active = 1 WHERE id = ?").run(habit.id);
  return true;
}

export function updateHabit(nameOrId: string | number, updates: { name?: string; emoji?: string }): boolean {
  const habit = getHabit(nameOrId);
  if (!habit) return false;

  if (updates.name) {
    db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(updates.name, habit.id);
  }
  if (updates.emoji) {
    db.prepare("UPDATE habits SET emoji = ? WHERE id = ?").run(updates.emoji, habit.id);
  }
  return true;
}
