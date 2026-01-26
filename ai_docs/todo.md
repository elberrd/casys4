# TODO: Visualizar e fazer CRUD de Tipos de Documentos vinculados ao Amparo Legal

## Contexto

O usuário solicitou que dentro da tela de "Amparo Legal" (Legal Framework) seja possível:
1. Visualizar os tipos de documentos vinculados com aquele amparo legal
2. Fazer CRUD (criar, ler, atualizar, deletar) dos vínculos entre tipos de documentos e amparos legais

### Análise da Situação Atual

**O que JÁ EXISTE:**
- ✅ Backend: Tabela `documentTypesLegalFrameworks` na junction table (schema.ts linhas 255-268)
- ✅ Backend: Query `legalFrameworks.get` retorna `documentTypeAssociations` (legalFrameworks.ts linha 103-119)
- ✅ Backend: Mutations para criar/atualizar associações no formulário de Legal Framework (legalFrameworks.ts linhas 227-238, 310-334)
- ✅ Frontend: Componente `DocumentTypeAssociationSection` usado no formulário (legal-framework-form-dialog.tsx linha 249-264)
- ✅ Frontend: CRUD completo no formulário de criação/edição do Legal Framework
- ✅ i18n: Todas as traduções necessárias já existem (en.json e pt.json linhas 1767-1799)

**O que FALTA:**
- ❌ Frontend: Modal de visualização (`legal-framework-view-modal.tsx`) NÃO mostra os tipos de documentos associados
- ❌ Frontend: Não há seção visual para mostrar os documentos vinculados no modal de view

**Conclusão:**
O sistema JÁ permite fazer o CRUD completo no formulário de edição. O que falta é apenas mostrar os tipos de documentos associados no modal de visualização.

---

## Task Sequence

### 0. Project Structure Analysis ✓ (COMPLETED)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing Legal Framework components structure
  - Validation: Confirmed structure at `/Users/elberrd/Documents/Development/clientes/casys4/components/legal-frameworks/`
  - Output:
    - `legal-framework-view-modal.tsx` - Modal de visualização (precisa atualizar)
    - `legal-framework-form-dialog.tsx` - Formulário de criação/edição (já completo)
    - `legal-frameworks-table.tsx` - Tabela de listagem
    - `document-type-association-section.tsx` - Seção de associação de documentos (usado no form)

- [x] 0.2: Review existing backend queries and mutations
  - Validation: Confirmed files at `/Users/elberrd/Documents/Development/clientes/casys4/convex/`
  - Output:
    - `legalFrameworks.ts` - Já retorna `documentTypeAssociations` na query `get`
    - `documentTypesLegalFrameworks.ts` - Queries para listar associações
    - Schema: Junction table `documentTypesLegalFrameworks` já existe

- [x] 0.3: Review i18n translations
  - Validation: Confirmed translations in `messages/en.json` and `messages/pt.json`
  - Output: Todas as traduções necessárias já existem no namespace `LegalFrameworks`

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined
- [x] Existing functionality analyzed (CRUD já existe no form)
- [x] Missing functionality identified (falta view no modal)

---

### 1. Adicionar Visualização de Tipos de Documentos no Modal de View

**Objective**: Atualizar o modal de visualização do Legal Framework para mostrar os tipos de documentos associados

#### Sub-tasks:

- [x] 1.1: Atualizar `legal-framework-view-modal.tsx` para adicionar seção de documentos
  - **Arquivo**: `/Users/elberrd/Documents/Development/clientes/casys4/components/legal-frameworks/legal-framework-view-modal.tsx`
  - **Ação**: Adicionar nova seção `ViewSection` para mostrar os documentos associados
  - **Detalhes**:
    - Usar os dados `documentTypeAssociations` que já vêm da query `legalFrameworks.get`
    - Adicionar seção após "Framework Information" (linha ~68)
    - Mostrar lista de documentos com:
      - Nome do tipo de documento
      - Badge indicando se é obrigatório (Required) ou opcional
      - Código do documento (se existir)
    - Usar ícone `FileText` para a seção
  - **Componentes UI necessários**:
    - `Badge` (já importado)
    - `FileText` icon (já disponível via lucide-react)
  - **i18n keys a usar**:
    - `t("documentTypeAssociations")` - título da seção
    - `t("required")` - badge de obrigatório
    - `tCommon("optional")` - badge de opcional
  - Validation: Modal deve exibir lista de documentos com badges de status
  - Dependencies: Nenhuma - dados já vêm da query

- [x] 1.2: Adicionar indicador visual quando não há documentos associados
  - **Arquivo**: `/Users/elberrd/Documents/Development/clientes/casys4/components/legal-frameworks/legal-framework-view-modal.tsx`
  - **Ação**: Mostrar mensagem quando array de documentos estiver vazio
  - **Detalhes**:
    - Verificar se `documentTypeAssociations.length === 0`
    - Mostrar texto: `tCommon("noResults")` ou criar nova key i18n
  - Validation: Mensagem apropriada quando lista vazia
  - Dependencies: Sub-tarefa 1.1

- [x] 1.3: Testar modal de visualização com diferentes cenários
  - **Ações**:
    - Abrir modal de um Legal Framework sem documentos associados
    - Abrir modal de um Legal Framework com documentos obrigatórios e opcionais
    - Verificar responsividade em mobile
  - Validation: Modal exibe corretamente em todos os cenários
  - Dependencies: Sub-tarefas 1.1 e 1.2

#### Quality Checklist:

- [x] TypeScript types corretos (dados já tipados na query)
- [x] i18n keys utilizadas para todo texto visível
- [x] Componentes reutilizáveis da UI library
- [x] Clean code principles seguidos
- [x] Mobile responsiveness implementada (badges devem quebrar linha se necessário)
- [x] Touch-friendly (badges legíveis em mobile)

---

## Implementation Notes

### Dados já disponíveis

A query `legalFrameworks.get` (convex/legalFrameworks.ts linhas 84-129) JÁ retorna:

```typescript
{
  ...legalFramework,
  processTypes: [...],
  documentTypeAssociations: [
    {
      documentTypeId: Id<"documentTypes">,
      documentTypeName: string,
      documentTypeCode?: string,
      isRequired: boolean
    }
  ]
}
```

### CRUD já implementado

O CRUD completo de associações JÁ está implementado em:
- **Criar**: `legal-framework-form-dialog.tsx` com `DocumentTypeAssociationSection`
- **Ler**: Query `legalFrameworks.get` retorna as associações
- **Atualizar**: Formulário permite editar associações (linhas 310-334 de legalFrameworks.ts)
- **Deletar**: Desmarcar checkbox no formulário remove associação

### O que falta (apenas visualização)

Apenas falta mostrar visualmente os documentos associados no modal de VIEW (`legal-framework-view-modal.tsx`). O usuário pode:
1. Clicar no botão "Edit" do modal para ir ao formulário e fazer qualquer alteração (já funciona)
2. Ou, após esta task, ver diretamente no modal quais documentos estão associados

### Exemplo de implementação da seção

```typescript
// Adicionar após a seção "frameworkInformation"
{
  title: t("documentTypeAssociations"),
  icon: <FileText className="h-5 w-5" />,
  fields: legalFramework.documentTypeAssociations && legalFramework.documentTypeAssociations.length > 0
    ? legalFramework.documentTypeAssociations.map((assoc) => ({
        label: assoc.documentTypeName,
        value: (
          <Badge variant={assoc.isRequired ? "default" : "secondary"}>
            {assoc.isRequired ? t("required") : tCommon("optional")}
          </Badge>
        ),
        icon: <FileText className="h-4 w-4" />,
      }))
    : [
        {
          label: tCommon("noResults"),
          value: "-",
          fullWidth: true,
        }
      ],
}
```

### Mobile Responsiveness

- Use `fullWidth: true` para campos que precisam de mais espaço
- Badges devem ter classes responsivas do Tailwind (`text-xs sm:text-sm`)
- Container deve permitir quebra de linha se necessário

---

## Definition of Done

- [x] Modal de visualização mostra lista de tipos de documentos associados
- [x] Badges indicam corretamente se documento é obrigatório ou opcional
- [x] Mensagem apropriada quando não há documentos associados
- [x] Interface responsiva em mobile, tablet e desktop
- [x] Todas as strings usam i18n
- [x] TypeScript sem erros
- [x] Código revisado e clean
- [x] Testado manualmente em diferentes cenários

---

## Notas Adicionais

**Por que não precisa criar novos endpoints:**
- A query `legalFrameworks.get` já retorna todos os dados necessários
- O CRUD já funciona perfeitamente no formulário de edição
- Apenas falta a visualização no modal de view

**Por que esta é uma task simples:**
- 90% da funcionalidade já existe
- Apenas adicionar uma seção visual no modal existente
- Não requer novos componentes complexos
- Não requer novos endpoints backend

**Estimativa de tempo:**
- Task 1.1: ~30 minutos
- Task 1.2: ~10 minutos
- Task 1.3: ~15 minutos
- **Total**: ~1 hora
