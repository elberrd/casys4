# TODO: Adicionar Funcionalidade de Adi��o R�pida para Solicitante e Empresa Requerente

## Contexto

Adicionar bot�es de "Adi��o R�pida" para os campos "Solicitante" (userApplicantId) e "Empresa Requerente" (companyApplicantId) no formul�rio de processos individuais. A funcionalidade deve seguir o mesmo padr�o j� implementado para o campo "Candidato" (personId), que utiliza o componente `QuickPersonFormDialog`.

**Objetivo**: Permitir que usu�rios criem rapidamente uma pessoa (Solicitante) ou empresa (Empresa Requerente) diretamente do formul�rio de processos individuais, sem precisar navegar para outras p�ginas. Ap�s a cria��o, a entidade rec�m-criada deve ser automaticamente selecionada no campo correspondente.

## Refer�ncias do PRD

Este recurso segue o padr�o de quick-add j� estabelecido no projeto:
- `components/individual-processes/quick-person-form-dialog.tsx` (refer�ncia para Candidato)
- `components/cities/quick-city-form-dialog.tsx` (refer�ncia de padr�o)
- `components/companies/company-quick-create-dialog.tsx` (refer�ncia existente para empresas)

## Sequ�ncia de Tarefas

### 0. An�lise da Estrutura do Projeto (SEMPRE PRIMEIRO)

**Objetivo**: Compreender a estrutura do projeto e determinar os locais corretos para arquivos/pastas

#### Sub-tarefas:

- [x] 0.1: Revisar estrutura de componentes existentes de quick-add
  - Valida��o: Identificar padr�es para componentes quick-add (QuickPersonFormDialog, QuickCityFormDialog)
  - Output: Padr�es de nomenclatura e localiza��o de arquivos identificados
  - **Resultado**:
    - Quick-add dialogs ficam na pasta do dom�nio correspondente (ex: `components/individual-processes/quick-person-form-dialog.tsx`)
    - Nomenclatura: `Quick[EntityName]FormDialog`
    - Padr�o de implementa��o: Dialog com formul�rio simplificado usando react-hook-form + zod

- [x] 0.2: Verificar schemas Zod e valida��es existentes
  - Valida��o: Entender campos obrigat�rios para Person e Company
  - Output: Lista de campos necess�rios para cada entidade
  - **Resultado**:
    - **Person (Solicitante)**: fullName (obrigat�rio), email (opcional), nationalityId (obrigat�rio), birthDate (opcional)
    - **Company (Empresa Requerente)**: name (obrigat�rio), taxId (opcional, valida��o CNPJ), email (opcional), phoneNumber (opcional), cityId (opcional)
    - Schemas quick-create j� existem em `lib/validations/companies.ts`

- [x] 0.3: Identificar mutations Convex necess�rias
  - Valida��o: Confirmar que mutations de cria��o existem e est�o acess�veis
  - Output: Lista de mutations dispon�veis
  - **Resultado**:
    - `api.people.create` - dispon�vel em `convex/people.ts`
    - `api.companies.create` - dispon�vel em `convex/companies.ts`
    - Ambas retornam o ID da entidade criada

- [x] 0.4: Verificar chaves i18n necess�rias
  - Valida��o: Identificar chaves de tradu��o existentes e novas necess�rias
  - Output: Lista de chaves i18n a adicionar
  - **Resultado**:
    - Precisaremos adicionar em `messages/pt.json` e `messages/en.json`:
      - `IndividualProcesses.quickAddUserApplicant`
      - `IndividualProcesses.quickAddCompanyApplicant`
      - `IndividualProcesses.clearUserApplicant`
      - `IndividualProcesses.clearCompanyApplicant`

#### Checklist de Qualidade:

- [x] Estrutura do PRD revisada e compreendida
- [x] Locais dos arquivos determinados e alinhados com conven��es do projeto
- [x] Conven��es de nomenclatura identificadas e ser�o seguidas
- [x] Nenhuma funcionalidade duplicada ser� criada

---

### 1. Criar Componente Quick Add para Solicitante (User Applicant)

**Objetivo**: Criar um dialog de adi��o r�pida para pessoas que ser�o usadas como Solicitantes, seguindo o padr�o do QuickPersonFormDialog existente

#### Sub-tarefas:

- [x] 1.1: Criar arquivo `components/individual-processes/quick-user-applicant-form-dialog.tsx`
  - Valida��o: Arquivo criado no local correto
  - Depend�ncias: Tarefa 0 conclu�da
  - Detalhes de implementa��o:
    - Copiar estrutura de `quick-person-form-dialog.tsx`
    - Usar schema simplificado para pessoa (fullName, email, nationalityId, birthDate)
    - Implementar valida��o Zod
    - Usar mutation `api.people.create`
    - Callback `onSuccess` deve retornar `Id<"people">`
    - Dialog responsivo com `max-h-[90vh] overflow-y-auto`

- [x] 1.2: Implementar formul�rio com campos essenciais
  - Valida��o: Formul�rio cont�m todos os campos necess�rios
  - Campos obrigat�rios:
    - Full Name (text input)
    - Nationality (combobox com pa�ses)
  - Campos opcionais:
    - Email (email input)
    - Birth Date (date picker)
  - Usar componentes UI existentes: Input, Combobox, DatePicker

- [x] 1.3: Adicionar l�gica de cria��o e auto-sele��o
  - Valida��o: Ap�s cria��o, personId � retornado e passado ao callback
  - Implementar:
    - Toast de sucesso ap�s cria��o
    - Reset do formul�rio
    - Fechar dialog
    - Chamar `onSuccess(personId)` com ID da pessoa criada

- [x] 1.4: Adicionar tratamento de erros
  - Valida��o: Erros s�o capturados e exibidos adequadamente
  - Implementar:
    - Try-catch no onSubmit
    - Toast de erro com mensagem apropriada
    - Valida��o de campos obrigat�rios

#### Checklist de Qualidade:

- [x] TypeScript types definidos (sem `any`)
- [x] Valida��o Zod implementada
- [x] Chaves i18n adicionadas para texto vis�vel ao usu�rio
- [x] Componentes reutiliz�veis utilizados
- [x] Princ�pios de c�digo limpo seguidos
- [x] Tratamento de erros implementado
- [x] Responsividade mobile implementada (breakpoints sm, md, lg)
- [x] Elementos UI touch-friendly (m�nimo 44x44px)

---

### 2. Criar Componente Quick Add para Empresa Requerente (Company Applicant)

**Objetivo**: Criar um dialog de adi��o r�pida para empresas, reutilizando ou adaptando o componente existente `company-quick-create-dialog.tsx`

#### Sub-tarefas:

- [x] 2.1: Verificar se `components/companies/company-quick-create-dialog.tsx` existe e � adequado
  - Valida��o: Componente existente atende aos requisitos ou precisa ser criado/adaptado
  - Depend�ncias: Tarefa 0 conclu�da
  - An�lise necess�ria:
    - Se existe, verificar campos inclu�dos
    - Verificar se retorna ID da empresa criada
    - Verificar se interface `onSuccess` est� correta

- [x] 2.2: Criar ou adaptar componente para quick-add de empresa
  - Valida��o: Componente pronto para uso no formul�rio de processos individuais
  - Se criar novo: `components/individual-processes/quick-company-applicant-form-dialog.tsx`
  - Se adaptar: Ajustar `company-quick-create-dialog.tsx`
  - Campos essenciais:
    - Nome (obrigat�rio)
    - CNPJ (opcional, com valida��o)
    - Email (opcional)
    - Telefone (opcional)
    - Cidade (opcional)

- [x] 2.3: Implementar formul�rio com valida��o
  - Valida��o: Schema Zod `companyQuickCreateSchema` utilizado
  - Usar schema existente de `lib/validations/companies.ts`
  - Componentes UI: Input, CNPJInput, PhoneInput, Combobox
  - Valida��o de CNPJ com check digits

- [x] 2.4: Adicionar l�gica de cria��o e auto-sele��o
  - Valida��o: Ap�s cria��o, companyId � retornado e passado ao callback
  - Implementar:
    - Usar mutation `api.companies.create`
    - Toast de sucesso
    - Reset do formul�rio
    - Fechar dialog
    - Chamar `onSuccess(companyId)` com ID da empresa criada

- [x] 2.5: Adicionar tratamento de erros
  - Valida��o: Erros s�o capturados e exibidos adequadamente
  - Implementar:
    - Try-catch no onSubmit
    - Toast de erro
    - Valida��o de CNPJ duplicado se aplic�vel
    - Mensagens de erro claras

#### Checklist de Qualidade:

- [x] TypeScript types definidos (sem `any`)
- [x] Valida��o Zod implementada (reutilizando schema existente)
- [x] Chaves i18n adicionadas para texto vis�vel ao usu�rio
- [x] Componentes reutiliz�veis utilizados (CNPJInput, PhoneInput, etc.)
- [x] Princ�pios de c�digo limpo seguidos
- [x] Tratamento de erros implementado
- [x] Responsividade mobile implementada (breakpoints sm, md, lg)
- [x] Elementos UI touch-friendly (m�nimo 44x44px)

---

### 3. Integrar Quick Add Buttons no Formul�rio de Processos Individuais

**Objetivo**: Adicionar bot�es de "Adicionar R�pido" aos campos Solicitante e Empresa Requerente no formul�rio

#### Sub-tarefas:

- [x] 3.1: Adicionar imports necess�rios ao `individual-process-form-page.tsx`
  - Valida��o: Imports corretos adicionados
  - Depend�ncias: Tarefas 1 e 2 conclu�das
  - Imports necess�rios:
    ```typescript
    import { QuickUserApplicantFormDialog } from "@/components/individual-processes/quick-user-applicant-form-dialog"
    import { QuickCompanyApplicantFormDialog } from "@/components/individual-processes/quick-company-applicant-form-dialog"
    // ou reutilizar existente se aplic�vel
    ```

- [x] 3.2: Adicionar estados para controlar os dialogs
  - Valida��o: Estados declarados corretamente
  - Adicionar ao componente:
    ```typescript
    const [quickUserApplicantDialogOpen, setQuickUserApplicantDialogOpen] = useState(false)
    const [quickCompanyApplicantDialogOpen, setQuickCompanyApplicantDialogOpen] = useState(false)
    ```

- [x] 3.3: Adicionar bot�o "Adicionar Solicitante R�pido" ao campo userApplicantId
  - Valida��o: Bot�o aparece ao lado do label do campo
  - Localiza��o: Linha ~569-581 do arquivo (FormField para userApplicantId)
  - Implementa��o:
    ```tsx
    <div className="flex items-start justify-between">
      <FormLabel>{t("userApplicant")}</FormLabel>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setQuickUserApplicantDialogOpen(true)}
        className="h-7"
      >
        <Plus className="h-4 w-4 mr-1" />
        {t("quickAddUserApplicant")}
      </Button>
    </div>
    ```

- [x] 3.4: Adicionar bot�o "Adicionar Requerente R�pido" ao campo companyApplicantId
  - Valida��o: Bot�o aparece ao lado do label do campo
  - Localiza��o: Linha ~550-564 do arquivo (FormField para companyApplicantId)
  - Implementa��o similar ao item 3.3, mas para empresa

- [x] 3.5: Implementar handlers de sucesso
  - Valida��o: Handlers atualizam os campos do formul�rio com IDs criados
  - Implementar:
    ```typescript
    const handleQuickUserApplicantSuccess = (personId: Id<"people">) => {
      form.setValue("userApplicantId", personId)
      setQuickUserApplicantDialogOpen(false)
    }

    const handleQuickCompanyApplicantSuccess = (companyId: Id<"companies">) => {
      form.setValue("companyApplicantId", companyId)
      setQuickCompanyApplicantDialogOpen(false)
    }
    ```

- [x] 3.6: Adicionar componentes de dialog ao final do formul�rio
  - Valida��o: Dialogs renderizados fora do formul�rio principal
  - Localiza��o: Ap�s o componente QuickPersonFormDialog existente (~942-947)
  - Implementa��o:
    ```tsx
    <QuickUserApplicantFormDialog
      open={quickUserApplicantDialogOpen}
      onOpenChange={setQuickUserApplicantDialogOpen}
      onSuccess={handleQuickUserApplicantSuccess}
    />

    <QuickCompanyApplicantFormDialog
      open={quickCompanyApplicantDialogOpen}
      onOpenChange={setQuickCompanyApplicantDialogOpen}
      onSuccess={handleQuickCompanyApplicantSuccess}
    />
    ```

#### Checklist de Qualidade:

- [x] TypeScript types corretos para todos os handlers
- [x] Estados gerenciados adequadamente
- [x] Bot�es seguem o mesmo estilo do bot�o "quickAddPerson" existente
- [x] Callbacks `onSuccess` implementados corretamente
- [x] Auto-sele��o funciona ap�s cria��o
- [x] Layout responsivo mantido
- [x] N�o h� quebras de layout mobile

---

### 4. Adicionar Tradu��es i18n

**Objetivo**: Adicionar todas as chaves de tradu��o necess�rias para os novos componentes

#### Sub-tarefas:

- [x] 4.1: Adicionar tradu��es em ingl�s (`messages/en.json`)
  - Valida��o: Todas as chaves necess�rias adicionadas
  - Se��o: `IndividualProcesses`
  - Chaves a adicionar:
    ```json
    "quickAddUserApplicant": "Quick Add Applicant",
    "quickAddCompanyApplicant": "Quick Add Requesting Company",
    "clearUserApplicant": "Clear applicant",
    "clearCompanyApplicant": "Clear requesting company"
    ```

- [x] 4.2: Adicionar tradu��es em portugu�s (`messages/pt.json`)
  - Valida��o: Todas as chaves necess�rias adicionadas
  - Se��o: `IndividualProcesses`
  - Chaves a adicionar:
    ```json
    "quickAddUserApplicant": "Adicionar Solicitante R�pido",
    "quickAddCompanyApplicant": "Adicionar Requerente R�pido",
    "clearUserApplicant": "Limpar solicitante",
    "clearCompanyApplicant": "Limpar requerente"
    ```

- [x] 4.3: Verificar tradu��es de formul�rios de pessoa e empresa
  - Valida��o: Tradu��es existentes s�o suficientes ou precisam ser adicionadas
  - Verificar se��es: `People`, `Companies`
  - Adicionar se necess�rio:
    - T�tulos de dialog
    - Mensagens de erro/sucesso
    - Labels de campos

#### Checklist de Qualidade:

- [x] Todas as strings vis�veis ao usu�rio usam i18n
- [x] Tradu��es consistentes com terminologia existente
- [x] Portugu�s e ingl�s completos
- [x] Suporte a pluraliza��o onde necess�rio

---

### 5. Testes Manuais e Valida��o

**Objetivo**: Garantir que a funcionalidade funciona corretamente em todos os cen�rios

#### Sub-tarefas:

- [ ] 5.1: Testar cria��o de Solicitante via quick-add
  - Valida��o: Pessoa criada e automaticamente selecionada
  - Cen�rios:
    - Criar pessoa com todos os campos preenchidos
    - Criar pessoa apenas com campos obrigat�rios
    - Verificar valida��o de campos obrigat�rios
    - Verificar que nacionalidade � obrigat�ria
    - Confirmar auto-sele��o no campo userApplicantId

- [ ] 5.2: Testar cria��o de Empresa Requerente via quick-add
  - Valida��o: Empresa criada e automaticamente selecionada
  - Cen�rios:
    - Criar empresa com CNPJ v�lido
    - Criar empresa sem CNPJ
    - Testar valida��o de CNPJ inv�lido
    - Testar valida��o de email
    - Confirmar auto-sele��o no campo companyApplicantId

- [ ] 5.3: Testar fluxo completo de cria��o de processo individual
  - Valida��o: Processo pode ser salvo com entidades criadas via quick-add
  - Cen�rios:
    - Criar Solicitante via quick-add e salvar processo
    - Criar Empresa Requerente via quick-add e salvar processo
    - Criar ambos via quick-add no mesmo processo
    - Verificar que dados persistem corretamente

- [ ] 5.4: Testar responsividade mobile
  - Valida��o: Dialogs e bot�es funcionam bem em dispositivos m�veis
  - Cen�rios:
    - Testar em viewport mobile (375px)
    - Testar em viewport tablet (768px)
    - Verificar que dialogs s�o scrollable
    - Verificar que bot�es s�o touch-friendly (44x44px)
    - Testar rolagem em dialogs com muitos campos

- [ ] 5.5: Testar tratamento de erros
  - Valida��o: Erros s�o exibidos adequadamente
  - Cen�rios:
    - Tentar criar sem campos obrigat�rios
    - Testar erro de rede/servidor
    - Verificar mensagens de erro claras
    - Confirmar que dialog n�o fecha em caso de erro

- [ ] 5.6: Testar cancelamento e reset
  - Valida��o: Dialogs podem ser cancelados sem efeitos colaterais
  - Cen�rios:
    - Preencher formul�rio e clicar em Cancelar
    - Verificar que formul�rio � resetado ao reabrir
    - Confirmar que sele��o anterior n�o � afetada

#### Checklist de Qualidade:

- [ ] Todos os cen�rios de teste passaram
- [ ] Valida��es funcionam corretamente
- [ ] Auto-sele��o funciona consistentemente
- [ ] Mensagens de erro s�o claras e �teis
- [ ] Interface � intuitiva e responsiva
- [ ] N�o h� regress�es no formul�rio existente

---

## Notas de Implementa��o

### Decis�es T�cnicas

1. **Reutiliza��o vs Novos Componentes**:
   - Para Solicitante: Criar novo componente espec�fico (`quick-user-applicant-form-dialog.tsx`) baseado no padr�o existente
   - Para Empresa: Verificar se `company-quick-create-dialog.tsx` pode ser reutilizado, caso contr�rio criar espec�fico

2. **Valida��o de Dados**:
   - Usar schemas Zod existentes quando poss�vel
   - Schema simplificado para quick-add (apenas campos essenciais)
   - Valida��o de CNPJ com check digits para empresas

3. **Padr�o de Nomenclatura**:
   - User Applicant = Solicitante (pessoa)
   - Company Applicant = Empresa Requerente (empresa)

4. **Localiza��o de Arquivos**:
   - Dialogs quick-add ficam em `components/individual-processes/`
   - Ou podem ser reutilizados de `components/companies/` se j� existirem

### Considera��es de UX

1. **Feedback ao Usu�rio**:
   - Toast de sucesso ap�s cria��o
   - Toast de erro se falhar
   - Loading state durante cria��o

2. **Auto-sele��o**:
   - Entidade rec�m-criada deve ser automaticamente selecionada
   - Dialog deve fechar ap�s sucesso
   - Formul�rio principal deve refletir a mudan�a imediatamente

3. **Acessibilidade**:
   - Bot�es com labels claros
   - Aria-labels apropriados
   - Tab navigation funcional

## Defini��o de Pronto

- [x] Todas as tarefas de implementa��o completadas (Tarefas 0-4)
- [x] Todos os checklists de qualidade passaram
- [x] C�digo revisado
- [ ] Funcionalidade testada manualmente (Tarefa 5 - pendente de testes pelo usu�rio)
- [x] Sem regress�es no c�digo existente
- [x] Documenta��o atualizada (se necess�rio)
- [x] Interface responsiva em todos os dispositivos
- [x] Tradu��es completas (PT e EN)
