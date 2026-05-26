#!/bin/bash

# After /senior-dev completes, prompt to run senior-orchestrator.
# Cursor hook: stop

input=$(cat)

# Check if the conversation involved senior-dev command
prompt=$(echo "$input" | jq -r '.prompt // .user_message // empty' 2>/dev/null)
last_command=$(echo "$input" | jq -r '.last_command // empty' 2>/dev/null)

if echo "$prompt $last_command" | grep -qi 'senior-dev'; then
  cat <<EOF
{
  "followup_message": "Agora execute o subagente senior-orchestrator para verificar o progresso em ai_docs/todo.md e continuar tarefas pendentes."
}
EOF
  exit 0
fi

exit 0
