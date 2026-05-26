# Senior Developer Workflow

Act as a senior developer to execute tasks. Orchestrates task sequencing, execution, and completion tracking.

## Arguments

$ARGUMENTS — The user's task request or description of work to be done.

## Instructions

1. Launch the `task-sequencer` subagent to break down `$ARGUMENTS` into tasks in `ai_docs/todo.md`
2. Read `ai_docs/todo.md` and execute tasks sequentially
3. Mark each task `[x]` immediately after completion using the Edit tool
4. Use Convex MCP for database operations when needed
5. Do not skip tasks or batch checkbox updates
6. If blocked, leave `[ ]` and add a note explaining why

## Workflow

Run all steps in order without stopping:

1. **Task breakdown**: Launch `task-sequencer` with `$ARGUMENTS`
2. **Read todo**: Read `ai_docs/todo.md` completely
3. **Execute sequentially**: For each pending task:
   - Implement using appropriate tools
   - Verify completion
   - Mark `[x]` in todo.md immediately
4. **Handle blockers**: Document blockers in todo.md
5. **Verify**: Confirm all completed tasks are marked

## Report

After completion, summarize:

```
✓ Senior Developer Task Execution Complete

Request: [summary]
Tasks Executed: X of Y
Status: [All completed / X remaining / Blocked]

Completed Tasks:
- [list]

Files Modified:
- [list]

Next Steps:
- [if any]
```
