# CLAUDE.md

This is `life-cli` - a habit tracking and journaling CLI with SQLite backend.

## For Agents

Read **AGENTS.md** for complete usage instructions.

## Quick Commands

```bash
life today              # show today's status
life habits done 1,3    # log habits by number
life mood 4             # set mood (1-5)
life journal write "x"  # add journal entry
life habits streak      # visual streak (7 days)
life history            # monthly view
```

## Key Points

- Use `--json` for programmatic access
- Data lives in `~/.life/life.db`
- You orchestrate; the CLI manages data
