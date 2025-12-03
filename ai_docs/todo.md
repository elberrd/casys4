# TODO: Implementar Proteção contra Perda de Dados em Modais e Formulários

## Status: CONCLUÍDO

## Resumo da Implementação

A funcionalidade de proteção contra perda de dados foi implementada com sucesso em todos os formulários e modais do aplicativo.

### Arquivos Criados

1. `/hooks/use-unsaved-changes.ts` - Hook customizado para detectar mudanças não salvas
2. `/components/ui/unsaved-changes-dialog.tsx` - Componente de dialog de confirmação profissional

### Traduções Adicionadas

- `/messages/pt.json` - Seção "UnsavedChanges" com textos em português
- `/messages/en.json` - Seção "UnsavedChanges" com textos em inglês

### Componentes Modificados

#### Dialogs Críticos (Fase 1)
- [x] `/components/people/person-form-dialog.tsx`
- [x] `/components/companies/company-form-dialog.tsx`
- [x] `/components/individual-processes/individual-process-form-dialog.tsx`

#### Dialogs Secundários (Fase 2)
- [x] `/components/countries/country-form-dialog.tsx`
- [x] `/components/cbo-codes/cbo-code-form-dialog.tsx`
- [x] `/components/document-types/document-type-form-dialog.tsx`
- [x] `/components/states/state-form-dialog.tsx`
- [x] `/components/cities/city-form-dialog.tsx`
- [x] `/components/case-statuses/case-status-form-dialog.tsx`
- [x] `/components/process-types/process-type-form-dialog.tsx`
- [x] `/components/passports/passport-form-dialog.tsx`
- [x] `/components/people-companies/person-company-form-dialog.tsx`
- [x] `/components/documents/document-form-dialog.tsx`
- [x] `/components/legal-frameworks/legal-framework-form-dialog.tsx`
- [x] `/components/economic-activities/economic-activity-form-dialog.tsx`
- [x] `/components/consulates/consulate-form-dialog.tsx`
- [x] `/components/collective-processes/collective-process-form-dialog.tsx`

#### Quick-Create Dialogs
- [x] `/components/individual-processes/quick-person-form-dialog.tsx`
- [x] `/components/cities/quick-city-form-dialog.tsx`
- [x] `/components/individual-processes/quick-company-applicant-form-dialog.tsx`
- [x] `/components/individual-processes/quick-user-applicant-form-dialog.tsx`
- [x] `/components/individual-processes/quick-consulate-form-dialog.tsx`
- [x] `/components/countries/country-quick-create-dialog.tsx`
- [x] `/components/companies/company-quick-create-dialog.tsx`
- [x] `/components/economic-activities/economic-activity-quick-create-dialog.tsx`

#### Outros Dialogs
- [x] `/components/tasks/task-form-dialog.tsx`
- [x] `/components/notes/note-form-dialog.tsx`
- [x] `/components/users/edit-user-dialog.tsx`
- [x] `/components/users/create-user-dialog.tsx`

#### Process Wizard
- [x] `/components/process-wizard/wizard-layout.tsx` - Proteção contra navegação do browser (beforeunload) e navegação via menu
- O wizard já tinha proteção nativa via `hasUnsavedChanges` no hook `useWizardState`

#### Sistema de Bloqueio de Navegação (Novo)
- [x] `/contexts/navigation-blocker-context.tsx` - Contexto para bloquear navegação em toda a aplicação
- [x] `/components/ui/safe-link.tsx` - Componente Link que respeita o bloqueio de navegação
- [x] `/app/[locale]/(dashboard)/layout.tsx` - Provider adicionado ao layout do dashboard
- [x] `/components/nav-main.tsx` - Links substituídos por SafeLink
- [x] `/components/nav-projects.tsx` - Links substituídos por SafeLink

### Como Usar em Novos Componentes

```typescript
// 1. Importar o hook e o componente
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

// 2. Usar o hook após definir o form
const form = useForm<FormData>({...})

const {
  showUnsavedDialog,
  setShowUnsavedDialog,
  handleOpenChange,
  handleConfirmClose,
  handleCancelClose,
} = useUnsavedChanges({
  formState: form.formState,
  onConfirmedClose: () => {
    form.reset()
    onOpenChange(false)
  },
  isSubmitting: form.formState.isSubmitting,
})

// 3. Usar handleOpenChange no Dialog
return (
  <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Conteúdo do dialog */}
    </Dialog>

    <UnsavedChangesDialog
      open={showUnsavedDialog}
      onOpenChange={setShowUnsavedDialog}
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
  </>
)
```

### Funcionalidades

- Detecta automaticamente quando o formulário tem mudanças não salvas via `formState.isDirty`
- Intercepta tentativas de fechar o modal quando há mudanças
- Mostra dialog de confirmação profissional com botões claros
- Suporta i18n (português e inglês)
- Mobile-friendly com botões touch-friendly
- No Process Wizard, também protege contra navegação do browser (beforeunload event)
- **Novo:** Sistema de bloqueio de navegação via menu sidebar

### Como Usar em Páginas/Componentes Não-Dialog

Para páginas ou componentes que precisam bloquear navegação (como o Process Wizard):

```typescript
import { useBlockNavigation } from "@/contexts/navigation-blocker-context"

function MyPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Callback executado quando o usuário confirma que quer sair
  const handleConfirmLeave = useCallback(() => {
    // Limpar estado, reset de form, etc.
    setHasUnsavedChanges(false)
  }, [])

  // Isso bloqueará navegação via menu quando hasUnsavedChanges for true
  useBlockNavigation(hasUnsavedChanges, handleConfirmLeave)

  return <div>...</div>
}
```

### Como Funciona o Sistema de Navegação

1. `NavigationBlockerProvider` - Contexto que gerencia o estado de bloqueio
2. `SafeLink` - Componente que substitui `Link` na navegação e verifica se está bloqueado
3. `useBlockNavigation` - Hook que registra quando há mudanças não salvas
