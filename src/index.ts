#!/usr/bin/env bun
import { parseArgs } from "util";
import { initDb, getDbPath } from "./db";
import * as habits from "./habits";
import * as journal from "./journal";

// Initialize database on startup
initDb();

const HELP = `
habits - CLI for habit tracking and journaling

USAGE:
  habits <command> [options]

COMMANDS:
  today                     Show today's habits, mood, and journal
  week                      Show last 7 days summary
  history [mmyy]            Show monthly history (default: current month)
  
  list                      List all active habits
  add <name>                Add a new habit (--emoji, --frequency)
  log <name|num>            Log a habit as done (--date, --notes)
  unlog <name|num>          Remove a habit log (--date)
  done <1,2,3>              Log multiple habits by number
  streak [name] [N]         Show streak visual (default: all habits, 7 days)
  deactivate <name>         Deactivate a habit
  activate <name>           Reactivate a habit
  
  journal write "text"      Add to today's journal (--date)
  journal read              Read today's journal (--date, --last N)
  journal search "query"    Search journal entries
  
  mood <1-5>                Set today's mood (--date)
  mood history [N]          Show mood history (default: 7 days)
  
  db                        Show database path

OPTIONS:
  --json                    Output as JSON
  --date YYYY-MM-DD         Specify date (default: today)
  --help, -h                Show this help

EXAMPLES:
  habits today
  habits add "Workout" --emoji 💪
  habits done 1,3,4
  habits streak gym 14
  habits mood 4
  habits journal write "Great day"
`;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

function showToday(asJson: boolean, date?: string) {
  const targetDate = date || today();
  const habitLogs = habits.getLogsForDate(targetDate);
  const entry = journal.getEntry(targetDate);

  if (asJson) {
    console.log(JSON.stringify({
      date: targetDate,
      habits: habitLogs.map((h, i) => ({
        num: i + 1,
        name: h.habit.name,
        emoji: h.habit.emoji,
        logged: h.logged,
        notes: h.notes,
      })),
      mood: entry?.mood || null,
      moodEmoji: journal.moodToEmoji(entry?.mood || null),
      journal: entry?.content || null,
    }, null, 2));
    return;
  }

  console.log(`\n📅 ${formatDate(targetDate)}\n`);
  
  console.log("Habits:");
  if (habitLogs.length === 0) {
    console.log("  (no habits configured)");
  } else {
    habitLogs.forEach((h, i) => {
      const check = h.logged ? "✅" : "⬜";
      const emoji = h.habit.emoji || "•";
      console.log(`  ${i + 1}. ${emoji} ${h.habit.name} ${check}`);
    });
  }

  console.log("");
  const moodStr = entry?.mood ? `${entry.mood} ${journal.moodToEmoji(entry.mood)}` : "(not set)";
  console.log(`Mood: ${moodStr}`);
  
  console.log("");
  console.log(`Journal: ${entry?.content || "(empty)"}`);
  console.log("");
}

function showWeek(asJson: boolean) {
  showDaysHistory(7, asJson);
}

function showDaysHistory(numDays: number, asJson: boolean) {
  const days: any[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const dateStr = getDaysAgo(i);
    const habitLogs = habits.getLogsForDate(dateStr);
    const entry = journal.getEntry(dateStr);

    days.push({
      date: dateStr,
      habits: habitLogs.map((h) => ({
        name: h.habit.name,
        emoji: h.habit.emoji,
        logged: h.logged,
      })),
      mood: entry?.mood || null,
      journal: entry?.content || null,
    });
  }

  if (asJson) {
    console.log(JSON.stringify(days, null, 2));
    return;
  }

  const allHabits = habits.listHabits();
  
  console.log(`\n📊 Last ${numDays} Days\n`);
  
  const header = ["Date", ...allHabits.map((h) => h.emoji || h.name.slice(0, 3)), "Mood"];
  console.log(header.join("\t"));
  console.log("-".repeat(50));

  for (const day of days) {
    const dateShort = formatDateShort(day.date);
    const checks = day.habits.map((h: any) => (h.logged ? "✅" : "⬜"));
    const mood = day.mood ? journal.moodToEmoji(day.mood) : "—";
    console.log([dateShort, ...checks, mood].join("\t"));
  }
  console.log("");
}

function showHabitStreak(habitName: string | null, numDays: number, asJson: boolean) {
  const targetHabits = habitName 
    ? [habits.getHabit(habitName)].filter(Boolean) as habits.Habit[]
    : habits.listHabits();

  if (targetHabits.length === 0) {
    console.error(habitName ? `❌ Habit not found: ${habitName}` : "No habits configured.");
    process.exit(1);
  }

  const results: any[] = [];

  for (const habit of targetHabits) {
    const streak = habits.getStreak(habit.id);
    const days: { date: string; logged: boolean }[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const dateStr = getDaysAgo(i);
      const logs = habits.getLogsForDate(dateStr);
      const habitLog = logs.find((l) => l.habit.id === habit.id);
      days.push({ date: dateStr, logged: habitLog?.logged || false });
    }

    results.push({
      habit: habit.name,
      emoji: habit.emoji,
      currentStreak: streak,
      days,
    });
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`\n🔥 Habit Streaks (last ${numDays} days)\n`);

  for (const r of results) {
    const visual = r.days.map((d: any) => (d.logged ? "✅" : "⬜")).join("");
    const emoji = r.emoji || "•";
    console.log(`${emoji} ${r.habit}: ${visual} (${r.currentStreak} day streak)`);
  }
  console.log("");
}

function showMoodHistory(numDays: number, asJson: boolean) {
  const days: { date: string; mood: number | null; emoji: string }[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const dateStr = getDaysAgo(i);
    const entry = journal.getEntry(dateStr);
    days.push({
      date: dateStr,
      mood: entry?.mood || null,
      emoji: journal.moodToEmoji(entry?.mood || null) || "—",
    });
  }

  if (asJson) {
    console.log(JSON.stringify(days, null, 2));
    return;
  }

  console.log(`\n😊 Mood History (last ${numDays} days)\n`);
  
  const visual = days.map((d) => d.emoji).join(" ");
  console.log(visual);
  console.log("");

  const start = formatDateShort(days[0]!.date);
  const end = formatDateShort(days[days.length - 1]!.date);
  console.log(`${start} → ${end}`);
  
  const moodsWithValues = days.filter((d) => d.mood !== null);
  if (moodsWithValues.length > 0) {
    const avg = moodsWithValues.reduce((sum, d) => sum + (d.mood || 0), 0) / moodsWithValues.length;
    console.log(`Average: ${avg.toFixed(1)} ${journal.moodToEmoji(Math.round(avg))}`);
  }
  console.log("");
}

function showMonthHistory(mmyy: string | null, asJson: boolean) {
  let year: number, month: number;

  if (mmyy) {
    if (mmyy.length !== 4) {
      console.error("Format: mmyy (e.g., 0226 for Feb 2026)");
      process.exit(1);
    }
    month = parseInt(mmyy.slice(0, 2), 10);
    year = 2000 + parseInt(mmyy.slice(2, 4), 10);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const allHabits = habits.listHabits();
  const days: any[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const habitLogs = habits.getLogsForDate(dateStr);
    const entry = journal.getEntry(dateStr);

    days.push({
      date: dateStr,
      day,
      habits: habitLogs.map((h) => ({
        name: h.habit.name,
        emoji: h.habit.emoji,
        logged: h.logged,
      })),
      mood: entry?.mood || null,
      journal: entry?.content || null,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ year, month, days }, null, 2));
    return;
  }

  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  console.log(`\n📅 ${monthName}\n`);

  const header = ["Day", ...allHabits.map((h) => h.emoji || h.name.slice(0, 3)), "Mood"];
  console.log(header.join("\t"));
  console.log("-".repeat(50));

  for (const d of days) {
    const checks = d.habits.map((h: any) => (h.logged ? "✅" : "⬜"));
    const mood = d.mood ? journal.moodToEmoji(d.mood) : "—";
    console.log([String(d.day).padStart(2), ...checks, mood].join("\t"));
  }
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    return;
  }

  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
      date: { type: "string" },
      emoji: { type: "string" },
      frequency: { type: "string", default: "daily" },
      notes: { type: "string" },
      last: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  const asJson = values.json as boolean;
  const date = values.date as string | undefined;
  const command = positionals[0];
  const subcommand = positionals[1];

  switch (command) {
    case "today":
      showToday(asJson, date);
      break;

    case "week":
      showWeek(asJson);
      break;

    case "history": {
      const mmyy = positionals[1] || null;
      showMonthHistory(mmyy, asJson);
      break;
    }

    case "db":
      console.log(getDbPath());
      break;

    // Habit commands (flattened)
    case "list": {
      const list = habits.listHabits();
      if (asJson) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        if (list.length === 0) {
          console.log("No habits configured. Add one with: habits add <name>");
        } else {
          list.forEach((h, i) => {
            const emoji = h.emoji || "•";
            console.log(`${i + 1}. ${emoji} ${h.name} (${h.frequency})`);
          });
        }
      }
      break;
    }

    case "add": {
      const name = positionals[1];
      if (!name) {
        console.error("Usage: habits add <name> [--emoji X] [--frequency daily|weekly]");
        process.exit(1);
      }
      const habit = habits.addHabit(name, values.emoji as string, values.frequency as string);
      if (asJson) {
        console.log(JSON.stringify(habit, null, 2));
      } else {
        console.log(`✅ Added habit: ${habit.emoji || ""} ${habit.name}`);
      }
      break;
    }

    case "log": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: habits log <name|number> [--date YYYY-MM-DD] [--notes text]");
        process.exit(1);
      }
      const success = habits.logHabit(target, date, values.notes as string);
      if (asJson) {
        console.log(JSON.stringify({ success, habit: target, date: date || "today" }));
      } else if (success) {
        console.log(`✅ Logged: ${target}`);
      } else {
        console.error(`❌ Habit not found: ${target}`);
        process.exit(1);
      }
      break;
    }

    case "unlog": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: habits unlog <name|number> [--date YYYY-MM-DD]");
        process.exit(1);
      }
      const success = habits.unlogHabit(target, date);
      if (asJson) {
        console.log(JSON.stringify({ success, habit: target }));
      } else if (success) {
        console.log(`✅ Unlogged: ${target}`);
      } else {
        console.error(`❌ Habit not found: ${target}`);
        process.exit(1);
      }
      break;
    }

    case "done": {
      const nums = positionals[1];
      if (!nums) {
        console.error("Usage: habits done <1,2,3>");
        process.exit(1);
      }
      const indices = nums.split(",").map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
      const result = habits.logMultiple(indices, date);
      if (asJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.logged.length > 0) {
          console.log(`✅ Logged: ${result.logged.join(", ")}`);
        }
        if (result.failed.length > 0) {
          console.log(`❌ Failed: ${result.failed.join(", ")}`);
        }
      }
      break;
    }

    case "streak": {
      let habitName: string | null = null;
      let numDays = 7;

      const arg1 = positionals[1];
      const arg2 = positionals[2];

      if (arg1) {
        const maybeNum = parseInt(arg1, 10);
        if (!isNaN(maybeNum)) {
          numDays = maybeNum;
        } else {
          habitName = arg1;
          if (arg2) {
            numDays = parseInt(arg2, 10) || 7;
          }
        }
      }

      showHabitStreak(habitName, numDays, asJson);
      break;
    }

    case "deactivate": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: habits deactivate <name>");
        process.exit(1);
      }
      const success = habits.deactivateHabit(target);
      if (asJson) {
        console.log(JSON.stringify({ success, habit: target }));
      } else if (success) {
        console.log(`✅ Deactivated: ${target}`);
      } else {
        console.error(`❌ Habit not found: ${target}`);
        process.exit(1);
      }
      break;
    }

    case "activate": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: habits activate <name>");
        process.exit(1);
      }
      const success = habits.activateHabit(target);
      if (asJson) {
        console.log(JSON.stringify({ success, habit: target }));
      } else if (success) {
        console.log(`✅ Activated: ${target}`);
      } else {
        console.error(`❌ Habit not found: ${target}`);
        process.exit(1);
      }
      break;
    }

    // Journal commands
    case "journal":
      switch (subcommand) {
        case "write": {
          const content = positionals.slice(2).join(" ");
          if (!content) {
            console.error("Usage: habits journal write <text> [--date YYYY-MM-DD]");
            process.exit(1);
          }
          const entry = journal.writeJournal(content, date);
          if (asJson) {
            console.log(JSON.stringify(entry, null, 2));
          } else {
            console.log(`✅ Journal updated for ${entry.date}`);
          }
          break;
        }

        case "read": {
          const last = values.last ? parseInt(values.last as string, 10) : undefined;
          if (last) {
            const entries = journal.getRecentEntries(last);
            if (asJson) {
              console.log(JSON.stringify(entries, null, 2));
            } else {
              entries.forEach((e) => {
                const mood = e.mood ? ` ${journal.moodToEmoji(e.mood)}` : "";
                console.log(`\n📅 ${formatDate(e.date)}${mood}`);
                console.log(e.content || "(empty)");
              });
            }
          } else {
            const entry = journal.getEntry(date);
            if (asJson) {
              console.log(JSON.stringify(entry, null, 2));
            } else if (entry) {
              const mood = entry.mood ? ` ${journal.moodToEmoji(entry.mood)}` : "";
              console.log(`\n📅 ${formatDate(entry.date)}${mood}`);
              console.log(entry.content || "(empty)");
            } else {
              console.log("No journal entry for this date.");
            }
          }
          break;
        }

        case "search": {
          const query = positionals.slice(2).join(" ");
          if (!query) {
            console.error("Usage: habits journal search <query>");
            process.exit(1);
          }
          const results = journal.searchJournal(query);
          if (asJson) {
            console.log(JSON.stringify(results, null, 2));
          } else {
            if (results.length === 0) {
              console.log("No matching entries found.");
            } else {
              results.forEach((e) => {
                console.log(`\n📅 ${formatDate(e.date)}`);
                console.log(e.content?.slice(0, 100) + (e.content && e.content.length > 100 ? "..." : ""));
              });
            }
          }
          break;
        }

        default:
          console.error(`Unknown journal subcommand: ${subcommand}`);
          console.log("Available: write, read, search");
          process.exit(1);
      }
      break;

    // Mood commands
    case "mood": {
      if (subcommand === "history") {
        const numDays = positionals[2] ? parseInt(positionals[2], 10) : 7;
        showMoodHistory(numDays, asJson);
      } else {
        const moodVal = parseInt(positionals[1] ?? "", 10);
        if (isNaN(moodVal) || moodVal < 1 || moodVal > 5) {
          console.error("Usage: habits mood <1-5> [--date YYYY-MM-DD]");
          console.error("       habits mood history [days]");
          console.log("  1 = 😞  2 = 😕  3 = 😐  4 = 🙂  5 = 😄");
          process.exit(1);
        }
        const entry = journal.setMood(moodVal, date);
        if (asJson) {
          console.log(JSON.stringify(entry, null, 2));
        } else {
          console.log(`✅ Mood set: ${moodVal} ${journal.moodToEmoji(moodVal)}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
