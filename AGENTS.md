# AGENTS.md - How to Use habits-cli

Guide for AI agents to interact with the `habits` CLI.

## Philosophy

**You are the orchestrator, not the data janitor.**

Call CLI commands instead of parsing markdown. The database handles consistency; you handle natural language.

## Quick Reference

```bash
habits today --json       # check status
habits done 1,3           # log habits by number
habits mood 4             # set mood (1-5)
habits journal write "x"  # add journal entry
habits streak             # visual streaks
habits history            # monthly view
```

## Command Patterns

### Logging Habits

```bash
# Get habit numbers
habits list
# 1. 💪 Gym (daily)
# 2. 📖 Learning (daily)
# 3. 💊 Vitamins (daily)

# User: "did my workout and vitamins"
habits done 1,3
```

### Setting Mood

Infer from conversation:
- 1 = 😞 Very bad
- 2 = 😕 Not great
- 3 = 😐 Neutral
- 4 = 🙂 Good
- 5 = 😄 Great

```bash
habits mood 4
```

### Journal Entries

Capture meaningful events, not chatter:

```bash
habits journal write "Netflix interview went well"
```

### Checking Progress

```bash
habits today --json
habits streak --json
habits mood history 7 --json
```

## Date Handling

```bash
habits log gym --date 2026-02-02
habits mood 3 --date 2026-02-01
```

## Best Practices

1. **Check before logging**: `habits today --json`
2. **Use numbers**: `habits done 1,3,4` faster than names
3. **Infer don't ask**: User says "worked out" → just log it
4. **Journal sparingly**: Meaningful events only
5. **Set mood once daily**: End of day or when clear

## Data Location

- Database: `~/.habits/habits.db`
- No markdown to manage

## Example Agent Flow

```
User: "worked out today, feeling pretty good"

Agent:
$ habits done 1
$ habits mood 4
$ habits journal write "Completed workout, positive mood"

Response: "Nice! 💪 Logged. You're at a 2-day streak!"
```

## Installation

```bash
git clone https://github.com/vigneshrajsb/habits-cli.git
cd habits-cli && bun install && bun link
```

Requires Bun runtime.
