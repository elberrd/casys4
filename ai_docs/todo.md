# TODO: Wizard de Criação de Processos (Individual e Coletivo)

## Context

Implementar um wizard multi-step em formato de página (não modal) para criar novos processos individuais ou coletivos no sistema CASYS4. O wizard deve guiar o usuário através de etapas sequenciais, permitindo escolher o tipo de processo e preencher os dados necessários. Ao final, deve criar automaticamente o status inicial "em preparação" com a data da solicitação.

## Status: COMPLETED ✅

Todas as tarefas foram implementadas com sucesso.

---

## Tasks Checklist

### 1. Estrutura Base do Wizard
- [x] Criar rota da página `/app/[locale]/(dashboard)/process-wizard/page.tsx`
- [x] Criar componente principal `ProcessWizardPage`
- [x] Criar layout com stepper visual `WizardLayout`
- [x] Implementar hook de gerenciamento de estado `useWizardState`
- [x] Criar schemas de validação Zod em `/lib/validations/process-wizard.ts`

### 2. Step 1 - Seleção de Tipo de Processo
- [x] Criar componente `Step1ProcessType`
- [x] Implementar cards de seleção (Individual/Coletivo)
- [x] Navegar automaticamente para próximo step ao selecionar

### 3. Fluxo Individual - Steps 2.1, 2.2 e 2.3
- [x] Criar `Step2_1RequestDetailsIndividual` (Detalhes da Solicitação)
  - [x] Campo Data da Solicitação (default: hoje)
  - [x] Campo Solicitante (UserApplicantSelector)
  - [x] Campo Consulado (Combobox)
  - [x] Campo Candidato (PersonSelectorWithDetail)
- [x] Criar `Step2_2ProcessData` (Dados do Processo)
  - [x] Campo Tipo de Autorização
  - [x] Campo Amparo Legal (filtrado por tipo)
  - [x] Campo Empresa Requerente (opcional para individual)
  - [x] Campos de Data Limite condicionais
- [x] Criar `Step2_3ConfirmationIndividual` (Confirmação)
  - [x] Exibir resumo de todos os dados
  - [x] Botão de submissão

### 4. Fluxo Coletivo - Steps 3.1, 3.2, 3.3 e 3.4
- [x] Criar `Step3_1RequestDetailsCollective` (Detalhes da Solicitação)
  - [x] Campo Data da Solicitação
  - [x] Campo Solicitante
  - [x] Campo Consulado
  - [x] SEM campo de candidato (diferença do individual)
- [x] Reutilizar `Step2_2ProcessData` para Step 3.2
  - [x] Empresa obrigatória para coletivo
  - [x] Validação diferenciada (processDataCollectiveSchema)
- [x] Criar `Step3_3CandidatesCollective` (Candidatos)
  - [x] Resumo não editável no topo
  - [x] Tabela de candidatos adicionados
  - [x] Formulário para adicionar novo candidato
  - [x] Botão para criar contato inline (QuickPersonFormDialog)
  - [x] Remoção de candidatos
- [x] Criar `Step3_4ConfirmationCollective` (Confirmação)
  - [x] Resumo dos dados do processo
  - [x] Tabela com lista de candidatos

### 5. Validações
- [x] Schema Zod para seleção de tipo de processo
- [x] Schema Zod para detalhes da solicitação (com e sem candidato)
- [x] Schema Zod para dados do processo (empresa opcional)
- [x] Schema Zod para dados do processo coletivo (empresa obrigatória)
- [x] Schema Zod para lista de candidatos
- [x] Funções de validação por step

### 6. Gerenciamento de Estado (useWizardState)
- [x] Estado do step atual
- [x] Dados do wizard completo
- [x] Navegação entre steps (next/previous/goTo)
- [x] Tracking de steps visitados
- [x] Validação antes de avançar
- [x] Reset do wizard
- [x] Seleção de tipo de processo (limpa dados ao mudar)
- [x] Gerenciamento de candidatos (add/remove/update)
- [x] Flag de alterações não salvas

### 7. Submissão e Criação de Processos
- [x] Criação de processo individual via mutation
- [x] Criação de processo coletivo via mutation
- [x] Para coletivo: criar processo coletivo PRIMEIRO
- [x] Para coletivo: criar processos individuais com collectiveProcessId
- [x] Status inicial "em preparação" automático
- [x] Buscar cityId da empresa para workplaceCityId
- [x] Redirecionamento após criação
- [x] Toast de sucesso/erro

### 8. Traduções (i18n)
- [x] Adicionar namespace "ProcessWizard" em messages/pt.json
- [x] Adicionar namespace "ProcessWizard" em messages/en.json
- [x] ~70 chaves de tradução adicionadas

### 9. Integração com Dashboard e Páginas
- [x] Botão "Adicionar Processo" no Dashboard (admin only)
- [x] Botão "Criar" na página de Processos Individuais redireciona para wizard

### 10. Correções de TypeScript
- [x] Fix: `z.enum` com `message` ao invés de `required_error` (Zod 4)
- [x] Fix: Combobox `onValueChange` retorna `T | undefined` - adicionar `?? ""`
- [x] Fix: Remover prop `excludeIds` inexistente do PersonSelectorWithDetail

### 11. UX e Navegação
- [x] Stepper visual mostrando progresso
- [x] Botões Anterior/Próximo/Criar
- [x] Diálogo de confirmação ao sair com dados não salvos
- [x] Desabilitar navegação para steps não visitados

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `/app/[locale]/(dashboard)/process-wizard/page.tsx` | Página do wizard |
| `/components/process-wizard/process-wizard-page.tsx` | Componente principal |
| `/components/process-wizard/wizard-layout.tsx` | Layout com stepper |
| `/components/process-wizard/use-wizard-state.ts` | Hook de estado |
| `/components/process-wizard/step1-process-type.tsx` | Step 1: Tipo |
| `/components/process-wizard/step2-1-request-details-individual.tsx` | Step 2.1: Detalhes Individual |
| `/components/process-wizard/step2-2-process-data.tsx` | Step 2.2/3.2: Dados |
| `/components/process-wizard/step2-3-confirmation-individual.tsx` | Step 2.3: Confirmação Individual |
| `/components/process-wizard/step3-1-request-details-collective.tsx` | Step 3.1: Detalhes Coletivo |
| `/components/process-wizard/step3-3-candidates-collective.tsx` | Step 3.3: Candidatos |
| `/components/process-wizard/step3-4-confirmation-collective.tsx` | Step 3.4: Confirmação Coletivo |
| `/lib/validations/process-wizard.ts` | Schemas Zod |

## Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `/messages/pt.json` | Adicionado namespace ProcessWizard |
| `/messages/en.json` | Adicionado namespace ProcessWizard |
| `/app/[locale]/(dashboard)/dashboard/dashboard-client.tsx` | Botão "Adicionar Processo" |
| `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` | Botão "Criar" → wizard |

---

## Notas Técnicas

- O wizard usa um hook customizado `useWizardState` para gerenciar o estado
- Validações Zod diferentes para Individual (empresa opcional) vs Coletivo (empresa obrigatória)
- O processo coletivo usa o `cityId` da empresa como `workplaceCityId`
- Confirmação de saída se houver dados não salvos
- Navegação entre steps com validação
- Processo coletivo é criado PRIMEIRO, depois os processos individuais são criados com o collectiveProcessId
