# habits-cli 🦊

A simple CLI for tracking habits and journaling, built with Bun and SQLite.

## Installation

```bash
git clone https://github.com/vigneshrajsb/habits-cli.git
cd habits-cli
bun install
bun link
```

## Usage

### Daily Overview

```bash
habits today              # today's habits, mood, journal
habits week               # last 7 days
habits history            # current month
habits history 0226       # Feb 2026 (mmyy format)
```

### Habits

```bash
habits add "Workout" --emoji 💪
habits list
habits log workout        # by name
habits log 1              # by number
habits done 1,2,4         # multiple at once
habits unlog 1            # remove log

# Streaks (visual!)
habits streak             # all habits, 7 days
habits streak 14          # all habits, 14 days  
habits streak gym         # single habit, 7 days
habits streak gym 30      # single habit, 30 days

habits deactivate workout
habits activate workout
```

### Journal

```bash
habits journal write "Had a great day"
habits journal read
habits journal read --last 7
habits journal search "interview"
```

### Mood

```bash
habits mood 4             # 1=😞 2=😕 3=😐 4=🙂 5=😄
habits mood history       # last 7 days
habits mood history 30    # last 30 days
```

### Options

```bash
--date YYYY-MM-DD         # specify date
--json                    # JSON output
```

## Data Storage

Data stored in `~/.habits/habits.db` (SQLite).

```bash
habits db                 # show path
```

## AI Agent Integration

See **AGENTS.md** for detailed agent usage.

## License

MIT
