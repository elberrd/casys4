# Tasks - Campo Consulado em Processo Individual

## Tarefas Concluídas

### 1. Atualizar Schema do Banco de Dados ✅
- [x] Adicionado campo `consulateId: v.optional(v.id("consulates"))` na tabela `individualProcesses` em `convex/schema.ts`
- [x] Adicionado índice `by_consulate` para consultas por consulado

### 2. Atualizar Validação Zod ✅
- [x] Adicionado `consulateId` no schema Zod em `lib/validations/individualProcesses.ts`
- [x] Seguindo o mesmo padrão dos outros campos opcionais

### 3. Atualizar Backend Convex ✅
- [x] Atualizada mutation `create` em `convex/individualProcesses.ts` para aceitar `consulateId`
- [x] Atualizada mutation `update` para aceitar `consulateId`
- [x] Atualizadas queries `list` e `get` para enriquecer com dados do consulado (cidade, estado, país)

### 4. Adicionar Traduções ✅
- [x] Adicionadas em `messages/pt.json` na seção `IndividualProcesses`:
  - `consulate`, `selectConsulate`, `searchConsulates`, `noConsulatesFound`, `consulateDescription`, `quickAddConsulate`, `clearConsulate`
- [x] Adicionados equivalentes em `messages/en.json`

### 5. Criar Quick Add Dialog para Consulado ✅
- [x] Criado `components/individual-processes/quick-consulate-form-dialog.tsx`
- [x] Seguindo o padrão de `quick-company-applicant-form-dialog.tsx`
- [x] Incluindo campos: cidade, endereço, telefone, email, website

### 6. Atualizar Formulário de Processo Individual (Form Page) ✅
- [x] Adicionado import do QuickConsulateFormDialog
- [x] Adicionado useQuery para lista de consulados
- [x] Adicionado state para controlar dialog: `quickConsulateDialogOpen`
- [x] Adicionado campo `consulateId` no defaultValues do form
- [x] Adicionado campo `consulateId` no useEffect de reset
- [x] Adicionado `consulateId` no submitData
- [x] Adicionado FormField para Consulado após "Empresa Requerente"
  - Com Combobox para seleção
  - Com botão "Adicionar Consulado Rápido"
  - Com FormDescription explicativa
- [x] Adicionado handler para QuickConsulate success
- [x] Adicionado QuickConsulateFormDialog no final do componente

### 7. Atualizar Formulário em Dialog ✅
- [x] Atualizado `individual-process-form-dialog.tsx` com campo Consulado

### 8. Testes ✅
- [x] Build do Convex passou com sucesso
- [x] Verificação de TypeScript (erros específicos do individual-process foram resolvidos)
