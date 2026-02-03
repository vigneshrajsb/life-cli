#!/usr/bin/env bun
import { parseArgs } from "util";
import { initDb, getDbPath } from "./db";
import * as habits from "./habits";
import * as journal from "./journal";

// Initialize database on startup
initDb();

const HELP = `
life - CLI for habits and journal tracking

USAGE:
  life <command> [options]

COMMANDS:
  today                     Show today's habits, mood, and journal
  
  habits list               List all active habits
  habits add <name>         Add a new habit (--emoji, --frequency)
  habits log <name|num>     Log a habit as done (--date, --notes)
  habits unlog <name|num>   Remove a habit log (--date)
  habits done <1,2,3>       Log multiple habits by number
  habits streak <name>      Show streak for a habit
  habits deactivate <name>  Deactivate a habit
  habits activate <name>    Reactivate a habit
  
  journal write "text"      Add to today's journal (--date)
  journal read              Read today's journal (--date, --last N)
  journal search "query"    Search journal entries
  
  mood <1-5>                Set today's mood (--date)
  
  week                      Show last 7 days summary
  db                        Show database path

OPTIONS:
  --json                    Output as JSON
  --date YYYY-MM-DD         Specify date (default: today)
  --help, -h                Show this help

EXAMPLES:
  life today
  life habits add "Workout" --emoji 💪
  life habits done 1,3,4
  life mood 4
  life journal write "Had a productive day"
`;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function showToday(asJson: boolean, date?: string) {
  const targetDate = date || new Date().toISOString().split("T")[0];
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
  const today = new Date();
  const days: any[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
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

  // Get all habits for header
  const allHabits = habits.listHabits();
  
  console.log("\n📊 Last 7 Days\n");
  
  // Header
  const header = ["Date", ...allHabits.map((h) => h.emoji || h.name.slice(0, 3)), "Mood"];
  console.log(header.join("\t"));
  console.log("-".repeat(50));

  for (const day of days) {
    const dateShort = formatDate(day.date);
    const checks = day.habits.map((h: any) => (h.logged ? "✅" : "⬜"));
    const mood = day.mood ? journal.moodToEmoji(day.mood) : "—";
    console.log([dateShort, ...checks, mood].join("\t"));
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

    case "db":
      console.log(getDbPath());
      break;

    case "habits":
      switch (subcommand) {
        case "list": {
          const list = habits.listHabits();
          if (asJson) {
            console.log(JSON.stringify(list, null, 2));
          } else {
            if (list.length === 0) {
              console.log("No habits configured. Add one with: life habits add <name>");
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
          const name = positionals[2];
          if (!name) {
            console.error("Usage: life habits add <name> [--emoji X] [--frequency daily|weekly]");
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
          const target = positionals[2];
          if (!target) {
            console.error("Usage: life habits log <name|number> [--date YYYY-MM-DD] [--notes text]");
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
          const target = positionals[2];
          if (!target) {
            console.error("Usage: life habits unlog <name|number> [--date YYYY-MM-DD]");
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
          const nums = positionals[2];
          if (!nums) {
            console.error("Usage: life habits done <1,2,3>");
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
          const target = positionals[2];
          if (!target) {
            console.error("Usage: life habits streak <name>");
            process.exit(1);
          }
          const streak = habits.getStreak(target);
          const habit = habits.getHabit(target);
          if (asJson) {
            console.log(JSON.stringify({ habit: habit?.name, streak }));
          } else if (habit) {
            console.log(`🔥 ${habit.emoji || ""} ${habit.name}: ${streak} day streak`);
          } else {
            console.error(`❌ Habit not found: ${target}`);
            process.exit(1);
          }
          break;
        }

        case "deactivate": {
          const target = positionals[2];
          if (!target) {
            console.error("Usage: life habits deactivate <name>");
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
          const target = positionals[2];
          if (!target) {
            console.error("Usage: life habits activate <name>");
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

        default:
          console.error(`Unknown habits subcommand: ${subcommand}`);
          console.log("Available: list, add, log, unlog, done, streak, deactivate, activate");
          process.exit(1);
      }
      break;

    case "journal":
      switch (subcommand) {
        case "write": {
          const content = positionals.slice(2).join(" ");
          if (!content) {
            console.error("Usage: life journal write <text> [--date YYYY-MM-DD]");
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
            console.error("Usage: life journal search <query>");
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

    case "mood": {
      const moodVal = parseInt(positionals[1], 10);
      if (isNaN(moodVal) || moodVal < 1 || moodVal > 5) {
        console.error("Usage: life mood <1-5> [--date YYYY-MM-DD]");
        console.log("  1 = 😞  2 = 😕  3 = 😐  4 = 🙂  5 = 😄");
        process.exit(1);
      }
      const entry = journal.setMood(moodVal, date);
      if (asJson) {
        console.log(JSON.stringify(entry, null, 2));
      } else {
        console.log(`✅ Mood set: ${moodVal} ${journal.moodToEmoji(moodVal)}`);
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
