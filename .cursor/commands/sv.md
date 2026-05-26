# Save & Backup

## Git Commit

Only commit if the user explicitly requested it.

```bash
git add .
git commit -m "<descriptive-message>"
```

## Convex Database Backup

```bash
pnpm dlx convex export --path ~/Downloads
```

## Notes

- Commit first to track changes, then backup
- Backup files saved to ~/Downloads with timestamp
