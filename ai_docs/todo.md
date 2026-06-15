# TODO: Solicitação de Processos (Process Requests) — passport-first workflow

Refazendo a página "Solicitação de Processos": o usuário regular monta uma solicitação
(passaporte primeiro, com OCR via Gemini), conversa com o admin, envia (trava + versão),
e ao ser aprovada vira um Processo Individual totalmente preenchido.

## Decisões (ver memory: process-requests-feature.md)
- Estender a tabela `processRequests` (não reusar individualProcesses). NÃO mexer no `components/process-wizard/` do admin.
- Estados: draft → submitted (trava cliente, versão++ + snapshot) → admin: reopen | approve (→ processo individual) | reject. Conversa sempre aberta.
- RBAC: cliente vê só as próprias solicitações, sob a empresa atual. Admin vê todas, agrupa por requerente.
- OCR: `gemini-3.5-flash` (@google/genai), Convex "use node" action. Aceitar PNG/JPEG/WebP + PDF, 10MB.
- Residência: brazil|abroad → país→cidade (`country-state-city`) + data + duração calculada + endereço livre.

## Fase 1 — Fundação ✅
- [x] Instalar `@google/genai` + `country-state-city`
- [x] `GEMINI_API_KEY` no Convex (dev + prod)
- [x] Schema: processRequests estendido; passports.storageId; individualProcesses (visaReceiptLocation/residence*/professionalExperience); novas tabelas processRequestMessages, processRequestVersions

## Fase 2 — Backend ✅ (typecheck OK, deploy dev OK)
- [x] `convex/lib/createIndividualProcess.ts` — core reutilizável de criação de processo
- [x] `convex/processRequests.ts` — createDraft / saveDraft / submit / reopen / approve(→individual) / reject / remove + list/get enriquecidos
- [x] `convex/processRequestMessages.ts` — conversa + observações privadas + notificações
- [x] `convex/passportUpload.ts` — generateUploadUrl + applyCandidate (permitido ao cliente)
- [x] `convex/passportOcr.ts` — action Gemini
- [x] `convex/countries.findByCodeOrName`, `convex/people.findByNormalizedName`

## Fase 3 — Frontend ✅ (typecheck limpo + build OK)
- [x] i18n: chaves em `messages/pt.json` + `messages/en.json` (ProcessRequests + IndividualProcesses)
- [x] `lib/utils/residence-duration.ts` — "mora há X" a partir de uma data
- [x] `components/process-requests/residence-select.tsx` — brazil/abroad + país→cidade + data + duração
- [x] `components/process-requests/legal-framework-select.tsx` — seletor com nome + descrição
- [x] `components/process-requests/passport-upload-step.tsx` — upload + OCR + resolução de duplicado
- [x] `components/process-requests/request-conversation.tsx` — chat (bolhas) + observações admin
- [x] `components/process-requests/process-request-wizard.tsx` (+ steps + state) — sequência travada
- [x] Rota `new/page.tsx` → novo wizard (substituiu form antigo)
- [x] `process-requests-client.tsx` — lista (cliente: próprias; admin: todas, agrupar por requerente)
- [x] Detalhe da solicitação (admin): observações, conversa, aprovar/rejeitar/reabrir, ver versões
- [x] Campos novos no Processo Individual (edit form + detail card): visaReceiptLocation, residência exterior, experiência profissional (texto)
- [x] Typecheck (`pnpm exec tsc --noEmit`) ✅ + `pnpm run build` ✅

## Falta testar em runtime (precisa do app rodando + login)
- [ ] Fluxo completo do wizard com upload de passaporte real (OCR Gemini ao vivo)
- [ ] Aprovação → criação do processo individual preenchido
- [ ] Conversa + notificações entre cliente e admin
- [ ] Deploy: push para main (auto-deploy Convex+Next). Env GEMINI_API_KEY já está em prod.

## Notas
- Bugs antigos do form a descartar na reescrita: namespace i18n minúsculo `processRequests`; redirect `/dashboard/process-requests`.
- approve() antigo gerava número de referência com `length+1` (corrida) — não reaproveitar.
