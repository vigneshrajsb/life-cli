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

## First-Time Setup (Onboarding Users)

When a user first uses habits tracking, walk them through setup:

### 1. Explain the System

> "I use a habit tracker with a local SQLite database (`~/.habits/habits.db`). 
> Your data stays on your machine — nothing is sent anywhere.
> 
> I can track daily habits, journal entries, and mood. You tell me what you did, I log it. Simple."

### 2. Ask What Habits to Track

> "What habits do you want to track? Common ones:
> - 💪 Gym / Workout
> - 📖 Reading / Learning
> - 🧘 Meditation
> - 💊 Vitamins / Medication
> - 💧 Water intake
> - 🛏️ Sleep before midnight
> 
> Tell me what matters to you and I'll set them up."

### 3. Set Up Habits

```bash
# For each habit the user mentions
habits add "Workout" --emoji 💪
habits add "Reading" --emoji 📖
```

### 4. Explain Daily Usage

> "Each day, just tell me what you did:
> - 'Did my workout' → I log it
> - 'Feeling good today' → I set your mood
> - 'Had a productive day' → I add a journal entry
> 
> Ask 'how are my habits?' anytime to see your streaks."

## Database Info

- **Location**: `~/.habits/habits.db`
- **Format**: SQLite (portable, queryable)
- **Backup**: Copy the file to back up all data
- **Privacy**: Local only, never transmitted

To show the user their DB path:
```bash
habits db
# /home/user/.habits/habits.db
```

## Installation

```bash
git clone https://github.com/vigneshrajsb/habits-cli.git
cd habits-cli && bun install && bun link
```

Requires Bun runtime.
