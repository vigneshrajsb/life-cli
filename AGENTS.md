# AGENTS.md - How to Use life-cli

This document explains how AI agents should interact with the `life` CLI for habit tracking and journaling.

## Philosophy

**You are the orchestrator, not the data janitor.**

Instead of parsing/editing markdown files, call CLI commands. The database handles consistency; you handle natural language.

## Quick Reference

```bash
# Check today's status
life today --json

# Log habits (user: "I worked out and took my vitamins")
life habits done 1,3

# Set mood (user seems happy)
life mood 4

# Journal entry
life journal write "User mentioned feeling good about interview prep"

# Check streaks
life habits streak           # all habits, 7 days
life habits streak gym 14    # specific habit, 14 days

# Mood history
life mood history 7          # last 7 days

# Monthly view
life history                 # current month
life history 0226            # Feb 2026 (mmyy format)
```

## Command Patterns

### Logging Habits

When user mentions completing habits, map to numbers and log:

```bash
# Get habit list first
life habits list
# Output:
# 1. 💪 Gym (daily)
# 2. 📖 Learning (daily)
# 3. 💊 Vitamins (daily)
# 4. 🌿 CBD (daily)

# User: "did my workout and vitamins"
life habits done 1,3
```

### Setting Mood

Infer mood from conversation context:
- 1 = 😞 Very bad / upset / frustrated
- 2 = 😕 Not great / stressed
- 3 = 😐 Neutral / okay
- 4 = 🙂 Good / happy
- 5 = 😄 Great / excited / thrilled

```bash
# User seems happy about interview progress
life mood 4
```

### Journal Entries

Capture significant moments, not every message:

```bash
# Good: Meaningful events
life journal write "Had Netflix interview, felt prepared. Waiting for results."

# Bad: Trivial
life journal write "User said hi"
```

### Checking Progress

Use `--json` for programmatic access:

```bash
# Quick status check
life today --json

# Parse and respond naturally
# "You've done 2/4 habits today (Learning, CBD). Mood not set yet."
```

## Date Handling

All commands accept `--date YYYY-MM-DD`:

```bash
# Log yesterday's forgotten habit
life habits log gym --date 2026-02-02

# Set mood for a past date
life mood 3 --date 2026-02-01
```

## JSON Output

All commands support `--json` for structured output:

```bash
life today --json
life habits streak --json
life mood history 7 --json
life history 0226 --json
```

## Best Practices

1. **Check before logging**: Run `life today --json` to see current state
2. **Use numbers for habits**: `life habits done 1,3,4` is faster than names
3. **Infer don't ask**: If user says "did my workout", just log it
4. **Journal sparingly**: Capture meaningful events, not chatter
5. **Set mood once daily**: Usually at end of day or when mood is clear

## Data Location

- Database: `~/.life/life.db`
- No markdown files to manage
- SQLite handles all persistence

## Error Handling

```bash
# Habit not found
life habits log nonexistent
# ❌ Habit not found: nonexistent

# Invalid mood
life mood 6
# Usage: life mood <1-5> [--date YYYY-MM-DD]
```

## Example Agent Flow

```
User: "worked out today, feeling pretty good about it"

Agent thinks:
1. User completed gym habit → life habits done 1
2. "feeling pretty good" → mood 4
3. Significant accomplishment → journal entry

Agent runs:
$ life habits done 1
$ life mood 4
$ life journal write "Completed workout, feeling positive"

Agent responds:
"Nice! 💪 Logged your workout. You're at a 2-day streak!"
```

## Adding New Habits

Only add habits when user explicitly requests:

```bash
life habits add "Meditation" --emoji 🧘
```

Don't auto-create habits from casual mentions.
