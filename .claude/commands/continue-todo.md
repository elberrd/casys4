# Continue TODO Development

You are tasked with continuing the development of tasks defined in `ai_docs/todo.md`. Follow these instructions carefully:

## 1. Task Analysis Phase

First, read and analyze the TODO file:

- Read `ai_docs/todo.md` completely
- Identify all tasks marked as incomplete (indicated by `- [ ]`)
- Note the current section/phase of work
- Understand dependencies between tasks

## 2. Verification Phase

For each incomplete task:

- **Double-check implementation status**: Search the codebase to verify the task is truly not done
- Check if files exist at the specified paths
- Verify if translation keys are present (for i18n tasks)
- Look for related code that might indicate partial completion
- **Update todo.md if a task is actually complete**: If you find that a task is already implemented, mark it as `[x]` before proceeding

## 3. Implementation Phase

For tasks that are genuinely incomplete:

- Work through tasks **in sequential order** (follow the task numbering)
- Implement one complete section at a time (e.g., finish all of section 5 before moving to section 6)
- Follow all quality checklists for each section
- Update `ai_docs/todo.md` marking tasks as `[x]` immediately after completing them
- Use the TodoWrite tool to track your progress in the active session

## 4. Quality Standards

Ensure all implementations meet these criteria:

- TypeScript with proper types (no `any` types)
- Full internationalization using next-intl
- Proper Convex integration where specified
- Follow existing component patterns in the codebase
- Accessibility standards (ARIA labels, keyboard navigation)
- Responsive design
- Error handling and loading states

## 5. Stopping Criteria

You should continue working until ONE of these conditions is met:

- **All tasks in the current major section are complete** (e.g., all of Section 5)
- **You encounter a blocking issue** that prevents further progress
- **Token budget is running low** (less than 20% remaining)

## 6. Handoff to Senior Orchestrator

If you need to stop before completing ALL tasks in `ai_docs/todo.md`:

1. Update `ai_docs/todo.md` with all completed tasks marked as `[x]`
2. Invoke the senior-orchestrator agent with this exact prompt:

```
Continue the development of tasks in ai_docs/todo.md.

Current Status:
- Last completed task: [specify the last task you completed]
- Next task to work on: [specify the next incomplete task]
- Reason for handoff: [explain why you're stopping: completed section/blocking issue/token limit]

Please continue from where I left off, following the same quality standards and sequential order.
```

## Important Notes

- **Never skip tasks** - they are ordered with dependencies in mind
- **Always verify before implementing** - avoid duplicate work
- **Update todo.md frequently** - mark tasks as done immediately after completion
- **Follow existing patterns** - check similar components for consistency
- **Use pnpm** - this project uses pnpm, not npm
- **Test as you go** - verify TypeScript compilation with `pnpm exec tsc --noEmit`
- **At the end** - verify TypeScript compilation with `pnpm dev` - after ok, kill the port

## Example Workflow

1. Read `ai_docs/todo.md`
2. Find first incomplete task: "5.3: Create StatusHistoryList component"
3. Verify: Search for `components/status-history-list.tsx` → Not found
4. Verify: Check translation keys in messages/en.json and pt.json → Not found
5. Implement: Create component following quality checklist
6. Implement: Add translation keys
7. Update: Mark task 5.3 as `[x]` in todo.md
8. Continue: Move to task 5.4
9. Repeat until section complete or stopping criteria met
10. If stopping: Invoke senior-orchestrator with status update

---

**Start working now. Begin with Step 1: Task Analysis Phase.**
