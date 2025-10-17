#!/bin/bash

# Hook to automatically run senior-orchestrator agent after /senior-dev command

# Read the last portion of the transcript to check what just ran
LAST_CONTENT=$(tail -n 100 "$TRANSCRIPT_PATH" 2>/dev/null)

# Check if /senior-dev was just executed
# We look for either the command itself or the command file name
if echo "$LAST_CONTENT" | grep -q '"/senior-dev"' || echo "$LAST_CONTENT" | grep -q 'senior-dev.md'; then
    # Block the stop and tell Claude to run the orchestrator agent
    echo '{"decision":"block","reason":"Now run the senior-orchestrator agent to continue the workflow."}'
    exit 0
fi

# For all other cases, allow normal stop behavior
exit 0
