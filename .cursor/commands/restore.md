# Restore Git & Database

Restore codebase and optionally Convex database from backup.

## Usage

```
/restore                          # HEAD + latest backup
/restore --commit <hash>          # specific commit
/restore --db <filename>          # specific backup
/restore --git-only               # git only
/restore --db-only [filename]     # database only
```

## Git Restore

```bash
git reset --hard HEAD   # or specific commit
git clean -fd
```

## Database Restore

```bash
latest_backup=$(ls -t ~/Downloads/snapshot_*.zip 2>/dev/null | head -n1)
pnpm dlx convex import --path "$latest_backup"
```

## Safety

- **Always ask for confirmation** before executing
- Show git status and what will be lost
- Verify backup file exists before import
- Destructive operation — uncommitted changes will be lost

## Recovery

- Git: `git reflog` to find previous state
- Database: re-import a different backup file
