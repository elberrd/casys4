# TODO: Implementar Edição de Views (Filtros Salvos) com Modo de Edição Visual

## Context

O usuário solicitou as seguintes mudanças na página "Processos Individuais":

1. Mudar o texto "Filtros Salvos" para "Views Salvas"
2. Quando uma View (antigo filtro) for selecionada para edição:
   - Edição inline do nome dentro do dropdown
   - Página inteira com visual azul indicando modo de edição
   - Banner no topo com botões Cancelar e Salvar Alterações
   - Usuário pode modificar os filtros na página enquanto está em modo de edição
   - Ao salvar, tanto o nome quanto os filtros modificados são salvos

## Implementation Summary

### Completed Tasks:

- [x] 1. **Traduções atualizadas (i18n)**
  - "Filtros Salvos" → "Views Salvas" em pt.json e en.json
  - Adicionadas chaves: `editMode`, `editModeDescription`, `saveChanges`

- [x] 2. **Backend verificado**
  - A mutation `update` em `convex/savedFilters.ts` já aceita `filterCriteria` opcional

- [x] 3. **SavedFiltersList atualizado**
  - Novas props: `editingViewId`, `editingViewName`, `onEditingViewNameChange`, `onCancelEdit`, `onSaveEdit`
  - Input inline para editar nome quando em modo de edição
  - Visual azul no item sendo editado
  - Botões Check (salvar) e X (cancelar) inline

- [x] 4. **individual-processes-client.tsx atualizado**
  - Estado `isEditingView` e `editingViewName` adicionados
  - Mutation `updateSavedFilter` para salvar alterações
  - `handleEditFilter` aplica filtros e ativa modo de edição (não abre Sheet)
  - `handleCancelEditView` cancela edição
  - `handleSaveEditView` salva nome + critérios de filtro
  - Visual azul na página inteira quando em modo de edição (`ring-2 ring-blue-500`)
  - Banner com botões Cancelar e Salvar Alterações

- [x] 5. **SaveFilterSheet simplificado**
  - Usado apenas para criar novas views
  - Removido código de modo de edição

- [x] 6. **TypeScript compila sem erros**

## Files Modified

- `messages/pt.json` - Traduções atualizadas para "Views Salvas"
- `messages/en.json` - Traduções atualizadas para "Saved Views"
- `components/saved-filters/saved-filters-list.tsx` - Edição inline
- `components/saved-filters/save-filter-sheet.tsx` - Simplificado (só criar)
- `app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` - Modo de edição visual na página

## New Edit Flow

1. Usuário clica no dropdown "Views Salvas"
2. Clica no ícone de lápis (editar) em uma view
3. Os filtros da view são aplicados na página
4. O item no dropdown fica azul com input para editar nome
5. A página inteira fica com borda azul e banner no topo
6. Usuário pode:
   - Editar o nome da view no dropdown
   - Modificar os filtros na página
   - Fechar o dropdown e continuar modificando filtros
7. Ao clicar em "Salvar Alterações" no banner:
   - Nome atualizado
   - Critérios de filtro atualizados com estado atual
8. Modo de edição é desativado

## Visual Design

**Dropdown - Item sendo editado:**
- Background: `bg-blue-50 dark:bg-blue-950/30`
- Border: `border-2 border-blue-500`
- Input inline para nome
- Botões Check (verde) e X

**Página em modo de edição:**
- Ring: `ring-2 ring-blue-500 ring-inset`
- Background: `bg-blue-50/30 dark:bg-blue-950/10`
- Banner: `bg-blue-100 dark:bg-blue-900/50 border-blue-300`

## Next Steps (Manual Testing)

- [ ] Testar seleção de view para edição
- [ ] Verificar edição inline do nome
- [ ] Verificar visual azul na página
- [ ] Testar modificação de filtros durante edição
- [ ] Testar salvamento de alterações
- [ ] Testar cancelamento
- [ ] Verificar responsividade mobile
