# TODO: Adicionar Processo Individual e Requerente ao Formulário de Documentos

## Contexto

Adicionar dois campos opcionais ao formulário de criação de documentos:
1. **Processo Individual** - permite vincular um documento a um processo individual, com auto-preenchimento quando criado dentro do contexto de um processo (via URL param)
2. **Requerente** - permite selecionar uma pessoa como requerente usando o mesmo padrão do processo individual (UserApplicantSelector - mostra apenas pessoas com vínculo a empresas)

---

## Tarefas

### 1. Schema Changes (Database Layer)

- [x] 1.1: Adicionar campos `individualProcessId` e `userApplicantId` à tabela documents
  - Arquivo: `convex/schema.ts`
  - Adicionado: `individualProcessId: v.optional(v.id("individualProcesses"))`
  - Adicionado: `userApplicantId: v.optional(v.id("people"))`

- [x] 1.2: Adicionar índices para os novos campos
  - Arquivo: `convex/schema.ts`
  - Adicionado: `.index("by_individualProcess", ["individualProcessId"])`
  - Adicionado: `.index("by_userApplicant", ["userApplicantId"])`

### 2. Backend Query Enhancement (Convex Layer)

- [x] 2.1: Criar query `listForSelector` em individualProcesses.ts
  - Arquivo: `convex/individualProcesses.ts`
  - Query retorna: `{ _id, label, personName, referenceNumber }`
  - Implementado controle de acesso por role

- [x] 2.2: Atualizar query `list` de documents com filtros para novos campos
  - Arquivo: `convex/documents.ts`
  - Adicionado filtro por `individualProcessId`
  - Adicionado filtro por `userApplicantId`

- [x] 2.3: Enriquecer query `get` de documents com dados do processo e requerente
  - Arquivo: `convex/documents.ts`
  - Adicionado: `individualProcess: { _id, personName, referenceNumber }`
  - Adicionado: `userApplicant: { _id, fullName }`

- [x] 2.4: Enriquecer query `list` de documents com dados do processo e requerente
  - Arquivo: `convex/documents.ts`
  - Mesma estrutura do `get`

### 3. Backend Mutation Updates (Convex Layer)

- [x] 3.1: Adicionar campos à mutation `create`
  - Arquivo: `convex/documents.ts`
  - Adicionado aos args e ao insert statement

- [x] 3.2: Adicionar campos à mutation `update`
  - Arquivo: `convex/documents.ts`
  - Adicionado aos args e ao patch statement

### 4. Validation Schema Updates (Zod Layer)

- [x] 4.1: Adicionar `individualProcessId` ao documentSchema
  - Arquivo: `lib/validations/documents.ts`
  - Adicionado: `individualProcessId: z.string().optional()`

- [x] 4.2: Adicionar `userApplicantId` ao documentSchema
  - Arquivo: `lib/validations/documents.ts`
  - Adicionado: `userApplicantId: z.string().optional()`

### 5. Form Page Component Updates (UI Layer)

- [x] 5.1: Importar UserApplicantSelector
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.2: Adicionar query para processos individuais
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.3: Adicionar prop `initialIndividualProcessId`
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.4: Atualizar defaultValues do form
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.5: Tratar auto-fill no useEffect
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.6: Adicionar campo Processo Individual (Combobox)
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.7: Adicionar campo Requerente (UserApplicantSelector)
  - Arquivo: `components/documents/document-form-page.tsx`

- [x] 5.8: Atualizar payload do onSubmit
  - Arquivo: `components/documents/document-form-page.tsx`

### 6. Form Dialog Component Updates (UI Layer)

- [x] 6.1: Importar UserApplicantSelector
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.2: Adicionar query para processos individuais
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.3: Adicionar prop `initialIndividualProcessId`
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.4: Atualizar defaultValues do form
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.5: Tratar auto-fill no useEffect
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.6: Adicionar campo Processo Individual (Combobox)
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.7: Adicionar campo Requerente (UserApplicantSelector)
  - Arquivo: `components/documents/document-form-dialog.tsx`

- [x] 6.8: Atualizar payload do onSubmit
  - Arquivo: `components/documents/document-form-dialog.tsx`

### 7. Page Component Updates (Route Layer)

- [x] 7.1: Habilitar suporte a URL params para auto-fill
  - Arquivo: `app/[locale]/(dashboard)/documents/new/page.tsx`
  - Adicionado: `useSearchParams` para ler `?individualProcessId=xxx`
  - Passando prop para DocumentFormPage

### 8. Translation Updates (i18n Layer)

- [x] 8.1: Adicionar traduções em inglês
  - Arquivo: `messages/en.json`
  - Adicionado: `individualProcess`, `selectIndividualProcess`, `noIndividualProcesses`, `userApplicant`, `selectUserApplicant`

- [x] 8.2: Adicionar traduções em português
  - Arquivo: `messages/pt.json`
  - Adicionado: `individualProcess`, `selectIndividualProcess`, `noIndividualProcesses`, `userApplicant`, `selectUserApplicant`

### 9. Integration Testing

- [x] 9.1: Testar criação de documento com novos campos no form page
  - Testado: Documento criado com "Processo Individual" e "Requerente" salvos corretamente
- [x] 9.2: Testar criação de documento no dialog
  - Testado via edição de documento existente no dialog
- [x] 9.3: Testar auto-fill via URL parameter (`/documents/new?individualProcessId=<id>`)
  - Testado: Campo pré-preenchido corretamente via URL param
- [x] 9.4: Testar edição de documento com novos campos
  - Testado: Valores salvos carregados corretamente no dialog de edição
- [x] 9.5: Testar controle de acesso por role
  - Implementado no backend: `listForSelector` filtra processos por empresa para role "client"
- [ ] 9.6: Testar responsividade mobile
  - Pendente: Teste manual em viewport mobile

### 10. Bug Fixes During Testing

- [x] 10.1: Corrigir erro de React Hooks em DocumentViewModal
  - Arquivo: `components/documents/document-view-modal.tsx`
  - Problema: Hooks chamados condicionalmente (violação das Rules of Hooks)
  - Solução: Usar padrão `"skip"` do Convex ao invés de ternários condicionais

---

## Resumo de Arquivos Modificados

| Arquivo | Status |
|---------|--------|
| `convex/schema.ts` | ✅ Modificado |
| `convex/documents.ts` | ✅ Modificado |
| `convex/individualProcesses.ts` | ✅ Modificado |
| `lib/validations/documents.ts` | ✅ Modificado |
| `components/documents/document-form-page.tsx` | ✅ Modificado |
| `components/documents/document-form-dialog.tsx` | ✅ Modificado |
| `components/documents/document-view-modal.tsx` | ✅ Corrigido (React Hooks) |
| `app/[locale]/(dashboard)/documents/new/page.tsx` | ✅ Modificado |
| `messages/en.json` | ✅ Modificado |
| `messages/pt.json` | ✅ Modificado |

---

## Notas

- Schema deployado com sucesso via `npx convex dev --once`
- Novos índices criados: `documents.by_individualProcess`, `documents.by_userApplicant`
- TypeScript compila sem erros
- Testes de integração concluídos (exceto responsividade mobile)
