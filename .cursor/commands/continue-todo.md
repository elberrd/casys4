# Continue TODO Development

Continue development of tasks defined in `ai_docs/todo.md`.

## Instructions

### 1. Task Analysis
- Read `ai_docs/todo.md` completely
- Identify incomplete tasks (`- [ ]`)
- Note dependencies and current phase

### 2. Verification
For each incomplete task:
- Search codebase to verify it's truly not done
- If already implemented, mark `[x]` before proceeding

### 3. Implementation
- Work in sequential order (follow task numbering)
- Complete one section at a time
- Mark `[x]` immediately after each task
- Use TodoWrite to track session progress

### 4. Quality Standards
- TypeScript strict (no `any`)
- Full i18n (pt + en in messages/)
- Convex integration where specified
- Follow existing component patterns
- Accessibility and responsive design
- Error handling and loading states

### 5. Stopping Criteria
Stop when ONE of:
- All tasks in current major section are complete
- Blocking issue prevents progress
- Token budget is low

### 6. Handoff
If stopping early, update todo.md and invoke `senior-orchestrator` with status.

## Notes

- Never skip tasks
- Always verify before implementing
- Use pnpm (never npm)
- Verify TypeScript: `pnpm exec tsc --noEmit`

**Start now with Step 1: Task Analysis.**
