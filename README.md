# life-cli 🦊

A simple CLI for tracking habits and journaling, built with Bun and SQLite.

## Installation

```bash
# Clone the repo
git clone https://github.com/vigneshrajsb/life-cli.git
cd life-cli

# Install and link globally
bun install
bun link
```

## Usage

### Daily Overview

```bash
# Show today's habits, mood, and journal
life today

# Show last 7 days
life week

# Show monthly history
life history           # current month
life history 0226      # February 2026 (mmyy format)
```

### Habits

```bash
# Add a habit
life habits add "Workout" --emoji 💪
life habits add "Reading" --emoji 📖

# List habits
life habits list

# Log habits (by name or number)
life habits log workout
life habits log 1

# Log multiple at once
life habits done 1,2,4

# Check streaks (visual!)
life habits streak             # all habits, 7 days
life habits streak 14          # all habits, 14 days
life habits streak workout     # single habit, 7 days
life habits streak workout 30  # single habit, 30 days

# Deactivate/reactivate
life habits deactivate workout
life habits activate workout
```

### Journal

```bash
# Write to today's journal (appends)
life journal write "Had a productive day"

# Read today's journal
life journal read

# Read last N entries
life journal read --last 7

# Search journal
life journal search "productive"
```

### Mood

```bash
# Set mood (1-5)
life mood 4

# Mood scale:
# 1 = 😞  2 = 😕  3 = 😐  4 = 🙂  5 = 😄

# View mood history
life mood history      # last 7 days
life mood history 30   # last 30 days
```

### Options

```bash
# Specify a different date
life habits log workout --date 2026-02-01
life journal write "note" --date 2026-02-01
life mood 3 --date 2026-02-01

# JSON output (for scripting/agents)
life today --json
life habits list --json
life habits streak --json
life week --json
```

## Data Storage

Data is stored in `~/.life/life.db` (SQLite).

```bash
# Show database path
life db
```

## AI Agent Integration

See **AGENTS.md** for detailed instructions on how AI agents should use this CLI.

Quick example:
```bash
# Agent checks today's status
life today --json

# Agent logs habits from natural language
life habits done 1,3  # "I worked out and took vitamins"

# Agent updates journal
life journal write "User mentioned feeling good about interview prep"

# Agent sets mood from conversation context
life mood 4
```

## Development

```bash
# Run directly
bun run src/index.ts today

# Build standalone binary
bun run build
./dist/life today
```

## License

MIT
