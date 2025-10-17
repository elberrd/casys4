# Save & Backup Workflow

## Git Commit

Create a meaningful commit message that accurately describes the changes made to the codebase.

```bash
git add .
git commit -m "<descriptive-commit-message>"
```

## Convex Database Backup

Export current Convex database state to local Downloads folder for backup purposes.

```bash
pnpm dlx convex export --path ~/Downloads
```

## Usage Notes

- Execute git commit first to ensure all changes are tracked
- Run backup command after significant database schema changes or before major deployments
- Backup files will be saved with timestamp for easy identification
