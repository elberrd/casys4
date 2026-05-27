# CASYS4 — Guia para Agentes de IA

Sistema de gestão de processos de imigração (vistos, passaportes, RNM) para escritórios de advocacia.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Backend | Convex (queries, mutations, actions, auth) |
| Auth | Convex Auth (`@convex-dev/auth`) |
| i18n | next-intl (pt primário, en secundário) |
| Forms | react-hook-form + Zod |
| UI | shadcn/ui, Radix, componentes ReUI/Kibo em `components/ui/` |
| Package manager | **pnpm exclusivamente** |

## Comandos

```bash
pnpm dev              # Next.js + Convex em paralelo
pnpm run build        # Build de produção
pnpm exec tsc --noEmit # Verificação TypeScript
pnpm lint             # ESLint
```

Nunca use `npm`, `npx` ou `yarn`. Use `pnpm dlx` no lugar de `npx`.

## Package manager — enforcement

Este projeto **bloqueia ativamente** comandos `npm`, `npx`, `yarn` e `yarnpkg` no agente Cursor via hook em [`.cursor/hooks.json`](.cursor/hooks.json) (`beforeShellExecution`). Tentativas são negadas com mensagem corretiva.

**Comandos permitidos:**

| Objetivo | Comando |
|----------|---------|
| Instalar deps | `pnpm install` |
| Adicionar pacote | `pnpm add <pkg>` |
| Rodar script | `pnpm run <script>` ou `pnpm <script>` |
| Executar binário one-off | `pnpm dlx <pkg>` |
| Executar binário instalado | `pnpm exec <cmd>` |
| Dev / build / lint | `pnpm dev`, `pnpm run build`, `pnpm lint` |

**Verificação:** Cursor → Settings → Hooks (ou output channel "Hooks"). Se o hook não carregar, reinicie o Cursor após salvar `hooks.json`.

## Estrutura do Projeto

```
app/[locale]/           # Rotas com prefixo de locale (/pt, /en)
  (dashboard)/          # Área autenticada (admin e client)
components/             # Componentes React reutilizáveis
convex/                 # Backend Convex (schema, funções, auth)
messages/               # Traduções pt.json e en.json
i18n/                   # Configuração next-intl
lib/                    # Utilitários, validações Zod
ai_docs/                # Documentação interna, todos, PRD parcial
.cursor/                # Configuração Cursor (rules, agents, commands, hooks)
.claude/                # Configuração Claude Code (compatível com Cursor)
```

## Convenções Obrigatórias

### Package manager
- Sempre `pnpm`. Hook em `.cursor/hooks.json` bloqueia `npm`/`npx`/`yarn`.

### Internacionalização
- Todo texto visível ao usuário deve usar next-intl.
- Adicionar chaves em `messages/pt.json` e `messages/en.json`.
- Rotas sempre com locale: `/pt/dashboard`, `/en/settings`.

### Convex
- Validar args e returns em todas as funções públicas.
- Usar índices (`withIndex`), nunca `filter()` em queries.
- Auth checks em funções públicas via `convex/lib/auth.ts`.
- Seguir `.cursor/rules/convex_rules.mdc`.

### TypeScript
- Strict mode, sem `any`.
- Tipos de ID: `Id<'tableName'>` de `convex/_generated/dataModel`.

### UI
- Reutilizar componentes existentes em `components/ui/`.
- Documentação de componentes em `ai_docs/ui-components/`.
- Responsivo (sm, md, lg) e acessível.

### RBAC
- Roles: `admin` e `client`.
- Clientes veem apenas dados da própria empresa (`companyId`).
- Helpers: `requireAdmin`, `requireClient`, `requireCompanyAccess` em `convex/lib/auth.ts`.

## Fluxo de Desenvolvimento

1. **Nova feature**: use `/senior-dev` ou o agente `task-sequencer` para quebrar em tarefas em `ai_docs/todo.md`.
2. **Executar tarefas**: use `/continue-todo` ou `/senior-dev`.
3. **Orquestração**: agente `senior-orchestrator` verifica e continua tarefas pendentes.
4. **Componentes UI**: agente `ui-component-researcher` documenta em `ai_docs/ui-components/`.

## Documentação de Referência

| Arquivo | Conteúdo |
|---------|----------|
| `app/[locale]/(dashboard)/prd.md` | PRD do produto |
| `ai_docs/todo.md` | Lista de tarefas ativa |
| `I18N_IMPLEMENTATION.md` | Guia i18n |
| `ai_docs/lessons.md` | Lições aprendidas |
| `ai_docs/ui-components/` | Docs de componentes |
| `ai_docs/portal.md` | Estado do portal do cliente |

## Deploy

- **Produção**: https://casys4.vercel.app
- **Convex prod**: pleasant-mosquito-546
- Use `/deploy` para o fluxo completo (build → convex deploy → git push).

## Testes (web app local)

Use estas credenciais para validar fluxos autenticados (sign-in, dashboard, RBAC). Comando dedicado: `/test`.

| Campo | Valor |
|-------|-------|
| URL | http://localhost:3000/ |
| Email | elber@impactus.ai |
| Senha | Senha@123 |

**Fluxo do agente:**

1. Se a porta 3000 estiver ocupada, liberar e subir com `pnpm dev`
2. Browser MCP para navegar e testar a UI
3. Convex MCP para verificar backend/dados, se necessário
4. Ao encontrar problema, corrigir e retestar

Detalhes do comando em `.cursor/commands/test.md`.

## Agentes e Comandos Customizados

Definidos em `.cursor/agents/` e `.cursor/commands/` (espelhados em `.claude/` para compatibilidade).

| Agente | Uso |
|--------|-----|
| `senior-orchestrator` | Orquestrar conclusão de tarefas em `ai_docs/todo.md` |
| `task-sequencer` | Quebrar pedidos em sequência de tarefas |
| `ui-component-researcher` | Pesquisar e documentar componentes UI |

| Comando | Uso |
|---------|-----|
| `/senior-dev` | Executar workflow completo de desenvolvimento |
| `/continue-todo` | Continuar tarefas de `ai_docs/todo.md` |
| `/dev` | Orquestrar agentes para executar uma tarefa |
| `/deploy` | Deploy para produção |
| `/test` | Testar app no browser (localhost:3000) |
| `/sv` | Commit git + backup Convex |
