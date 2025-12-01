description: Create a new Claude Code command with professional structure and best practices
argument-hint: [command-name] [description]

---

# Purpose

Create a new, professionally structured Claude Code command following best practices and consistent formatting. This command automates the process of generating well-documented, production-ready slash commands with proper sections, variables, instructions, workflow steps, and reporting guidelines.

## Variables

- `[COMMAND_NAME]` - The name of the new command (kebab-case, e.g., "deploy-app", "run-tests")
- `[DESCRIPTION]` - Brief description of what the command does (used in frontmatter)
- `[PURPOSE]` - Detailed explanation of the command's purpose and use cases
- `[VARIABLES]` - List of variables the command will use (in `[VARIABLE_NAME]` format)
- `[INSTRUCTIONS]` - Specific instructions or constraints for executing the command
- `[WORKFLOW_STEPS]` - Sequential or parallel steps the command will execute
- `[REPORT_FORMAT]` - What information should be reported when the command completes

## Instructions

- Command names MUST use kebab-case (lowercase with hyphens)
- All commands MUST include the standard frontmatter with description, argument-hint, and model
- The model should default to `claude-sonnet-4-5-20250929` unless specified otherwise
- Variables should be clearly defined in `[VARIABLE_NAME]` format
- Workflow steps should be numbered and specify whether they run sequentially or in parallel
- When using SlashCommand or Task tools in workflows, use proper syntax: `SlashCommand("[command-name] [args]")`
- For parallel execution, explicitly note: "Run these steps in parallel using the Task tool"
- Report section should specify exactly what information to present to the user
- Validate that `.claude/commands/` directory exists before creating the command
- Ensure the command file has `.md` extension
- Follow consistent formatting and spacing between sections

## Workflow

> Run the workflow in order, top to bottom. Do not stop in between steps. Complete every step in the workflow before stopping.

1. Verify `.claude/commands/` directory exists; create if necessary
2. Gather command requirements from user prompt:
   - Extract or prompt for `[COMMAND_NAME]`
   - Extract or prompt for `[DESCRIPTION]`
   - Extract or prompt for `[PURPOSE]`
   - Extract or prompt for `[VARIABLES]` (if applicable)
   - Extract or prompt for `[INSTRUCTIONS]`
   - Extract or prompt for `[WORKFLOW_STEPS]`
   - Extract or prompt for `[REPORT_FORMAT]`
3. Generate the command file with the following structure:

   ```markdown
   description: [DESCRIPTION]
   argument-hint: [VARIABLES]
   model: claude-sonnet-4-5-20250929

   ---

   # Purpose

   [PURPOSE]

   ## Variables

   [VARIABLES]

   ## Instructions

   [INSTRUCTIONS]

   ## Workflow

   > Run the workflow in order, top to bottom. Do not stop in between steps. Complete every step in the workflow before stopping.

   [WORKFLOW_STEPS]

   ## Report

   [REPORT_FORMAT]
   ```

4. Write the command file to `.claude/commands/[COMMAND_NAME].md`
5. Validate the created file structure and formatting
6. Finally, report the work done based on the `Report` section

## Report

Present a summary of the created command:

```
✓ Command created: /[COMMAND_NAME]

Location: .claude/commands/[COMMAND_NAME].md
Description: [DESCRIPTION]

You can now use this command by typing: /[COMMAND_NAME] [argument-hint]
```

Include any additional notes about:

- Variables the command expects
- How to invoke the command
- Whether it runs other commands in parallel
- Any special configuration or prerequisites
