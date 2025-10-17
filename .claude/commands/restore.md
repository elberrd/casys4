# Restore Command

## Git & Database Restore Workflow

Restore the codebase to a previous git commit and optionally restore the Convex database from a backup file.

## Usage

```bash
# Restore to last commit (HEAD) and latest database backup
/restore

# Restore to specific commit hash and latest database backup
/restore --commit <commit-hash>

# Restore to last commit and specific database backup file
/restore --db <backup-filename>

# Restore to specific commit and specific database backup
/restore --commit <commit-hash> --db <backup-filename>

# Git restore only (no database restore)
/restore --git-only

# Database restore only (no git restore)
/restore --db-only [backup-filename]
```

## Implementation

### Git Restore

```bash
# Default: Reset to HEAD (last commit)
git reset --hard HEAD

# Specific commit: Reset to given commit hash
git reset --hard <commit-hash>

# Clean untracked files and directories
git clean -fd
```

### Database Restore

```bash
# Find latest backup in Downloads folder
latest_backup=$(ls -t ~/Downloads/snapshot_laudable-horse-140_*.zip 2>/dev/null | head -n1)

# Use specific backup file if provided
backup_file="~/Downloads/<backup-filename>"

# Import the backup to Convex
pnpm dlx convex import --path "$backup_file"
```

## Safety Features

1. **Confirmation Prompt**: Always ask for user confirmation before executing restore operations
2. **Backup Current State**: Create automatic backup before restore (optional)
3. **Status Check**: Verify git status and show what will be lost
4. **File Validation**: Ensure backup file exists before attempting restore

## Example Workflow

```bash
# Check current status
git status
git log --oneline -5

# List available backups
ls -t ~/Downloads/snapshot_laudable-horse-140_*.zip

# Confirm restore operation
echo "WARNING: This will reset all uncommitted changes!"
echo "Git will be reset to: HEAD"
echo "Database will be restored from: latest backup"
read -p "Continue? (y/N): " confirm

# Execute restore
if [[ $confirm == [yY] ]]; then
    # Git restore
    git reset --hard HEAD
    git clean -fd

    # Database restore
    latest_backup=$(ls -t ~/Downloads/snapshot_laudable-horse-140_*.zip 2>/dev/null | head -n1)
    if [[ -n "$latest_backup" ]]; then
        pnpm dlx convex import --path "$latest_backup"
        echo "✅ Restore completed successfully"
    else
        echo "⚠️  No database backups found in Downloads"
    fi
else
    echo "❌ Restore cancelled"
fi
```

## Parameters

- `--commit <hash>`: Specific git commit to restore to (default: HEAD)
- `--db <filename>`: Specific backup file to restore (default: latest)
- `--git-only`: Only restore git, skip database
- `--db-only`: Only restore database, skip git
- `--no-confirm`: Skip confirmation prompt (use with caution)

## Notes

- **Destructive Operation**: This command will permanently lose uncommitted changes
- **Database Overwrite**: Database restore will completely replace current data
- **Backup Location**: Looks for backups in `~/Downloads/snapshot_laudable-horse-140_*.zip`
- **Project Context**: Command assumes it&apos;s run from the project root directory

## Safety Checklist

Before running restore:

1. Ensure important work is committed or backed up
2. Verify the correct backup file is selected
3. Check that no critical development is in progress
4. Confirm with team members if working collaboratively

## Recovery Options

If restore goes wrong:

- Git: Use `git reflog` to find and restore previous state
- Database: Re-import a different backup file
- Emergency: Contact team lead or check version control history
