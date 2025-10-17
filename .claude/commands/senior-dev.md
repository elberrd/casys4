description: Execute tasks from todo.md as a senior developer with task sequencing and completion tracking
argument-hint: [task request or description]
model: claude-sonnet-4-5-20250929
---

# Purpose

Act as a very senior developer to execute tasks requested by the user. This command orchestrates complex development workflows by:
1. Breaking down requests into structured task sequences using the task-sequencer agent
2. Executing tasks from the todo list systematically
3. Tracking and marking tasks as completed
4. Leveraging specialized MCP servers (Convex for database operations, Firecrawl for web research)

## Variables

- `$ARGUMENTS` - The user's task request or description of work to be done
- `@ai_docs/todo.md` - The todo list file containing structured tasks to execute

## Instructions

- Always execute tasks in the exact sequence specified in the workflow
- First, call the task-sequencer agent to break down `$ARGUMENTS` into actionable tasks
- Read and follow the task list from `@ai_docs/todo.md` precisely
- Execute tasks one by one
- Mark tasks as done by checking the box `[x]` in the actual todo.md file using the Edit tool
- Use Convex MCP tools for any database-related operations
- Use Firecrawl MCP tools for internet research when needed
- Do not skip or batch completions - check boxes immediately after finishing each task
- If a task fails or is blocked, leave the box unchecked `[ ]` and add a note explaining the blocker
- Maintain professional code quality and follow best practices
- Provide clear progress updates as you work through tasks

## Workflow

> Run the workflow in order, top to bottom. Do not stop in between steps. Complete every step in the workflow before stopping.

1. Request task breakdown from task-sequencer agent:
   - Use the Task tool with `subagent_type="task-sequencer"`
   - Pass `$ARGUMENTS` as the user's request to break it down into structured tasks
   - The agent will create/update tasks in `@ai_docs/todo.md`
   - Wait for the agent to complete before proceeding

2. Read the generated task list:
   - Use the Read tool to read `@ai_docs/todo.md`
   - Review all pending tasks and their descriptions
   - Understand the complete scope of work

3. Execute tasks sequentially:
   - For each task in the todo list (in order):
     a. Execute the task using appropriate tools:
        - Use Convex MCP tools (`mcp__convex__*`) for database operations
        - Use Firecrawl MCP tools (`mcp__mcp-server-firecrawl__*`) for web research
        - Use standard tools (Read, Write, Edit, Bash, etc.) for code tasks
     b. Verify the task is fully completed
     c. Check the box `[x]` in @ai_docs/todo.md using the Edit tool immediately
     d. Move to the next task

4. Handle blockers and errors:
   - If any task cannot be completed, leave the checkbox unchecked `[ ]`
   - Add a comment or note in the todo.md file explaining the blocker
   - Report issues to the user clearly

5. Verify all tasks are complete:
   - Review the final state of `@ai_docs/todo.md`
   - Ensure all completed tasks have checked boxes `[x]`
   - Confirm incomplete tasks have clear notes about why they're blocked

## Report

After completing all tasks, present a comprehensive summary:

```
✓ Senior Developer Task Execution Complete

Request: $ARGUMENTS

Tasks Executed: [NUMBER] of [TOTAL]
Status: [All completed / X remaining / Blocked]

Completed Tasks:
- [Task 1 description]
- [Task 2 description]
- [Task 3 description]
...

Tools & Services Used:
- [Convex MCP tools for database operations]
- [Firecrawl MCP tools for web research]
- [Other tools used]

Files Modified:
- [List of files created/modified]

Next Steps (if any):
- [Any remaining work or follow-up items]
```

Include any important notes about:
- Technical decisions made during execution
- Any blockers encountered and how they were resolved
- Recommendations for further work or improvements
- Database changes made (if using Convex MCP)
- External resources researched (if using Firecrawl MCP)
- Any tasks left unchecked `[ ]` and why
