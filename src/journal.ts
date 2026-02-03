import { db } from "./db";

export interface JournalEntry {
  id: number;
  date: string;
  content: string | null;
  mood: number | null;
  updated_at: string;
}

// Mood emoji mapping
export const MOOD_EMOJIS: Record<number, string> = {
  1: "😞",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};

export function moodToEmoji(mood: number | null): string {
  if (mood === null) return "";
  return MOOD_EMOJIS[mood] || "";
}

// Get today's date in YYYY-MM-DD format
function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getEntry(date?: string): JournalEntry | null {
  const targetDate = date || today();
  const stmt = db.prepare("SELECT * FROM journal WHERE date = ?");
  return stmt.get(targetDate) as JournalEntry | null;
}

export function writeJournal(content: string, date?: string): JournalEntry {
  const targetDate = date || today();
  const existing = getEntry(targetDate);

  if (existing) {
    // Append to existing content
    const newContent = existing.content
      ? `${existing.content}\n\n${content}`
      : content;
    db.prepare(
      "UPDATE journal SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?"
    ).run(newContent, targetDate);
  } else {
    db.prepare(
      "INSERT INTO journal (date, content) VALUES (?, ?)"
    ).run(targetDate, content);
  }

  return getEntry(targetDate)!;
}

export function setMood(mood: number, date?: string): JournalEntry {
  if (mood < 1 || mood > 5) {
    throw new Error("Mood must be between 1 and 5");
  }

  const targetDate = date || today();
  const existing = getEntry(targetDate);

  if (existing) {
    db.prepare(
      "UPDATE journal SET mood = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?"
    ).run(mood, targetDate);
  } else {
    db.prepare("INSERT INTO journal (date, mood) VALUES (?, ?)").run(
      targetDate,
      mood
    );
  }

  return getEntry(targetDate)!;
}

export function replaceJournal(content: string, date?: string): JournalEntry {
  const targetDate = date || today();
  const existing = getEntry(targetDate);

  if (existing) {
    db.prepare(
      "UPDATE journal SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?"
    ).run(content, targetDate);
  } else {
    db.prepare("INSERT INTO journal (date, content) VALUES (?, ?)").run(
      targetDate,
      content
    );
  }

  return getEntry(targetDate)!;
}

export function getRecentEntries(limit: number = 7): JournalEntry[] {
  return db
    .query("SELECT * FROM journal ORDER BY date DESC LIMIT ?")
    .all(limit) as JournalEntry[];
}

export function searchJournal(query: string, limit: number = 10): JournalEntry[] {
  // Simple LIKE search - could upgrade to FTS later
  return db
    .query(
      "SELECT * FROM journal WHERE content LIKE ? ORDER BY date DESC LIMIT ?"
    )
    .all(`%${query}%`, limit) as JournalEntry[];
}

export function getEntriesInRange(startDate: string, endDate: string): JournalEntry[] {
  return db
    .query("SELECT * FROM journal WHERE date >= ? AND date <= ? ORDER BY date")
    .all(startDate, endDate) as JournalEntry[];
}
