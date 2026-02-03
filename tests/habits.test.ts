import { describe, test, expect, beforeEach } from "bun:test";

// Set test mode BEFORE importing db
process.env.HABITS_TEST = "1";

import { db, initDb } from "../src/db";
import {
  addHabit,
  listHabits,
  getHabit,
  logHabit,
  unlogHabit,
  getLogsForDate,
  getStreak,
  deactivateHabit,
  activateHabit,
  updateHabit,
} from "../src/habits";

// Initialize db once
initDb();

// Clear before each test for isolation
beforeEach(() => {
  db.run("DELETE FROM habit_logs");
  db.run("DELETE FROM habits");
});

describe("addHabit", () => {
  test("adds a habit with name only", () => {
    const habit = addHabit("Exercise");
    
    expect(habit.id).toBeGreaterThan(0);
    expect(habit.name).toBe("Exercise");
    expect(habit.frequency).toBe("daily");
    expect(habit.active).toBe(1);
  });

  test("adds a habit with emoji", () => {
    const habit = addHabit("Meditate", "🧘");
    
    expect(habit.name).toBe("Meditate");
    expect(habit.emoji).toBe("🧘");
  });

  test("adds a habit with custom frequency", () => {
    const habit = addHabit("Weekly Review", "📝", "weekly");
    
    expect(habit.frequency).toBe("weekly");
  });
});

describe("listHabits", () => {
  test("lists active habits", () => {
    addHabit("Habit 1");
    addHabit("Habit 2");
    const habit3 = addHabit("Habit 3");
    deactivateHabit(habit3.id);

    const habits = listHabits();
    expect(habits.length).toBe(2);
  });

  test("includes inactive when requested", () => {
    addHabit("Habit 1");
    const habit2 = addHabit("Habit 2");
    deactivateHabit(habit2.id);

    const habits = listHabits(true);
    expect(habits.length).toBe(2);
  });
});

describe("getHabit", () => {
  test("gets habit by id", () => {
    const added = addHabit("Test Habit");
    const habit = getHabit(added.id);

    expect(habit).not.toBeNull();
    expect(habit!.id).toBe(added.id);
  });

  test("gets habit by name (case insensitive)", () => {
    addHabit("Reading");
    
    const habit = getHabit("reading");
    expect(habit).not.toBeNull();
    expect(habit!.name).toBe("Reading");
  });

  test("returns null for non-existent habit", () => {
    const habit = getHabit(99999);
    expect(habit).toBeNull();
  });
});

describe("logHabit / unlogHabit", () => {
  test("logs a habit for today", () => {
    const habit = addHabit("Exercise");
    
    const result = logHabit(habit.id);
    expect(result).toBe(true);

    const logs = getLogsForDate();
    const exerciseLog = logs.find(l => l.habit.id === habit.id);
    expect(exerciseLog?.logged).toBe(true);
  });

  test("logs a habit for specific date", () => {
    const habit = addHabit("Exercise");
    
    const result = logHabit(habit.id, "2026-01-15");
    expect(result).toBe(true);

    const logs = getLogsForDate("2026-01-15");
    const exerciseLog = logs.find(l => l.habit.id === habit.id);
    expect(exerciseLog?.logged).toBe(true);
  });

  test("unlogs a habit", () => {
    const habit = addHabit("Exercise");
    logHabit(habit.id, "2026-01-15");
    
    const result = unlogHabit(habit.id, "2026-01-15");
    expect(result).toBe(true);

    const logs = getLogsForDate("2026-01-15");
    const exerciseLog = logs.find(l => l.habit.id === habit.id);
    expect(exerciseLog?.logged).toBe(false);
  });

  test("returns false for non-existent habit", () => {
    expect(logHabit(99999)).toBe(false);
    expect(unlogHabit(99999)).toBe(false);
  });
});

describe("getLogsForDate", () => {
  test("returns all habits with log status", () => {
    const h1 = addHabit("Habit 1");
    const h2 = addHabit("Habit 2");
    logHabit(h1.id, "2026-01-15");

    const logs = getLogsForDate("2026-01-15");
    
    expect(logs.length).toBe(2);
    expect(logs.find(l => l.habit.id === h1.id)?.logged).toBe(true);
    expect(logs.find(l => l.habit.id === h2.id)?.logged).toBe(false);
  });
});

describe("getStreak", () => {
  test("returns 0 for no logs", () => {
    const habit = addHabit("Exercise");
    expect(getStreak(habit.id)).toBe(0);
  });

  test("calculates streak for consecutive days", () => {
    const habit = addHabit("Exercise");
    const today = new Date();
    
    // Log for today and past 2 days
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      logHabit(habit.id, date.toISOString().split("T")[0]);
    }

    expect(getStreak(habit.id)).toBe(3);
  });

  test("breaks streak on gap", () => {
    const habit = addHabit("Exercise");
    const today = new Date();
    
    // Log today
    logHabit(habit.id, today.toISOString().split("T")[0]);
    
    // Log 3 days ago (gap of 1 day)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    logHabit(habit.id, threeDaysAgo.toISOString().split("T")[0]);

    expect(getStreak(habit.id)).toBe(1);
  });
});

describe("deactivateHabit / activateHabit", () => {
  test("deactivates a habit", () => {
    const habit = addHabit("Exercise");
    
    deactivateHabit(habit.id);
    
    const updated = getHabit(habit.id);
    expect(updated!.active).toBe(0);
  });

  test("activates a habit", () => {
    const habit = addHabit("Exercise");
    deactivateHabit(habit.id);
    
    activateHabit(habit.id);
    
    const updated = getHabit(habit.id);
    expect(updated!.active).toBe(1);
  });
});

describe("updateHabit", () => {
  test("updates habit name", () => {
    const habit = addHabit("Old Name");
    
    updateHabit(habit.id, { name: "New Name" });
    
    const updated = getHabit(habit.id);
    expect(updated!.name).toBe("New Name");
  });

  test("updates habit emoji", () => {
    const habit = addHabit("Exercise");
    
    updateHabit(habit.id, { emoji: "💪" });
    
    const updated = getHabit(habit.id);
    expect(updated!.emoji).toBe("💪");
  });
});
