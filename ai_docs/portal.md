# Portal do Cliente — Report do Estado Atual

## Contexto

Você quer construir um **portal para clientes acessarem** o CASys. Antes de planejar funcionalidades novas, este report mapeia **o que já está pronto**, **o que é reusável** e **os gaps reais** — para que a próxima fase foque apenas no que falta, sem reinventar o que existe.

**TL;DR:** A infraestrutura do portal (auth, role, RBAC, queries filtradas, sidebar condicional, dashboard cliente, widgets) **já está implementada e em uso**. O que falta são ajustes de UX, fluxos específicos (upload guiado, notificações, onboarding) e possivelmente uma rota/branding próprios.

---

## 1. O que JÁ ESTÁ FEITO

### 1.1. Autenticação e Roles
- **Convex Auth** com provider Password (`convex/auth.ts`, `convex/auth.config.ts`)
- Middleware protege `/:locale/dashboard(.*)` (`middleware.ts:14-30`)
- Duas roles no schema: `admin` e `client` (`convex/schema.ts:17`)
- `userProfiles.companyId` obrigatório para clientes
- Pré-registro: admin cria profile com `userId=undefined, isActive=false`; ativação no primeiro login

### 1.2. Helpers de Autorização
Em `convex/lib/auth.ts`:
- `getCurrentUserProfile(ctx)` — profile do usuário logado
- `requireActiveUserProfile(ctx)` — garante userId ativado
- `requireAdmin(ctx)` — bloqueia não-admin
- `requireClient(ctx)` — retorna `{ profile, companyId }` garantidos
- `canAccessCompany(ctx, companyId)` / `requireCompanyAccess(ctx, companyId)` — RBAC por empresa

### 1.3. Sidebar filtrada por role
`components/app-sidebar.tsx:43-61` — cliente vê apenas:
- **Processos Individuais** (`/individual-processes`)
- **Configurações** (`/settings`)

Admin vê os 7 grupos completos (Dashboard, Processos, Pessoas/Empresas, Documentos, Tarefas, Notas, Dados de Apoio, Config).

### 1.4. Dashboard do Cliente
`app/[locale]/(dashboard)/dashboard/dashboard-client.tsx:101-116` já renderiza bloco específico quando `role === "client"`:
- `ClientProcessesWidget`
- `ClientDocumentsWidget`
- `UpcomingDeadlinesWidget`
- `ClientUpdatesWidget`

Os 3 widgets `client-*-widget.tsx` existem em `components/dashboard/`.

### 1.5. Processos Individuais — modo cliente
`app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` já trata `isClient`:
- Filtra por empresa do cliente automaticamente
- Esconde botões de editar/excluir/fill-fields/create/export
- Esconde column visibility toggle
- Query `individualProcesses.list` respeita `requireCompanyAccess`

### 1.6. Process Requests (Solicitações)
`app/[locale]/(dashboard)/process-requests/` — cliente pode **submeter pedidos de processo**; admin aprova/rejeita. Queries já filtram por role.

### 1.7. Documentos Entregues
`convex/documentsDelivered.ts` (≈4.000 linhas) — fluxo completo:
- Status: `not_started`, `pending_upload`, `uploaded`, `under_review`, `approved`, `rejected`, `expired`
- `uploadedBy: v.id("users")` — cliente pode fazer upload
- Condições por documento (legalizado, apostilado, etc.)
- Versionamento (`upload-new-version-dialog`, `document-version-history-dialog`)
- Review dialog para staff validar

### 1.8. Componentes reusáveis prontos
- **67 componentes shadcn** em `components/ui/` (DataGridTable, ComboBox, CPF input, Currency input, DatePicker, Dialog, etc.)
- **FileUpload** drag-drop com preview
- **DocumentChecklistCard** — checklist de docs por processo
- **IndividualProcessStatusesSubtable** — timeline de status
- **PendingDocumentsPdfTemplate** — PDF de docs pendentes
- **DashboardPageHeader** — header com breadcrumbs
- Tema dark mode via `next-themes`

### 1.9. i18n (PT/EN)
`messages/pt.json` (171KB) e `messages/en.json` (158KB) — namespaces por módulo. **Sem namespace `ClientPortal` ainda**.

### 1.10. Tabelas relevantes ao cliente
- `notifications` — existe no schema (sem UI de alerts real-time)
- `activityLogs` — já grava ações
- `peopleCompanies` — liga pessoas à empresa
- `individualProcesses.companyApplicantId` — filtro natural para visão do cliente

---

## 2. GAPS — O que ainda FALTA para um portal "completo"

### Gaps de UX / Fluxo (maioria)
1. **Onboarding do cliente** — não há fluxo de convite por email + set-password no primeiro acesso. Hoje admin cria profile; cliente precisa descobrir credenciais.
2. **Upload guiado de documentos** — existe infra; falta página/assistente "upload do cliente" simplificado (lista de pendentes → arrastar arquivo → feito).
3. **Notificações in-app em tempo real** — tabela existe, sem sino/toast/real-time feed para cliente.
4. **Visão de "meu perfil"** — cliente não tem página para ver/editar seus próprios dados (phone, foto).
5. **Comunicação cliente↔admin** — sem chat/mensagens/comentários no processo.
6. **Mobile-first** — layout do admin é desktop-heavy; cliente típico acessa no celular.
7. **Detalhe de processo simplificado** — a tela atual mostra tudo que staff vê; cliente pode ter versão com timeline + docs pendentes + próximo passo, menos "planilha".

### Gaps de Infra (menos urgentes)
8. **Route group dedicado** — opcional, p. ex. `app/[locale]/(portal)/` com layout próprio (logo/cores diferentes, sem chrome de admin).
9. **Recuperação de senha** — verificar se Convex Auth Password flow tem reset configurado.
10. **Email transacional** — envio de convites/notificações exige provider (Resend, SES, etc.) — não vi integração.
11. **Namespace i18n `ClientPortal`** para textos específicos.
12. **Auditoria / audit-trail visível ao cliente** — staff vê `activity-logs`; cliente não tem.

---

## 3. Arquitetura recomendada (resumo)

Reutilizar a base existente em vez de duplicar. Manter o portal no mesmo app, diferenciando por **role no componente** (padrão já usado). Novas páginas podem ir em `app/[locale]/(dashboard)/` protegidas por `requireClient` nas queries.

Se quiser **branding separado** (logo, cores, URL diferente), aí justifica um route group novo `(portal)` com layout próprio.

---

## 4. Perguntas em aberto para definir escopo do V1

Principais decisões:
- **Escopo V1**: qual o mínimo pro cliente "conseguir usar"? (ex: ver processo + upload docs + notificações por email)
- **Branding**: portal dentro do mesmo app (mesma marca) OU separado (/portal com layout próprio)?
- **Onboarding**: convite por email com link de set-password, ou cadastro livre com aprovação do admin?
- **Mobile**: prioridade alta (redesenhar) ou "funcional" é suficiente?
- **Comunicação**: precisa chat/comentários no V1 ou email basta?

---

## 5. Arquivos críticos para referência

| Área | Arquivo |
|---|---|
| Schema geral | `convex/schema.ts` |
| Auth helpers | `convex/lib/auth.ts` |
| Auth config | `convex/auth.ts`, `convex/auth.config.ts` |
| Middleware | `middleware.ts` |
| Sidebar role-aware | `components/app-sidebar.tsx:43-61` |
| Dashboard cliente | `app/[locale]/(dashboard)/dashboard/dashboard-client.tsx:101-116` |
| Widgets cliente | `components/dashboard/client-*-widget.tsx` |
| Processos — UI cliente | `app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` |
| Upload docs | `convex/documentsDelivered.ts`, `components/typed-document-upload-dialog.tsx`, `components/file-upload.tsx` |
| Process Requests | `app/[locale]/(dashboard)/process-requests/` |
| i18n | `messages/pt.json`, `messages/en.json` |

---

## 6. Próximos passos

Este é um **report**, não uma implementação — nada foi alterado. Após decisão sobre as perguntas da seção 4, o próximo passo é montar um plano V1 concreto (arquivos a criar/editar, ordem, critérios de aceite) apenas para os gaps escolhidos.
