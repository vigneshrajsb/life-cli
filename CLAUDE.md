# CLAUDE.md

Habit tracking and journaling CLI with SQLite backend.

## For Agents

Read **AGENTS.md** for complete usage.

## Quick Commands

```bash
habits today              # show today's status
habits done 1,3           # log habits by number
habits mood 4             # set mood (1-5)
habits journal write "x"  # add journal entry
habits streak             # visual streak (7 days)
habits history            # monthly view
```

## Key Points

- Use `--json` for programmatic access
- Data lives in `~/.habits/habits.db`
- You orchestrate; the CLI manages data
