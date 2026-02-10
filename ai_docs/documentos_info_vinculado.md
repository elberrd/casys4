# Documentos Vinculados a Campos de Informacao

## Visao Geral

Este sistema permite vincular campos de informacao (ex: nacionalidade, data de nascimento) a tipos de documento (ex: Passaporte). O objetivo e mostrar ao usuario quais campos sao necessarios para cada documento e permitir navegacao rapida entre o campo e o documento correspondente.

---

## Arquitetura

### Tabelas Envolvidas

| Tabela | Papel |
|---|---|
| `documentTypeFieldMappings` | Vincula campos (entityType + fieldPath) a tipos de documento |
| `documentTypesLegalFrameworks` | Associa tipos de documento a amparos legais |
| `documentsDelivered` | Documentos enviados por processo, com `documentTypeId` opcional |
| `documentTypes` | Cadastro de tipos de documento (Passaporte, RNE, etc.) |

### Schema de `documentTypeFieldMappings`

```
documentTypeId: Id<"documentTypes">
entityType: string          // "person", "individualProcess", "passport", "company"
fieldPath: string           // nome do campo na tabela (ex: "birthDate", "nationalityId")
label: string               // label em portugues
labelEn: string (opcional)  // label em ingles
fieldType: string (opcional) // "text", "date", "number", "select"
isRequired: boolean
isActive: boolean
sortOrder: number
createdAt: number
createdBy: Id<"users">
```

Indices: `by_documentType`, `by_entityType_fieldPath`

---

## Backend (convex/documentTypeFieldMappings.ts)

### Queries

#### `list` / `listAll`
Listam field mappings por `documentTypeId`. `list` filtra apenas ativos.

#### `listByField`
Busca por `entityType` + `fieldPath`. Retorna enriquecido com nome do tipo de documento. Usado para mostrar opcao "anexar documento" ao lado de campos.

#### `getLinkedFieldsMap` (QUERY PRINCIPAL)
**Entrada**: `individualProcessId`
**Saida**: `Record<"entityType:fieldPath", { documentTypeName, documentTypeId, deliveredDocumentId? }[]>`

Coleta IDs de tipos de documento de **duas fontes**:
1. **Associacoes do amparo legal**: Se o processo tem `legalFrameworkId`, busca em `documentTypesLegalFrameworks`
2. **Documentos entregues**: Busca em `documentsDelivered` pelo `individualProcessId`, pega os que tem `documentTypeId`

Para cada tipo de documento encontrado, busca os field mappings ativos e constroi o mapa.

**IMPORTANTE**: A versao inicial so olhava a fonte 1 (amparo legal). Processos sem amparo legal mas com documentos entregues nao mostravam icones. O bug foi corrigido adicionando a fonte 2.

**`deliveredDocumentId`**: Inclui o ID do documento entregue mais recente para cada tipo, permitindo ao frontend abrir o dialog de revisao diretamente.

**Tipagem**: Usa `Set<Id<"documentTypes">>` (nao `Set<string>`) para manter tipagem correta com `ctx.db.get()`.

#### `getFieldsWithValues`
**Entrada**: `documentTypeId` + `individualProcessId`
**Saida**: Array de campos com valores atuais extraidos das entidades (person, process, passport, company)

Usado na aba "Campos Vinculados" do dialog de revisao de documento.

### Mutations

#### `create` / `update` / `remove` / `reorder`
CRUD padrao para field mappings. Todas requerem `requireAdmin(ctx)`.

#### `updateFieldValues`
**Entrada**: `individualProcessId` + array de `{ entityType, fieldPath, value }`
Agrupa mudancas por entidade e faz `ctx.db.patch()` em cada uma. Usado para salvar edicoes inline na aba "Campos" do dialog de revisao.

### Helper `getFieldValue`
Funcao interna que extrai valor de um campo a partir da entidade correta:
```ts
switch (entityType) {
  case "person": return person?.[fieldPath] ?? null
  case "individualProcess": return process?.[fieldPath] ?? null
  case "passport": return passport?.[fieldPath] ?? null
  case "company": return company?.[fieldPath] ?? null
}
```

---

## Frontend

### 1. Icone de Paperclip na Pagina de Detalhe

**Arquivo**: `app/[locale]/(dashboard)/individual-processes/[id]/page.tsx`

Componente `LinkedDocIcon` inline:
- Recebe `entityType` e `fieldPath`
- Consulta `linkedFieldsMap` (query feita uma unica vez no componente pai)
- Se ha links, mostra icone de Paperclip com Tooltip mostrando nome(s) do(s) documento(s)
- Se ha `deliveredDocumentId`, o icone e clicavel (cor `text-primary`) e abre o `DocumentReviewDialog`
- Se nao ha documento entregue, icone e apenas informativo (cor `text-muted-foreground`)

Campos com icone no card **Informacoes da Pessoa**:
- `person:cpf`
- `person:nationalityId`
- `person:maritalStatus`
- `person:birthDate`
- `person:fatherName`
- `person:motherName`
- `person:profession`

Campos com icone no card **Informacoes do Processo**:
- `individualProcess:funcao`
- `individualProcess:qualification`
- `individualProcess:professionalExperienceSince`
- `individualProcess:monthlyAmountToReceive`

O `DocumentReviewDialog` e renderizado condicionalmente quando `reviewDocumentId` e definido (via clique no paperclip).

### 2. Icone de Paperclip nos Formularios de Edicao

**Componente compartilhado**: `components/ui/linked-doc-indicator.tsx`

```tsx
export function LinkedDocIndicator({ individualProcessId, entityType, fieldPath })
```

- Recebe `individualProcessId` (opcional, se undefined nao renderiza nada)
- Faz sua propria query `getLinkedFieldsMap` (Convex deduplica queries identicas)
- Mostra Paperclip + Tooltip com nome do documento

Usado em:
- `components/people/person-form-dialog.tsx` - campos da pessoa (cpf, birthDate, nationalityId, maritalStatus, motherName, fatherName, profession)
- `components/individual-processes/individual-process-form-dialog.tsx` - campos do processo (funcao, qualification, professionalExperienceSince, monthlyAmountToReceive)

Ambos os dialogs recebem `individualProcessId` como prop opcional e envolvem o conteudo com `<TooltipProvider>`.

### 3. Aba "Campos Vinculados" no Dialog de Revisao

**Arquivo**: `components/individual-processes/document-review-dialog.tsx`

5a aba no TabsList chamada "Campos" com badge mostrando `preenchidos/total`.

Funcionalidades:
- Lista campos vinculados agrupados por entidade (Pessoa, Passaporte, etc.)
- Mostra icone verde (CheckCircle2) se preenchido, cinza (Circle) se vazio
- Badge "Obrigatorio" para campos requeridos
- **Edicao inline**: botao de editar ativa inputs inline (text, date, number, select)
- **Salvar**: chama mutation `updateFieldValues` para persistir mudancas
- Campos de select usam `MARITAL_STATUS_OPTIONS` e `QUALIFICATION_OPTIONS`

Query usada: `getFieldsWithValues` (so chamada se o documento tem `documentTypeId`).

### 4. RequirementsChecklistCard

**Arquivo**: `components/individual-processes/requirements-checklist-card.tsx` (ja existia)

Adicionado na pagina de detalhe do processo (`page.tsx`) antes do `DocumentChecklistCard`. Mostra checklist unificado de requisitos baseado no amparo legal, com barra de progresso.

---

## i18n

Chaves adicionadas em `messages/pt.json` e `messages/en.json`:

```
IndividualProcesses.linkedToDocument: "Vinculado ao documento: {documents}"

DocumentReview.linkedFields: "Campos"
DocumentReview.linkedFieldsDescription: "Campos de informacao vinculados a este tipo de documento"
DocumentReview.noLinkedFields: "Nenhum campo vinculado a este tipo de documento"
DocumentReview.notFilled: "Nao preenchido"
DocumentReview.filled: "Preenchido"
DocumentReview.entityPerson: "Pessoa"
DocumentReview.entityIndividualProcess: "Processo Individual"
DocumentReview.entityPassport: "Passaporte"
DocumentReview.entityCompany: "Empresa"
DocumentReview.fieldsSaved: "Campos atualizados com sucesso"
DocumentReview.fieldsSaveError: "Erro ao salvar campos"
```

---

## Fluxo Completo

1. **Admin configura**: No cadastro de Tipos de Documento, vincula campos (ex: Passaporte -> person:birthDate, person:nationalityId, person:surname, etc.)
2. **Documento entregue**: Usuario faz upload de Passaporte no processo individual
3. **Icones aparecem**: Na pagina de detalhe, campos vinculados mostram icone de paperclip
4. **Clique no icone**: Abre dialog de revisao do Passaporte diretamente
5. **Aba Campos**: No dialog de revisao, aba "Campos 5/6" mostra campos vinculados com valores atuais
6. **Edicao inline**: Usuario pode editar campos diretamente na aba e salvar

---

## Bugs Corrigidos

### Paperclip nao aparecia em processos sem amparo legal
- **Causa**: `getLinkedFieldsMap` so buscava tipos de documento via `documentTypesLegalFrameworks`. Processos sem `legalFrameworkId` retornavam `{}`.
- **Solucao**: Adicionada segunda fonte de dados: `documentsDelivered`. Agora coleta IDs de tipos de documento de ambas as fontes.

### TypeScript error com `Set<string>` e `ctx.db.get()`
- **Causa**: `ctx.db.get(docTypeId as any)` retornava uniao de TODOS os tipos de tabela, perdendo tipagem de `documentTypes`.
- **Solucao**: Mudou para `Set<Id<"documentTypes">>` e removeu casts `as any`. Agora `ctx.db.get(docTypeId)` retorna `Doc<"documentTypes">` corretamente.
