# CASYS4 — Instruções para Claude Code

Este projeto compartilha configuração com Cursor. Leia `AGENTS.md` para contexto completo.

## Regras Críticas

1. **Use pnpm exclusivamente** — nunca `npm`, `npx` ou `yarn`
2. **i18n obrigatório** — textos em `messages/pt.json` e `messages/en.json`
3. **Convex com validação** — args, returns e auth em funções públicas
4. **Commits** — só quando o usuário pedir explicitamente

## Configuração Claude Code

| Pasta | Conteúdo |
|-------|----------|
| `.claude/agents/` | Subagentes (senior-orchestrator, task-sequencer, ui-component-researcher) |
| `.claude/commands/` | Slash commands (/senior-dev, /continue-todo, /deploy, etc.) |
| `.claude/hooks/` | Hooks (validação pnpm, chain senior-dev) |
| `.claude/settings.json` | Configuração de hooks |

Cursor lê os mesmos agentes de `.cursor/agents/` (prioridade) ou `.claude/agents/` (compatibilidade).

## Comandos Rápidos

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm run build
```

## Tarefas

- Lista ativa: `ai_docs/todo.md`
- PRD: `app/[locale]/(dashboard)/prd.md`
- Após completar tarefa, marque `[x]` imediatamente no todo.md
