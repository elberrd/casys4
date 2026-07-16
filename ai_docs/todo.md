# TODO: Adicionar documento pendente diretamente à exigência mais recente

## Contexto

No detalhe do Processo Individual, quando o andamento mais recente for uma exigência e o administrador clicar em um documento pendente sem anexo, o sistema deve avisar sobre essa exigência e oferecer o vínculo direto do documento selecionado. Ao confirmar, o registro pendente deve ser movido para a exigência mais recente sem ser rejeitado nem gerar outra versão, e o fluxo normal de envio deve continuar. Ao recusar, o upload atual deve continuar fora da exigência.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revisar o PRD, o fluxo atual do botão global **Adicionar Documento**, o clique nas linhas pendentes e a imagem de referência.
  - Confirmado: `statusHistory[0]` e `latestExigencia` já representam o andamento mais recente; a imagem mostra documentos `not_started` fora do grupo da exigência.
- [x] 0.2: Confirmar os arquivos e padrões a reutilizar.
  - Modificar: `components/individual-processes/document-checklist-card.tsx`, `convex/documentsDelivered.ts`, `messages/pt.json` e `messages/en.json`.
  - Reutilizar: `components/ui/alert-dialog.tsx`, `DocumentUploadDialog`, `PendingDocumentUploadDialog` e os checks de `requireAdmin`.

### 1. Vincular o pendente com validação de domínio

- [x] 1.1: Criar uma mutation Convex específica e tipada para vincular um documento pendente sem anexo à exigência mais recente.
  - Validar args/returns, admin, existência, mesmo processo, `status === "not_started"`, ausência de arquivo, versão latest e alvo com código `exigencia`.
  - Revalidar dentro da transação que o andamento informado continua sendo o mais recente.
  - Validação: a mutation somente altera `individualProcessStatusId`; não rejeita, não cria versão e é idempotente para o mesmo vínculo.

### 2. Interceptar o clique do administrador

- [x] 2.1: Centralizar a ação atual das linhas/botões pendentes e interceptar linha e ícone de upload quando o último andamento for uma exigência.
  - Enquanto o histórico carrega, não permitir que o clique contorne a verificação.
  - Não interceptar cliente, documento já anexado, campo somente informativo ou documento já vinculado à mesma exigência.
- [x] 2.2: Exibir um `AlertDialog` específico com documento, nome e data da exigência.
  - **Sim**: executar a mutation e, após sucesso, continuar no dialog de upload do documento clicado.
  - **Não**: continuar a ação anterior sem criar vínculo.
  - Em erro: manter o aviso disponível, informar por toast e não abrir o upload.

### 3. Internacionalização e quality gates

- [x] 3.1: Adicionar as mensagens equivalentes em `messages/pt.json` e `messages/en.json`, reutilizando `Common.yes/no`.
- [x] 3.2: Executar `pnpm exec tsc --noEmit`, lint focado, `pnpm lint` e `pnpm run build`, separando débitos preexistentes.
  - `pnpm exec tsc --noEmit` e `pnpm run build` passaram; o build gerou as 89 páginas e manteve apenas o warning preexistente do seletor CSS gerado.
  - O lint focado e `pnpm lint` continuam bloqueados somente pelos débitos já existentes (`no-explicit-any`, variáveis não usadas e `prefer-const`) nos arquivos longos/repositório; nenhuma ocorrência veio das linhas novas.
- [x] 3.3: Validar no browser autenticado em pt/en: **Sim**, **Não**, linha, ícone de upload, último andamento não-exigência e responsividade/teclado.
  - PT/EN: o alerta acessível exibiu documento, exigência e data traduzidos; **Não** abriu o envio sem criar vínculo.
  - **Sim** moveu o mesmo registro de `Documentos Pendentes` (5 -> 4) para a exigência (2 -> 3) e abriu `Enviar Documento`, inclusive para um registro com versões antigas; o dado foi desvinculado ao final (4 -> 5 e 3 -> 2).
  - Em processo cujo último andamento era `Em Preparação`, o clique abriu o envio diretamente, sem alerta. Linha e ícones de envio usam o mesmo handler; o diálogo usa `AlertDialog`/Radix e foi exposto corretamente como `alertdialog` no teste de acessibilidade do browser.

## Definition of Done

- [x] Documento pendente sem anexo oferece vínculo direto apenas quando a exigência é o andamento mais recente.
- [x] A confirmação move o mesmo registro para a exigência sem rejeição/versão extra e continua o upload.
- [x] A recusa preserva o fluxo anterior fora da exigência.
- [x] Backend, RBAC, i18n pt/en, TypeScript, lint/build e validação manual não apresentam regressão nova.

---

# TODO: Adicionar Pessoa Rápido por leitura de passaporte

## Contexto

No fluxo administrativo de criação de processo, **Adicionar Pessoa Rápido** deve conservar o cadastro manual atual e oferecer um segundo modo por passaporte. Nesse modo, o arquivo é lido antes de qualquer gravação, o administrador revisa e ajusta dados pessoais e do passaporte, resolve possíveis duplicidades e somente então cria ou reutiliza a pessoa com seu passaporte vinculado. Ao concluir, a pessoa deve voltar automaticamente selecionada como candidato do processo.

## Decisões de implementação

- Manter o modo **Manual** como padrão e sem regressões; adicionar o modo **Por passaporte** no mesmo `QuickPersonFormDialog` com tabs/segmented control acessível.
- Reutilizar upload, `api.passportOcr.extractPassport`, resolução de países e os padrões de revisão/deduplicação de `components/process-requests/passport-upload-step.tsx`; não criar outro prompt ou provedor de IA.
- OCR não grava dados. Pessoa e passaporte só são persistidos após a tela de revisão e uma confirmação explícita.
- Revisar dados pessoais (`givenNames`, `middleName` quando identificável, `surname`, `birthDate`, `sex`, `nationalityId`, `motherName`, `fatherName`) e dados do passaporte (`passportNumber`, `issuingCountryId`, `issueDate`, `expiryDate`, arquivo e `isActive`). Campos não encontrados permanecem editáveis e vazios.
- Usar o número do passaporte e os matches de pessoa retornados pelo OCR para evitar duplicatas. Passaporte existente deve reutilizar seu proprietário; matches de pessoa devem permitir seleção consciente de existente ou criação de nova pessoa somente quando não houver conflito forte.
- Criar/vincular pessoa e passaporte na mesma mutação Convex, revalidando duplicidade no backend. Falha não pode deixar pessoa órfã, passaporte sem dono ou candidato parcialmente selecionado.
- Reutilizar `onSuccess(personId, passportId?)` para devolver a pessoa resolvida, selecionar também o passaporte quando o consumidor possuir esse campo e manter compatibilidade com os demais formulários/wizards.
- Não criar testes automatizados para este MVP; validar com TypeScript, lint, build e o PDF real de Sadik no browser.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Mapear o fluxo manual e seus consumidores.
  - Modificar: `components/individual-processes/quick-person-form-dialog.tsx`.
  - Consumidores a preservar: `components/individual-processes/individual-process-form-page.tsx`, `components/process-wizard/step2-1-request-details-individual.tsx`, `components/process-wizard/step2-process-data-individual.tsx` e `components/process-wizard/step3-3-candidates-collective.tsx`.
  - Validação: todos recebem a pessoa pelo callback `onSuccess(personId)`; nenhum consumidor precisa implementar OCR próprio.
- [x] 0.2: Confirmar os padrões e arquivos exatos da extensão.
  - Reutilizar diretamente o componente tipado `components/process-requests/passport-upload-step.tsx`, sem duplicar upload, revisão ou validação em outro componente.
  - Modificar: `convex/passportOcr.ts`, `convex/passportUpload.ts`, `messages/pt.json` e `messages/en.json`.
  - Reutilizar: `components/process-requests/passport-upload-step.tsx`, `components/ui/tabs.tsx`, `components/ui/alert-dialog.tsx`, `api.passportUpload.generateUploadUrl`, `api.countries.findByCodeOrName` e as invariantes de `convex/passports.ts`.
  - Validação: nenhuma mudança de schema, índice ou migração é necessária.

### 1. Preservar o modo manual e adicionar o modo por passaporte

- [x] 1.1: Em `QuickPersonFormDialog`, separar o conteúdo atual como modo **Manual** sem alterar seu schema, submit, proteção de alterações ou callback.
  - Manter **Manual** selecionado ao abrir e resetar ambos os modos ao fechar/concluir.
  - Validação: o cadastro manual continua criando e selecionando uma pessoa exatamente como antes.
- [x] 1.2: Adicionar a opção **Por passaporte** e renderizar o `PassportUploadStep` reutilizável.
  - Explicar que a IA fará a leitura e que os dados poderão ser revisados antes de salvar.
  - Manter estados, submits e erros independentes entre os modos para impedir dupla submissão.
  - Validação: alternar os modos não grava registros; ao existir trabalho não salvo, o fechamento continua usando a confirmação existente.

### 2. Ampliar OCR e modelar a revisão

- [x] 2.1: Em `convex/passportOcr.ts`, ampliar prompt, saída estruturada e normalização para `middleName`, `motherName` e `fatherName`, usando `null` quando não estiverem impressos/legíveis.
  - Preservar os campos atuais, tratamento seguro de JSON, timeout/retries e resolução de `nationalityId`/`issuingCountryId`.
  - Atualizar o validator Convex e o modelo TypeScript consumido pela revisão, sem `any` novo.
  - Validação: documentos que não contenham filiação continuam válidos e não inventam mãe/pai.
- [x] 2.2: Ampliar o modelo tipado de revisão existente com IDs reais de nacionalidade/país emissor, nome do meio e filiação.
  - Tipar IDs como `Id<"countries">` e manter sexo/filiação opcionais.
  - Validação: dados extraídos e ajustes manuais passam pela mesma fronteira da mutação Convex.
- [x] 2.3: No `PassportUploadStep`, implementar upload -> OCR -> revisão, reutilizando limite de arquivo, tentativas, timeout e feedback pt/en existentes.
  - Mostrar resumo editável em seções **Dados pessoais** e **Passaporte**, incluindo nome do arquivo e status de campos não encontrados.
  - Permitir corrigir qualquer valor antes da confirmação sem executar novo OCR nem nova gravação.
  - Validação: erro/timeout preserva o dialog e permite retry; sucesso não cria pessoa/passaporte automaticamente.

### 3. Resolver duplicidades antes de gravar

- [x] 3.1: Exibir na revisão os resultados `passportExists` e `matches` retornados pela action.
  - Se o número já pertence a uma pessoa, bloquear criação duplicada e fixar a resolução no proprietário existente.
  - Para matches de nome, mostrar dados suficientes e protegidos por ownership para o administrador escolher **Usar pessoa existente** ou **Criar nova pessoa** quando permitido.
  - Sem match, pré-selecionar **Criar nova pessoa**.
  - Validação: homônimos nunca são escolhidos silenciosamente e um passaporte existente nunca muda de proprietário por decisão apenas client-side.
- [x] 3.2: Revalidar número e proprietário dentro da mutação atômica no momento da confirmação.
  - Validação: editar o número para um passaporte já cadastrado não contorna a deduplicação nem troca seu proprietário.

### 4. Criar ou reutilizar pessoa e passaporte com segurança

- [x] 4.1: Em `convex/passportUpload.ts`, ampliar/reutilizar a mutação atômica de aplicação de candidato para receber todos os campos revisados, incluindo filiação, com validadores de args e returns.
  - Manter autenticação e escopo atuais da mutação já utilizada no fluxo autenticado de solicitação, sem criar uma segunda implementação.
  - No modo novo, criar pessoa e passaporte vinculados na mesma transação, armazenar `storageId`, aplicar a regra de passaporte ativo e registrar atividades.
  - No modo existente, confirmar que a pessoa existe, preencher somente campos permitidos/confirmados e criar ou reutilizar o passaporte sem alterar seu proprietário.
  - Reconsultar `by_passportNumber` e pessoa dentro da mutação para impedir corrida entre revisão e confirmação.
  - Validação: qualquer erro aborta toda a mutação; não ficam registros órfãos ou parcialmente atualizados.
- [x] 4.2: Fazer a mutação retornar de forma tipada `personId`, `passportId`, se a pessoa já existia e o nome final para o resumo de sucesso.
  - Proteger contra clique duplo/idempotência pelo número do passaporte e desabilitar confirmação durante submit.
  - Validação: repetir a confirmação não cria segunda pessoa nem segundo passaporte.

### 5. Retornar o candidato ao processo

- [x] 5.1: Após sucesso, chamar `onSuccess(result.personId, result.passportId)` uma única vez, fechar/resetar o dialog e deixar o formulário/wizard consumidor selecionar a pessoa como candidato.
  - Consumidores que esperam apenas pessoa ignoram o segundo argumento; o formulário individual seleciona o passaporte criado.
  - Validação: processo individual, processo individual no wizard e lista de candidatos coletivos mostram a pessoa resolvida imediatamente.
- [x] 5.2: Ao reutilizar pessoa existente, retornar seu ID sem criar duplicata e garantir que o passaporte resolvido aparece associado a ela.
  - Validação: cancelar na revisão não altera a seleção anterior do processo.

### 6. Internacionalização e quality gates

- [x] 6.1: Adicionar chaves em `messages/pt.json` e `messages/en.json` para modos Manual/Por passaporte, upload/leitura, revisão, dados pessoais, filiação, resumo, matches, escolha novo/existente, confirmação, erros e sucesso.
  - Validação: paridade de chaves e nenhum texto/aria-label novo hardcoded.
- [x] 6.2: Executar `pnpm exec tsc --noEmit`, lint focado nos arquivos alterados e `pnpm run build`.
- [x] 6.3: Testar no browser autenticado em pt e en com o PDF de Sadik.
  - Confirmar extração e revisão de nomes, nascimento, sexo, nacionalidade e dados do passaporte; mãe/pai ficam vazios quando ausentes no PDF.
  - Validar pessoa+passaporte vinculados, pessoa selecionada como candidato e arquivo disponível no passaporte.
  - Repetir o mesmo PDF/número e confirmar reutilização/aviso sem criar pessoa ou passaporte duplicado.
- [x] 6.4: Fazer regressão do modo manual, callback dos consumidores, loading, cancelamento e proteção de alterações não salvas.

## Definition of Done

- [x] **Adicionar Pessoa Rápido** oferece os modos Manual e Por passaporte em todos os fluxos de criação de processo.
- [x] OCR preenche e permite revisar/ajustar dados pessoais e do passaporte antes de qualquer gravação.
- [x] Pessoa e passaporte são criados/reutilizados atomicamente, vinculados corretamente e sem duplicatas.
- [x] A pessoa resolvida volta selecionada como candidato do processo.
- [x] i18n pt/en, TypeScript, lint focado, build e teste browser com o PDF Sadik passam sem novos erros.

---

# TODO: Vincular pessoa e finalizar tentativas da IA no passaporte direto

## Contexto

Corrigir o fluxo de criação direta de passaporte para deixar claro o progresso **Tentativa N de 3**, impedir qualquer upload/leitura/salvamento antes da seleção da pessoa e garantir que nenhuma falha ou timeout mantenha o formulário em loading infinito.

## Sequência de tarefas

### 0. Reproduzir o follow-up

- [x] 0.1: Em `/pt/passports/new`, reproduzir com o PDF fornecido o estado atual desde um formulário vazio, registrando pessoa selecionada, upload, tentativa exibida, chamadas OCR, timeout e término do loading.
  - Comparar com `/en/passports/new` e com a criação via `PassportFormDialog`, que normalmente recebe `personId` do processo/candidato.
  - Validação: identificar se o loading preso ocorre antes do upload, entre retries, após timeout ou ao aplicar o resultado.
  - Resultado: em React Strict Mode, o cleanup da primeira montagem deixava `mountedRef` falso na segunda montagem. As tentativas eram descartadas e o `finally` não desligava o loading nem atualizava o feedback.

### 1. Exigir pessoa antes do documento e do salvamento

- [x] 1.1: Em `PassportFormPage` e `PassportFormDialog`, derivar um estado único `hasSelectedPerson` a partir do campo `personId` e passá-lo ao controle compartilhado de IA.
  - Desabilitar seleção/drop de arquivo, upload e botão **Ler com IA** enquanto não houver pessoa.
  - Exibir orientação localizada informando que o passaporte sempre deve estar vinculado e que é necessário selecionar uma pessoa primeiro.
  - Validação: selecionar a pessoa habilita as ações; limpar/trocar a pessoa durante um arquivo pendente invalida a leitura/storage temporário para impedir vínculo incorreto.
  - Resultado: o botão de IA permanece no topo; sem pessoa, IA/arquivo/Salvar ficam desabilitados. Arquivo e storage passam a bloquear a troca de pessoa até sua remoção, evitando vínculo acidental com outro candidato.
- [x] 1.2: Manter o botão **Salvar** desabilitado sem pessoa e preservar `passportSchema` como proteção final.
  - Não chamar `api.passports.create/update` com `personId` vazio e não permitir que OCR altere a pessoa selecionada.
  - Validação: criação direta, processo individual e tabela de candidatos sempre persistem o passaporte no `personId` correto.

### 2. Corrigir progresso e término das tentativas

- [x] 2.1: Ajustar o feedback do controle administrativo para exibir **Tentativa {attempt} de 3…** e **Attempt {attempt} of 3…** durante cada chamada OCR.
  - Reiniciar a contagem em 1 a cada nova ação manual e nunca mostrar tentativa 0 ou superior a 3.
  - Validação: `aria-live` e texto visível avançam 1/3, 2/3 e 3/3 exatamente junto às chamadas realizadas.
- [x] 2.2: Garantir um estado terminal após sucesso, terceira falha, timeout, cancelamento, troca de pessoa/arquivo ou fechamento do formulário.
  - Usar `try/catch/finally` e limpeza de timers/identificador da execução ativa para sempre desligar `isReading` e fechar o modal/overlay da tentativa atual.
  - Ignorar respostas atrasadas de tentativas expiradas e impedir retries concorrentes ou aplicação duplicada do resultado.
  - Após três falhas, mostrar erro localizado e reabilitar os controles para nova ação manual; jamais iniciar uma quarta tentativa automaticamente.
  - Validação: nenhum cenário deixa spinner, modal, input ou botão Salvar presos indefinidamente.
  - Resultado: `mountedRef` agora é reativado no setup do efeito; o feedback começa imediatamente em 1/3 e o `finally` volta a executar na montagem ativa.
- [x] 2.3: Atualizar `messages/pt.json` e `messages/en.json` com a mensagem `Tentativa {attempt} de {max}`, instrução para selecionar pessoa e erros terminais/timeout equivalentes.
  - Validação: paridade pt/en e nenhum texto novo hardcoded.

### 3. Validar com o PDF fornecido

- [x] 3.1: Executar `pnpm exec tsc --noEmit`, lint focado nos arquivos alterados e `pnpm run build`.
- [ ] 3.2: Testar o PDF real em `/pt/passports/new` e `/en/passports/new`.
  - Sem pessoa: arquivo, IA e Salvar permanecem bloqueados com orientação correta.
  - Com pessoa: um único upload, feedback N de 3, no máximo três OCRs, preenchimento único e vínculo à pessoa selecionada.
  - Simular sucesso, falha, timeout, cancelamento e nova tentativa, confirmando que o loading sempre termina.
  - Validação parcial: bloqueios sem pessoa e liberação após seleção validados no browser; PDF real relido pela action em 11,39 s com `U22046506`. O upload automatizado no Chrome continua bloqueado pela permissão da extensão para arquivos locais.
- [ ] 3.3: Fazer regressão via `PassportFormDialog` no processo individual e na tabela de candidatos para confirmar a mesma proteção sem quebrar o vínculo/preseleção existentes.

## Definition of Done

- [x] A criação direta mostra **Tentativa N de 3** corretamente em pt/en.
- [x] Nenhum arquivo pode ser enviado/lido e nenhum passaporte pode ser salvo sem pessoa selecionada.
- [x] Todas as execuções terminam em sucesso ou erro controlado após no máximo três tentativas, sem loading infinito.
- [ ] O PDF fornecido foi validado na criação direta e os fluxos compostos continuam vinculando o passaporte à pessoa correta.

---

# TODO: Corrigir demora da leitura de passaporte por IA

## Contexto

Reproduzir a demora observada com o PDF fornecido no ambiente de desenvolvimento e tornar a leitura administrativa limitada, informativa e capaz de sempre encerrar o modal, inclusive quando Gemini/Convex não responderem como esperado.

## Sequência de tarefas

### 0. Reproduzir e comparar os fluxos

- [x] 0.1: Subir o ambiente com `pnpm dev`, autenticar como administrador e reproduzir a leitura usando exatamente o PDF fornecido, registrando separadamente o tempo de upload, de cada chamada a `api.passportOcr.extractPassport` e da finalização da UI.
  - Validar nos logs do frontend e do Convex se a espera ocorre no upload, Gemini, parse/validação ou retorno ao modal.
  - Validação: obter uma reprodução observável; não tratar apenas o sintoma visual de loading.
  - Resultado: a action leu o PDF real em 11,61 s sem preparação e extraiu `U22046506`, Turquia, emissão `2019-07-03` e validade `2029-07-03`.
- [x] 0.2: Comparar o fluxo administrativo compartilhado em `components/passports/passport-ai-upload-field.tsx` com o fluxo comum funcional em `components/process-requests/passport-upload-step.tsx`.
  - Conferir arquivo/MIME, geração e reutilização de `storageId`, chamada a `convex/passportOcr.ts`, tratamento da resposta e estados `try/catch/finally`.
  - Validação: documentar a diferença responsável pela demora e preservar o comportamento comum que já funciona.
  - Resultado: ambos usam a mesma action; a demora em falhas vinha das cinco tentativas internas e silenciosas que o SDK do Gemini aplica por padrão.

### 1. Limitar tentativas e garantir finalização

- [x] 1.1: No controle administrativo compartilhado, executar no máximo **3 tentativas** de leitura para falhas transitórias, reutilizando o mesmo arquivo já enviado em vez de repetir o upload.
  - Exibir feedback localizado e acessível **Tentativa {attempt}…** / **Attempt {attempt}…** durante cada chamada, com `aria-live="polite"`.
  - Não tentar uma quarta vez; após a terceira falha, mostrar erro localizado com opção de fechar ou iniciar uma nova leitura manualmente.
  - Validação: uma única ação do usuário produz no máximo três chamadas OCR e nunca três uploads.
- [x] 1.2: Definir timeout explícito por tentativa e assegurar a transição para um estado terminal em todos os caminhos.
  - Centralizar limpeza de timers e estado em `finally`; sucesso fecha o modal e aplica os dados uma vez, enquanto erro/timeout encerra o loading, reabilita os controles e mantém os dados anteriores.
  - Ignorar resultados atrasados de tentativa expirada ou de componente/modal já fechado para evitar atualização duplicada ou estado preso.
  - Validação: sucesso, erro, timeout e fechamento manual sempre finalizam o modal/overlay e não deixam a tela bloqueada.
- [x] 1.3: Adicionar as mensagens equivalentes em `messages/pt.json` e `messages/en.json`: tentativa atual, timeout, três tentativas esgotadas e ação de tentar novamente.
  - Validação: paridade de chaves pt/en e nenhum feedback novo hardcoded.

### 2. Validar com o PDF real

- [x] 2.1: Executar `pnpm exec tsc --noEmit`, lint focado nos arquivos alterados e `pnpm run build`.
- [ ] 2.2: Testar o PDF fornecido no browser autenticado em pt e en, tanto no formulário administrativo quanto no fluxo comum usado como referência.
  - Conferir feedback **Tentativa N…**, limite de três chamadas, preenchimento único em sucesso, timeout/falha terminal e fechamento do modal.
  - Validar também cancelar durante a espera e tentar novamente após falha, sem perder dados previamente preenchidos.
  - Validação parcial: PDF real testado diretamente na mesma action/storage do processo; modais pt/en e ausência de erros específicos do OCR verificadas no browser. O anexo automatizado ficou bloqueado pela permissão de arquivos locais da extensão do Chrome.

## Definition of Done

- [x] A causa da demora com o PDF real foi reproduzida e comparada com o fluxo comum.
- [x] Cada leitura administrativa termina em sucesso ou falha após no máximo três tentativas, com feedback localizado da tentativa atual.
- [x] Timeout, falha e fechamento não deixam modal, overlay ou loading presos.
- [ ] O PDF fornecido funciona ou falha de forma controlada nos fluxos pt/en, com TypeScript, lint focado e build verificados.
  - PDF, retries/timeout, i18n, TypeScript, lint e build verificados; falta apenas o upload automatizado end-to-end no Chrome.

---

# TODO: Correções da leitura de passaporte por IA no admin

## Contexto

Ajustar a implementação administrativa após feedback de uso: destacar **Ler com IA** no início do formulário, reduzir o aviso de espera ao momento da confirmação e impedir que respostas JSON malformadas do Gemini derrubem a leitura.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Confirmar os pontos exatos da correção.
  - Modificar: `components/passports/passport-form-dialog.tsx`, `components/passports/passport-form-page.tsx`, o controle compartilhado de IA usado por ambos, `convex/passportOcr.ts`, `messages/pt.json` e `messages/en.json`.
  - Validação: a composição existente continua cobrindo processo individual, tabela de passaportes e tabela de candidatos sem mudanças específicas nos chamadores.

### 1. Corrigir posição e avisos da ação de IA

- [x] 1.1: Mover o acionamento **Ler com IA**, com seu ícone, para o topo de `PassportFormDialog` e `PassportFormPage`, imediatamente após título/descrição e antes dos campos manuais.
  - Manter seleção/identificação do arquivo e estado de leitura acessíveis no mesmo bloco superior.
  - Validação: modal e página apresentam a ação no mesmo lugar e sem duplicá-la no restante do formulário.
- [x] 1.2: Remover o aviso permanente de espera da tela e mostrá-lo somente no modal de confirmação aberto ao acionar a IA.
  - A confirmação deve informar que a leitura pode levar alguns segundos.
  - Quando houver número, país emissor, emissão ou validade preenchidos, incluir no mesmo modal o alerta explícito de que esses dados serão sobrescritos.
  - Sem dados existentes, manter a confirmação de início/espera, mas omitir o alerta de sobrescrita.
  - Validação: cancelar não envia arquivo, não chama a IA e não altera nenhum campo; confirmar inicia uma única leitura.

### 2. Tornar a resposta do Gemini segura

- [x] 2.1: Em `convex/passportOcr.ts`, configurar a chamada do Gemini com saída JSON estruturada por schema explícito para todos os campos do passaporte, preservando `responseMimeType: "application/json"`.
  - Normalizar o resultado para o contrato tipado da action e usar `null` para campos ausentes, sem `any`.
  - Validação: texto adicional, campos inesperados ou valores ausentes não escapam do contrato esperado.
- [x] 2.2: Substituir o parse frágil por tratamento seguro de resposta vazia ou JSON malformado.
  - Envolver parsing/validação em erro controlado, sem executar um segundo `JSON.parse` desprotegido.
  - Não consultar países, pessoas ou duplicidade quando a extração for inválida; retornar/lançar uma mensagem segura para o frontend exibir o erro localizado e permitir nova tentativa.
  - Validação: JSON válido continua preenchendo os campos; JSON truncado, markdown, vazio ou incompatível não causa falha não tratada da action.

### 3. Internacionalização e quality gates

- [x] 3.1: Ajustar `messages/pt.json` e `messages/en.json` para o novo texto do modal: espera, sobrescrita condicional, continuar, cancelar e falha segura de leitura.
  - Validação: paridade de chaves pt/en e nenhum texto novo visível hardcoded.
- [x] 3.2: Executar `pnpm exec tsc --noEmit`.
- [x] 3.3: Executar lint focado nos arquivos alterados e `pnpm run build`, separando falhas preexistentes do repositório.
- [ ] 3.4: Validar no browser autenticado, em pt e en:
  - `/[locale]/passports/new` e edição na tabela de passaportes;
  - inclusão pelo processo individual e pela tabela de candidatos;
  - botão de IA no topo, modal sem/com sobrescrita, cancelar/confirmar, loading, sucesso e erro de resposta inválida.
  - Validação parcial concluída: rota dedicada em pt/en, posição do botão, modal sem/com sobrescrita, cancelamento preservando valores e console limpo. Os demais pontos usam o mesmo `PassportFormDialog`; o upload real permaneceu pendente porque o navegador automatizado não tinha permissão para anexar arquivos locais.

## Definition of Done

- [x] **Ler com IA** aparece no topo de todos os formulários administrativos cobertos.
- [x] O aviso de espera existe apenas no modal acionado pelo botão e o alerta de sobrescrita aparece somente quando necessário.
- [x] O backend usa saída estruturada e trata respostas vazias/malformadas do Gemini sem erro de parse não controlado.
- [ ] TypeScript, lint focado, build e validação manual pt/en passam sem novos erros.
  - TypeScript, lint focado, build e validação visual pt/en passaram; falta somente repetir o OCR com um arquivo real no navegador.

---

# TODO: Leitura de passaporte por IA nos fluxos administrativos

## Contexto

O upload com leitura automática por IA já existe no fluxo de solicitação do cliente (`PassportUploadStep`), mas os formulários administrativos de passaporte apenas armazenam o PDF/imagem e exigem digitação manual. O administrador deve poder selecionar um documento, acionar **Ler com IA** por um botão com ícone, receber o aviso de que a leitura pode levar alguns segundos e ter número, país emissor, data de emissão e data de validade preenchidos automaticamente. Se algum desses campos já contiver dados, a aplicação deve pedir confirmação antes de substituí-los.

A solução precisa alcançar todos os pontos administrativos sem duplicar comportamento:

- processo individual: criação/edição, modal da tabela e card do candidato no detalhe;
- tabela de passaportes: criação pela rota dedicada e edição pelo modal;
- tabela de candidatos/pessoas: inclusão e edição na subtabela de passaportes.

## Decisões de implementação

- Extrair o comportamento visual e de leitura para um componente compartilhado, usado por `PassportFormDialog` e `PassportFormPage`; os demais pontos já chegam a um desses dois formulários pelas composições existentes.
- Reutilizar `api.passportUpload.generateUploadUrl` e `api.passportOcr.extractPassport`, incluindo a resolução de país feita por `api.countries.findByCodeOrName`; não criar outro provedor, prompt, tabela, índice ou fluxo OCR.
- Aplicar a IA somente aos campos do passaporte `passportNumber`, `issuingCountryId`, `issueDate` e `expiryDate`. Preservar `personId` (o candidato selecionado) e `isActive`; a leitura não deve trocar o candidato nem alterar dados pessoais fora do formulário de passaporte.
- O clique em **Ler com IA** deve operar sobre o arquivo selecionado. Se algum campo-alvo já estiver preenchido, abrir `AlertDialog` antes da leitura; cancelar mantém todos os valores intactos.
- Exibir permanentemente a orientação de que a leitura pode demorar alguns segundos e, durante a operação, mostrar `Loader2`/estado `aria-live`, bloquear nova seleção, leitura e salvamento concorrentes e manter o formulário aberto.
- Validar o retorno não confiável da action com Zod antes de aplicá-lo ao formulário. Em erro, documento inválido ou resposta incompleta, preservar os valores atuais, mostrar mensagem localizada e permitir nova tentativa.
- Marcar os valores aplicados com `shouldDirty`, `shouldTouch` e `shouldValidate`, deixando `passportSchema` e `usePassportNumberValidation` continuarem responsáveis por datas, obrigatoriedade e número duplicado.
- Reutilizar o mesmo `storageId` obtido para a leitura no `create`/`update`, evitando enviar o arquivo duas vezes. Trocar ou remover o arquivo deve invalidar esse `storageId`; sem leitura por IA, o upload manual atual continua funcionando.
- A IA apenas preenche o formulário. Nenhuma informação persistida deve ser sobrescrita antes de o administrador clicar em **Salvar**; fechar/cancelar mantém o registro existente.
- Não criar testes automatizados para esta entrega de MVP; validar com TypeScript, lint, build e fluxos manuais autenticados.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revisar o PRD, schema e o fluxo OCR já entregue ao cliente.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/schema.ts`, `convex/passportOcr.ts`, `convex/passportUpload.ts`, `convex/countries.ts` e `components/process-requests/passport-upload-step.tsx`.
  - Confirmar: o arquivo aceita PNG/JPEG/WebP/PDF de até 10 MB; a action retorna os dados extraídos e `issuingCountryId`; `passports.storageId` já armazena o documento; `passports.create/update` já exigem admin, validam duplicidade e sincronizam o documento do processo.
  - Validação: nenhuma mudança de schema, migração, índice ou nova função pública Convex é necessária.
- [x] 0.2: Mapear todos os pontos administrativos e confirmar a cobertura por composição.
  - Processo individual: `IndividualProcessFormPage`, `IndividualProcessFormDialog` e `LinkPassportDialog` reutilizam `PassportSelector -> PassportFormDialog`.
  - Candidatos/pessoas: `PersonDetailView` e `PersonFormPage` reutilizam `PassportsSubtable -> PassportFormDialog`.
  - Passaportes: `/[locale]/passports/new` usa `PassportFormPage`; a edição da tabela usa `PassportFormDialog`.
  - Validação: não adicionar implementações OCR específicas em `PassportSelector`, `PassportsSubtable`, `LinkPassportDialog` ou nas tabelas; a cobertura deve vir dos formulários compartilhados.
- [x] 0.3: Confirmar os arquivos exatos da mudança.
  - Criar: `components/passports/passport-ai-upload-field.tsx`.
  - Criar: `lib/validations/passport-ocr.ts`.
  - Modificar: `components/passports/passport-form-dialog.tsx`.
  - Modificar: `components/passports/passport-form-page.tsx`.
  - Modificar: `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `convex/passportOcr.ts`, `convex/passportUpload.ts`, `convex/passports.ts`, `convex/countries.ts`, `convex/schema.ts`, `components/ui/alert-dialog.tsx`, `components/ui/button.tsx` e `lib/validations/passports.ts`.

### 1. Tipar e validar a resposta da leitura

- [x] 1.1: Criar `lib/validations/passport-ocr.ts` com um schema Zod para o subconjunto consumido pelo formulário administrativo.
  - Validar `extracted.passportNumber`, `extracted.issueDate`, `extracted.expiryDate` como strings opcionais/nulas e `issuingCountryId` como `Id<"countries">` opcional/nulo.
  - Normalizar espaços e aceitar campos ausentes sem usar `any` ou cast irrestrito.
  - Validar datas extraídas no formato ISO `YYYY-MM-DD`; resposta fora do contrato deve produzir erro controlado, não preencher valores corrompidos.
  - Validação: o tipo TypeScript deve ser inferido do schema e compartilhado pelo componente, sem duplicar manualmente o contrato da action.
- [x] 1.2: Definir a política de aplicação de resultado parcial no componente.
  - Aplicar somente valores válidos e efetivamente retornados pela IA; um campo ausente não deve apagar um valor existente.
  - Exigir os quatro campos obrigatórios antes de anunciar leitura completa; se faltar algum, manter os dados atuais e orientar o administrador a tentar outra imagem/PDF ou preencher manualmente.
  - Validação: `passportSchema` ainda valida o conjunto final antes de salvar e o número extraído aciona a verificação de duplicidade existente.

### 2. Criar o controle compartilhado de upload e leitura por IA

- [x] 2.1: Criar `components/passports/passport-ai-upload-field.tsx` como componente controlado e estritamente tipado.
  - Receber o arquivo selecionado, URL existente, valores atuais dos quatro campos, estado desabilitado e callbacks para aplicar dados, remover/trocar arquivo e entregar/invalidar o `storageId` já enviado.
  - Reutilizar `api.passportUpload.generateUploadUrl` e `api.passportOcr.extractPassport` na ordem upload -> leitura -> validação Zod -> callback de preenchimento.
  - Aceitar somente `image/png`, `image/jpeg`, `image/webp` e `application/pdf`, até 10 MB, validando MIME e tamanho além do atributo `accept`.
  - Validação: um arquivo rejeitado nunca é enviado e mostra erro localizado; selecionar outro arquivo limpa o resultado/storage anterior.
- [x] 2.2: Renderizar a opção de IA de forma explícita e acessível.
  - Manter nome/tamanho do arquivo, remoção e link do documento atual já existentes.
  - Adicionar botão **Ler com IA** com ícone `Sparkles` (ou equivalente Lucide já disponível), texto visível e `aria-label` localizado; não depender apenas do ícone.
  - Exibir junto ao controle o aviso de que a leitura pode levar alguns segundos.
  - Durante a leitura, trocar para `Loader2`, texto **Lendo passaporte…**, região `aria-live="polite"` e controles desabilitados.
  - Validação: o layout funciona em uma coluna no mobile e acomoda arquivo/ações sem overflow em `sm`, `md` e `lg`.
- [x] 2.3: Implementar a confirmação de sobrescrita com `components/ui/alert-dialog.tsx`.
  - Considerar preenchidos somente os campos-alvo do passaporte; `personId` e `isActive` não disparam o aviso.
  - Se houver qualquer valor, o primeiro clique abre um aviso informando que os dados atuais serão substituídos pelos lidos do documento e que o processamento pode levar alguns segundos.
  - **Cancelar** não inicia upload/OCR e não altera formulário/arquivo; **Continuar com IA** inicia a leitura uma única vez.
  - Sem valores preenchidos, iniciar diretamente e ainda manter visível o aviso de espera do controle.
  - Validação: clique duplo, Enter ou reabertura do dialog não disparam leituras concorrentes.
- [x] 2.4: Tratar sucesso, falha e ciclo de vida do estado.
  - Em sucesso, aplicar os quatro campos, conservar o arquivo/storage para o salvamento e exibir toast localizado.
  - Em falha de upload, Gemini, contrato, documento que não seja passaporte ou extração incompleta, não alterar os campos atuais e permitir repetir a leitura.
  - Ao fechar/resetar o formulário, remover arquivo, ou escolher outro arquivo, limpar confirmação, loading e `storageId` temporário para impedir reaproveitamento incorreto.
  - Validação: nenhuma Promise atualiza estado de um formulário já fechado/desmontado.

### 3. Integrar ao formulário modal usado pelos fluxos compostos

- [x] 3.1: Em `components/passports/passport-form-dialog.tsx`, substituir o bloco duplicado de arquivo por `PassportAiUploadField`.
  - Passar os valores de `form.getValues`/`form.watch` dos quatro campos e aplicar o resultado com `form.setValue(..., { shouldDirty: true, shouldTouch: true, shouldValidate: true })`.
  - Manter `personId` travado no candidato recebido pelo fluxo e não alterá-lo a partir de nome/nacionalidade extraídos.
  - Na edição, carregar os valores existentes antes de avaliar a necessidade do aviso de sobrescrita.
  - Validação: a proteção de alterações não salvas reconhece o preenchimento por IA como mudança do formulário.
- [x] 3.2: Ajustar o submit do dialog para reutilizar o `storageId` já enviado pela leitura.
  - Se houve leitura, não reenviar o mesmo `File`; se houve apenas upload manual, preservar o upload no submit atual.
  - Na edição, novo `storageId` substitui o documento somente ao salvar; sem novo arquivo, preservar `fileUrl/storageId` existente; remoção explícita mantém o comportamento atual.
  - Desabilitar Salvar/Cancelar conflitantes enquanto a leitura estiver em andamento e impedir submit com validação de número ainda pendente/duplicado.
  - Validação: `api.passports.create/update` continuam sendo as únicas operações que persistem dados do passaporte nesse formulário.
- [x] 3.3: Confirmar a cobertura indireta do dialog sem modificar os chamadores.
  - Processo individual: criação, edição, modal da tabela, calendário RNM e card de passaporte no detalhe.
  - Pessoas/candidatos: detalhe aberto pela tabela e subtabela de passaportes.
  - Passaportes: edição de linha na tabela.
  - Validação: ao criar um passaporte por `PassportSelector`, o novo ID continua selecionado/vinculado ao processo após salvar.

### 4. Integrar à rota administrativa dedicada de novo passaporte

- [x] 4.1: Em `components/passports/passport-form-page.tsx`, usar o mesmo `PassportAiUploadField` e a mesma política de aplicação do dialog.
  - Eliminar a lógica duplicada de seleção, tamanho, visualização, remoção e upload que passar a pertencer ao componente compartilhado.
  - Reutilizar `storageId`, loading, confirmação, Zod, validação de datas e duplicidade exatamente como no dialog.
  - Validação: `/pt/passports/new` e `/en/passports/new` têm comportamento equivalente ao modal, sem divergência de mensagens ou estados.
- [x] 4.2: Preservar navegação e submissão da página.
  - Cancelar continua voltando para a listagem com locale; salvar cria o passaporte uma vez e mantém a sincronização automática de documento já realizada no backend.
  - Validação: falha na IA não impede preenchimento e upload manual posterior.

### 5. Internacionalização

- [x] 5.1: Adicionar ao namespace `Passports` de `messages/pt.json` todas as mensagens novas.
  - Rótulo/aria-label **Ler com IA**, aviso de espera, estado de leitura, título/descrição/ações da confirmação, sucesso, resposta incompleta, documento inválido, erro de leitura e retry.
  - Reutilizar mensagens `Common.cancel`, `Common.continue`/equivalente quando já existirem; adicionar chave somente quando necessário.
- [x] 5.2: Adicionar as mesmas chaves e placeholders em `messages/en.json`.
  - Validação: as árvores pt/en mantêm paridade e nenhum texto novo visível, toast ou aria-label fica hardcoded.

### 6. Quality gates

- [x] 6.1: Executar `pnpm exec tsc --noEmit` sem introduzir `any`, casts irrestritos ou erros de `Id<"countries">`/`Id<"_storage">`.
- [x] 6.2: Executar `pnpm lint` e `pnpm run build`, registrando separadamente qualquer falha preexistente do repositório.
  - Resultado: o build de produção passou; o lint completo continua falhando por erros globais preexistentes de `no-explicit-any` e avisos não relacionados. O ESLint restrito aos arquivos desta entrega passou sem erros.
- [ ] 6.3: Validar manualmente o arquivo e a leitura por IA.
  - PNG, JPEG, WebP e PDF válidos de até 10 MB; tipo inválido e arquivo acima do limite.
  - Passaporte legível, arquivo que não seja passaporte, resposta incompleta, falha de rede/Gemini e nova tentativa.
  - Aviso de espera visível, loading acessível, sem submit/leitura duplicada e sem perda de valores em erro.
  - Número, país emissor, emissão e validade preenchidos; status derivado e validação de duplicidade atualizados.
  - Validação parcial: contrato Zod, datas inválidas, estados pt/en e botão/aviso foram conferidos. A automação do navegador não oferece seleção de arquivo e não havia fixture não sensível; por isso não foi disparada uma chamada real ao Gemini nem persistido arquivo sintético.
- [ ] 6.4: Validar a confirmação de sobrescrita.
  - Formulário vazio inicia a leitura diretamente.
  - Qualquer campo-alvo preenchido abre confirmação; cancelar conserva valores; continuar aplica o resultado.
  - Resultado ausente não apaga campo existente; nenhum valor persiste antes de **Salvar**.
  - Em edição, salvar confirma a troca do arquivo/dados; fechar sem salvar preserva o passaporte original.
  - Validação parcial: o modal de edição carregado e os campos existentes foram conferidos; a abertura do `AlertDialog` depende de um arquivo selecionado e ficou pendente pela mesma limitação de upload do navegador.
- [ ] 6.5: Validar todos os pontos administrativos em pt e en.
  - `/[locale]/passports/new` e edição em `/[locale]/passports`.
  - inclusão/edição na subtabela aberta por `/[locale]/people`.
  - `/[locale]/individual-processes/new`, `/[locale]/individual-processes/[id]/edit`, modal de edição da tabela e card do passaporte em `/[locale]/individual-processes/[id]`.
  - Validação: passaporte criado a partir do processo continua associado ao candidato correto e selecionado no processo.
  - Validação parcial: rota dedicada e modal da tabela foram conferidos em pt/en. As listas locais de pessoas e processos individuais não retornaram registros, impedindo abrir os fluxos compostos até o dialog; a cobertura foi confirmada pelo encadeamento de componentes e pelo TypeScript.
- [x] 6.6: Conferir acessibilidade e responsividade em `sm`, `md` e `lg`.
  - Operação completa por teclado, foco no `AlertDialog`, ícone acompanhado de texto, contraste, `aria-live` e botões desabilitados corretamente.
  - Nenhum overflow em modal, página, subtabela de candidato ou card do processo.
- [x] 6.7: Confirmar os gates de backend.
  - `api.passportOcr.extractPassport` e `api.passportUpload.generateUploadUrl` são reutilizadas sem ampliar permissões; `api.passports.create/update` continuam protegidas por `requireAdmin`.
  - Nenhuma alteração em schema, índice ou RBAC; nenhuma query nova usa `filter()`.
  - O arquivo lido permanece em `passports.storageId` e a sincronização existente com documentos do processo continua funcionando.

## Definition of Done

- [x] Todos os formulários administrativos de criação/edição de passaporte oferecem **Ler com IA** com ícone e aviso de espera.
- [x] A IA preenche número, país emissor, emissão e validade no candidato/passaporte correto, sem trocar pessoa ou status ativo.
- [x] Dados preenchidos só são substituídos após confirmação e nunca são persistidos antes de **Salvar**.
- [x] Erros ou resultados incompletos preservam os dados existentes e permitem correção manual ou nova tentativa.
- [x] O mesmo arquivo é usado para OCR e persistência sem upload duplicado.
- [x] Processo individual, tabela de passaportes e tabela de candidatos estão cobertos em pt/en e em mobile/desktop.
- [x] Zod, TypeScript strict, i18n, acessibilidade, lint e build atendem aos quality gates sem novos erros.

---

# TODO: Nacionalidade e CBO na listagem de Processos Individuais

## Contexto

Na página **Processos Individuais** (`/[locale]/individual-processes`), a tabela deve exibir a nacionalidade do candidato e o CBO do processo individual. **Nacionalidade** deve aparecer logo após **Candidato**; **CBO** deve aparecer imediatamente após **Pendências**. Os dois campos também devem ter filtros pesquisáveis e multi-select, seguindo o mesmo comportamento dos filtros existentes: múltiplos valores do mesmo filtro combinam por OR, filtros diferentes combinam por AND, e a seleção participa da persistência em sessão e das Views Salvas.

## Decisões de implementação

- Reutilizar os dados já enriquecidos por `api.individualProcesses.list`: `process.person.nationality` vem de `people.nationalityId`, e `process.cbo` vem de `individualProcesses.cboId`.
- Não alterar `convex/schema.ts`, `convex/individualProcesses.ts` nem `convex/_generated/`: a query atual já aplica RBAC, usa os relacionamentos existentes e retorna os objetos necessários.
- Exibir **Nacionalidade** como o nome do país, com `-` quando não houver valor.
- Exibir **CBO** como `código - título`, usando somente o título quando o código estiver ausente e `-` quando não houver CBO.
- Usar os IDs das relações (`countries` e `cboCodes`) como valores dos filtros e rótulos legíveis como texto pesquisável.
- Manter os filtros no mesmo escopo de acesso dos filtros atuais da página; eles operam somente sobre as linhas já autorizadas e retornadas pela query.
- Considerar como “funcionalidades normais da tabela”: renderização responsiva, ordenação, busca global sem acentos, visibilidade de colunas, exportação Excel, persistência em `sessionStorage` e integração com Views Salvas.
- Não criar testes automatizados para esta entrega de MVP; validar com TypeScript, lint, build e fluxo manual.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revisar o PRD e confirmar a origem e a cardinalidade dos dados.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/schema.ts` e `convex/individualProcesses.ts`.
  - Confirmar: `people.nationalityId -> countries` e `individualProcesses.cboId -> cboCodes`, ambos opcionais.
  - Validação: nenhuma nova tabela, índice, migração ou função pública Convex é necessária.
- [x] 0.2: Confirmar os arquivos exatos da mudança e os componentes que serão apenas reutilizados.
  - Modificar: `app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`.
  - Modificar: `components/individual-processes/individual-processes-table.tsx`.
  - Modificar: `components/saved-filters/save-filter-sheet.tsx`.
  - Modificar: `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `components/ui/combobox.tsx`, `components/ui/data-grid-filter.tsx`, `components/ui/data-grid-column-visibility.tsx`, `hooks/use-persisted-filters.ts`, `convex/savedFilters.ts`, `convex/schema.ts` e `convex/individualProcesses.ts`.

### 1. Modelar Nacionalidade e CBO na tabela

- [x] 1.1: Em `components/individual-processes/individual-processes-table.tsx`, ampliar o tipo local `IndividualProcess` sem introduzir `any` novo.
  - Tipar `person.nationality` como país opcional/nulo, incluindo pelo menos `_id` e `name`.
  - Tipar `cbo` como CBO opcional/nulo, incluindo `_id`, `code?` e `title`.
  - Validação: os tipos aceitam processos legados sem nacionalidade ou CBO e permanecem compatíveis com o retorno inferido de `api.individualProcesses.list`.
- [x] 1.2: Adicionar a coluna **Nacionalidade** imediatamente após **Candidato**.
  - Usar um ID estável de coluna e um accessor textual com o nome do país para habilitar busca global e ordenação.
  - Renderizar `-` em estado muted quando o candidato não tiver nacionalidade.
  - Habilitar sorting e column hiding, mantendo a coluna visível por padrão.
  - Validação: buscar por nome com ou sem acentos encontra a linha por meio de `globalFuzzyFilter`.
- [x] 1.3: Adicionar a coluna **CBO** imediatamente após **Pendências** e antes das colunas subsequentes.
  - Usar um ID estável de coluna e um accessor textual no formato `código - título`, com fallback para título.
  - Renderizar `-` em estado muted quando o processo não tiver CBO.
  - Habilitar sorting e column hiding, mantendo a coluna visível por padrão.
  - Validação: buscar tanto pelo código quanto pelo título do CBO encontra a linha.
- [x] 1.4: Integrar as duas colunas ao seletor **Colunas** e ao reset de visibilidade.
  - Adicionar rótulos para os IDs de Nacionalidade e CBO em `DataGridColumnVisibility`.
  - Incluir os defaults das duas colunas no estado inicial/reset sem invalidar Views Salvas antigas que não possuam essas chaves.
  - Validação: ocultar, mostrar e resetar cada coluna não altera a ordem solicitada.

### 2. Integrar as colunas à exportação da tabela

- [x] 2.1: Em `components/individual-processes/individual-processes-table.tsx`, adicionar Nacionalidade e CBO ao mapa de cabeçalhos da exportação.
- [x] 2.2: Adicionar os casos correspondentes em `getExportValue` usando exatamente os mesmos fallbacks da UI.
  - Nacionalidade: nome do país ou `-`.
  - CBO: `código - título`, título ou `-`.
  - Validação: exportação plana e agrupada incluem somente as colunas visíveis, com cabeçalhos localizados e sem IDs crus.

### 3. Criar filtros multi-select pesquisáveis

- [x] 3.1: Em `app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`, criar o estado controlado de nacionalidades e CBOs selecionados.
  - Inicializar a partir dos critérios persistidos quando existirem.
  - Usar arrays de IDs (`string[]`) para permitir múltiplas seleções.
- [x] 3.2: Derivar opções únicas e ordenadas a partir dos processos autorizados retornados por `api.individualProcesses.list`.
  - Nacionalidade: `value = nationality._id`; `label = nationality.name`.
  - CBO: `value = cbo._id`; `label = código - título`, com fallback para título.
  - Excluir valores ausentes e ordenar os rótulos alfabeticamente.
  - Validação: opções duplicadas aparecem uma única vez e a busca interna do Combobox encontra nacionalidade, código ou título.
- [x] 3.3: Aplicar os dois filtros em `filteredProcesses` antes de entregar os dados à tabela.
  - Sem valores selecionados, não restringir o resultado.
  - Dentro de Nacionalidade ou CBO, aceitar qualquer ID selecionado (OR).
  - Entre Nacionalidade, CBO e os demais filtros ativos, exigir que todos sejam satisfeitos (AND).
  - Incluir os novos estados nas dependências do `useMemo`.
  - Validação: processos sem a relação não aparecem quando o respectivo filtro está ativo, mas continuam visíveis quando ele está limpo.
- [x] 3.4: Passar opções, seleções e callbacks controlados para `IndividualProcessesTable`, preservando o escopo atual de filtros para admin/client.
- [x] 3.5: Em `components/individual-processes/individual-processes-table.tsx`, adicionar as props tipadas de ambos os filtros e renderizar dois `Combobox` com `multiple`.
  - Reutilizar `components/ui/combobox.tsx` com busca, estado vazio e botão de limpar acessível.
  - Manter o layout `flex-wrap` e larguras compatíveis com os demais filtros em mobile e desktop.
  - Validação: selecionar, remover individualmente e limpar todos os valores atualiza a tabela sem recarregar a página.

### 4. Persistir os filtros e integrá-los às Views Salvas

- [x] 4.1: Incluir `selectedNationalities` e `selectedCbos` em toda a máquina de estado de filtros de `individual-processes-client.tsx`.
  - `hasActiveFilters` e suas dependências.
  - `getCurrentFilterCriteria` e suas dependências.
  - restauração inicial via `loadPersistedFilters`.
  - `handleApplySavedFilter`, incluindo limpeza antes de aplicar.
  - `handleClearFilter`.
  - dependências de `filteredProcesses` e persistência via `persistFilters`.
  - Validação: navegar ao detalhe e voltar restaura as seleções; limpar filtros remove ambas e volta ao estado padrão.
- [x] 4.2: Garantir que criação, aplicação e edição de Views Salvas conservem os dois arrays de IDs sem mudança no contrato genérico de `convex/savedFilters.ts`.
  - Validação: uma View com várias nacionalidades e CBOs reproduz exatamente o resultado ao ser reaplicada.
- [x] 4.3: Em `components/saved-filters/save-filter-sheet.tsx`, incluir Nacionalidade e CBO no resumo dos critérios ativos.
  - Mostrar a quantidade selecionada de cada filtro.
  - Validação: uma View que tenha somente Nacionalidade ou somente CBO continua habilitada para salvar e exibe um resumo não vazio.

### 5. Internacionalização

- [x] 5.1: Em `messages/pt.json`, revisar/reutilizar `IndividualProcesses.nationality` e `IndividualProcesses.cbo` e adicionar as mensagens dos filtros.
  - Placeholders, pesquisa, resultado vazio e aria-label de limpeza para Nacionalidade e CBO.
  - Resumos `SavedFilters.filterSummary.nationalities` e `SavedFilters.filterSummary.cbos`, ambos com `{count}`.
- [x] 5.2: Adicionar a árvore equivalente em `messages/en.json`, mantendo as mesmas chaves e placeholders.
  - Validação: nenhum texto novo visível fica hardcoded e pt/en mantêm paridade estrutural.

### 6. Quality gates

- [x] 6.1: Executar `pnpm exec tsc --noEmit`.
- [ ] 6.2: Executar `pnpm lint` e `pnpm run build`.
  - Build concluído com sucesso. O lint global continua bloqueado por erros `no-explicit-any` preexistentes em vários arquivos não relacionados; o lint direcionado aos arquivos desta feature não apontou erros novos.
- [x] 6.3: Validar manualmente em `/pt/individual-processes` e `/en/individual-processes`.
  - Nacionalidade aparece após Candidato; CBO aparece imediatamente após Pendências.
  - Valores ausentes exibem `-` sem quebrar sorting, busca ou exportação.
  - Busca global encontra país, código e título do CBO, inclusive sem acentos.
  - Filtros aceitam múltiplos valores, combinam corretamente com os demais e podem ser limpos.
  - Colunas podem ser ocultadas/restauradas e mantêm os rótulos corretos.
  - Exportações plana e agrupada respeitam visibilidade e valores exibidos.
  - Persistência em navegação e Views Salvas inclui Nacionalidade e CBO.
- [x] 6.4: Conferir responsividade e acessibilidade em `sm`, `md` e `lg`.
  - Sem sobreposição dos filtros ou quebra do scroll horizontal da tabela.
  - Comboboxes operáveis por teclado, com foco visível, busca e botão de limpar anunciado.
- [x] 6.5: Confirmar gates de backend não aplicáveis.
  - Nenhuma nova entrada exige Zod.
  - Nenhuma função pública Convex, validator, índice ou regra de RBAC foi criada/modificada.
  - A query existente continua limitando clientes às empresas autorizadas antes dos filtros client-side.

## Definition of Done

- [x] A coluna Nacionalidade está visível após Candidato e mostra a nacionalidade correta de cada pessoa.
- [x] A coluna CBO está visível imediatamente após Pendências e mostra código/título do processo individual.
- [x] As duas colunas suportam ordenação, busca global, visibilidade e exportação.
- [x] Os filtros de Nacionalidade e CBO são pesquisáveis, multi-select e combinam corretamente com os demais filtros.
- [x] Persistência em sessão, limpar filtros e Views Salvas preservam os novos critérios.
- [x] Textos e aria-labels existem em pt e en.
- [ ] TypeScript, lint e build passam sem novos erros.

---

# TODO: Direcionar “Adicionar Documento” para a exigência mais recente

## Contexto

Na tela de detalhe do Processo Individual, o botão global **Adicionar Documento** fica fora dos grupos de exigência. Quando o andamento mais recente do processo for uma exigência, esse botão deve perguntar se o documento será inserido nela, exibindo o nome e a data da exigência. Ao confirmar com **Sim**, deve abrir o modal existente **Documentos do Andamento**, vinculado exatamente a esse andamento; ao escolher **Não**, deve preservar o menu atual para adicionar o documento fora da exigência.

## Decisões de implementação

- Considerar como “mais recente” o primeiro item de `api.individualProcessStatuses.getStatusHistory`, que já retorna os andamentos em ordem decrescente por data.
- Aplicar a interceptação somente ao botão global de administrador e somente quando `statusHistory[0].caseStatus.code === "exigencia"`.
- Reutilizar `StatusDocumentsDialog`; os fluxos internos de documento avulso, com tipo ou existente já recebem o `individualProcessStatusId` e fazem o vínculo com a exigência.
- Não alterar backend, schema ou API gerada: a query existente já possui RBAC e fornece ID, status, cor, código e data necessários.
- Enquanto o histórico ainda estiver carregando, impedir que o clique siga pelo fluxo comum sem verificar a exigência.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revisar o PRD e os padrões de histórico/documentos existentes.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/individualProcessStatuses.ts`, `components/individual-processes/individual-process-statuses-subtable.tsx` e `components/individual-processes/status-documents-dialog.tsx`.
- [x] 0.2: Confirmar os arquivos exatos da mudança.
  - Modificar: `components/individual-processes/document-checklist-card.tsx`, `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `components/individual-processes/status-documents-dialog.tsx` e `components/ui/alert-dialog.tsx`.
  - Validação: nenhuma mudança em `convex/`, `convex/schema.ts` ou `convex/_generated/`.

### 1. Interceptar o botão global de documentos quando a exigência for o último andamento

- [x] 1.1: Em `components/individual-processes/document-checklist-card.tsx`, derivar de forma tipada o andamento mais recente e a exigência ativa para o redirecionamento.
  - Usar somente `statusHistory?.[0]`; não procurar qualquer exigência antiga para decidir se o aviso será exibido.
  - Preparar nome conforme o locale (`name` em pt; `nameEn` com fallback para `name` em en) e data/hora formatada para exibição.
  - Validação: não introduzir `any`; histórico vazio ou último andamento diferente de exigência mantém o comportamento atual.
- [x] 1.2: Controlar a abertura do menu global **Adicionar Documento** e adicionar o aviso de confirmação com componentes de `components/ui/alert-dialog.tsx`.
  - Se o último andamento for exigência, o primeiro clique abre o aviso e mostra explicitamente nome e data da exigência.
  - **Sim** fecha o aviso e abre `StatusDocumentsDialog` com `_id`, nome, cor, código e data do andamento mais recente.
  - **Não** fecha o aviso e abre o menu global já existente, preservando “Novo Avulso”, “Novo com Tipo” e “Selecionar Existente” fora da exigência.
  - Se não houver exigência como último andamento, abrir diretamente o menu global existente, sem aviso.
  - Validação: não criar vínculo nem mutação ao confirmar; o documento só é inserido quando o usuário conclui uma ação dentro de **Documentos do Andamento**.
- [x] 1.3: Renderizar e fechar `StatusDocumentsDialog` no mesmo card sem conflitar com os outros dialogs.
  - Passar o `individualProcessStatusId` exato da exigência mais recente e `userRole="admin"`.
  - Ao fechar o modal ou qualquer subfluxo, limpar somente o estado desse novo encaminhamento.
  - Validação: o modal abre com o título **Documentos do Andamento**, badge da exigência e data corretos; os dialogs já existentes continuam funcionando.

### 2. Internacionalização

- [x] 2.1: Adicionar em `messages/pt.json`, no namespace `DocumentChecklist`, as chaves do título e da descrição do aviso, com placeholders para `{status}` e `{date}`.
- [x] 2.2: Adicionar as mesmas chaves e placeholders em `messages/en.json`.
  - Reutilizar `Common.yes` e `Common.no` nos botões.
  - Validação: nenhum texto novo visível fica hardcoded e as duas árvores de mensagens permanecem equivalentes.

### 3. Quality gates

- [x] 3.1: Executar `pnpm exec tsc --noEmit`.
- [ ] 3.2: Executar `pnpm lint` e `pnpm run build`.
  - Bloqueio parcial: `pnpm lint` foi executado, mas o repositório já possui erros globais anteriores de `no-explicit-any` e avisos de imports/hooks; a alteração não adicionou novas ocorrências. O build limpo passou.
- [x] 3.3: Validar manualmente em `/pt/individual-processes/[id]` com administrador:
  - último andamento = exigência: aviso mostra a exigência mais recente e sua data;
  - **Sim**: abre **Documentos do Andamento** da mesma exigência e os fluxos de novo avulso, novo com tipo e seleção de existente permanecem vinculados a ela;
  - **Não**: abre o menu global e permite adicionar fora da exigência;
  - último andamento diferente de exigência ou histórico vazio: menu global abre sem aviso;
  - uma exigência antiga com andamento mais novo de outro tipo: não exibe o aviso.
- [x] 3.4: Conferir `/en/individual-processes/[id]` e layouts mobile/desktop (`sm`, `md`, `lg`), incluindo foco, teclado e fechamento dos dialogs.
- [x] 3.5: Confirmar gates não aplicáveis: nenhuma nova fronteira de entrada exige Zod e nenhuma função pública Convex/RBAC foi criada ou modificada.

## Definition of Done

- [x] O aviso depende exclusivamente do andamento mais recente ser uma exigência.
- [x] O aviso exibe nome e data da exigência em pt e en.
- [x] **Sim** abre **Documentos do Andamento** da exigência correta; **Não** preserva a inclusão fora dela.
- [x] Nenhum documento é vinculado antes da seleção/confirmação no modal de andamento.
- [ ] TypeScript, lint e build passam sem novos erros.

---

# TODO: Lista de documentos por andamento no Processo Individual

## Contexto

Na visualização individual de um Processo Individual, o card existente de documentos deve se apresentar como **Lista de documentos** e oferecer, logo abaixo do título, duas abas. A aba **Documentos** preserva integralmente a organização e as ações atuais. A aba **Por andamento** usa o snapshot imutável `documentsDelivered.processStatusAtUpload` para mostrar em qual fase cada versão de documento foi enviada. Versões/documentos legados que possuem arquivo, mas não possuem snapshot, devem aparecer em **Sem andamento**.

## Decisões de implementação

- Reutilizar `components/individual-processes/document-checklist-card.tsx` como o card **Lista de documentos**; não criar um segundo card nem duplicar queries, dialogs ou ações do fluxo atual.
- Manter **Documentos** como aba padrão e mover o conteúdo atual para ela sem alterar progresso, agrupamento por exigência, pendentes/recebidos, relatórios, seleção em massa ou uploads.
- Tratar cada linha de `documentsDelivered` que possua arquivo como uma versão enviada. Assim, se o mesmo documento tiver versões enviadas em andamentos diferentes, cada versão aparece no grupo correspondente ao seu próprio snapshot.
- Não usar o andamento atual do processo, `individualProcessStatusId` de vínculo com exigência, nem consultar o catálogo atual para reconstruir o histórico. Nome, tradução, cor e identidade do grupo vêm exclusivamente de `processStatusAtUpload`, preservando a imutabilidade histórica.
- Identificar uma fase primeiro por `processStatusAtUpload.individualProcessStatusId`; para snapshots sem esse ID, usar `caseStatusId` e, por último, uma chave estável formada pelos campos denormalizados. Registros sem `processStatusAtUpload` pertencem ao grupo especial **Sem andamento**.
- Considerar “enviado” somente registro com versão maior que zero e anexo real (`storageId` ou `fileUrl` não vazio); placeholders `not_started`, campos informativos sem arquivo e requisitos ainda não preenchidos não entram em **Por andamento**.
- Ordenar os grupos pelo envio mais recente, deixando **Sem andamento** por último; dentro de cada grupo, ordenar versões por `uploadedAt` decrescente.
- A aba histórica permite abrir a versão exata em `DocumentReviewDialog`, mas não oferece nela ações destrutivas, reenvio, atribuição de tipo ou seleção em massa. Essas ações permanecem na aba **Documentos**, que representa o estado atual.
- Preservar o mesmo RBAC da listagem atual: administrador vê os documentos do processo e cliente vê apenas processos autorizados, sem receber versões marcadas como excluídas para o cliente.
- Não alterar `convex/schema.ts`, não criar migração e não retropreencher dados legados; o fallback **Sem andamento** é o comportamento intencional para snapshots ausentes.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revisar o PRD, o modelo de versões e os padrões existentes de documentos/andamentos.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/schema.ts`, `convex/lib/documentProgressSnapshot.ts`, `convex/documentsDelivered.ts`, `components/individual-processes/document-checklist-card.tsx` e `components/individual-processes/document-review-dialog.tsx`.
  - Confirmado: `documentsDelivered` armazena uma linha por versão, `processStatusAtUpload` é um snapshot denormalizado e imutável, `api.documentsDelivered.list`/`listGroupedByCategory` retornam apenas `isLatest`, e `DocumentReviewDialog` abre uma versão específica pelo ID.
- [x] 0.2: Confirmar os arquivos exatos da mudança.
  - Modificar: `convex/documentsDelivered.ts`.
  - Modificar: `components/individual-processes/document-checklist-card.tsx`.
  - Modificar: `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `components/ui/tabs.tsx`, `components/individual-processes/document-review-dialog.tsx`, `convex/lib/documentProgressSnapshot.ts` e `convex/schema.ts`.
  - Validação: não editar manualmente `convex/_generated/` e não criar novos componentes sem necessidade.

### 1. Disponibilizar as versões enviadas com seu snapshot histórico

- [x] 1.1: Criar em `convex/documentsDelivered.ts` uma query pública, por exemplo `listVersionsByProgress`, para obter todas as versões enviadas de um Processo Individual.
  - Validar `args` e `returns` com validators Convex, incluindo `individualProcessId`, IDs tipados, metadados do arquivo/versão, status de revisão, documento/tipo enriquecido e o objeto opcional `processStatusAtUpload`.
  - Buscar pelo índice `by_individualProcess`; filtrar em memória somente após a leitura indexada para manter versões com `version > 0` e anexo real, sem usar `.filter()` do Convex em uma query sem índice.
  - Ordenar por `uploadedAt` decrescente e enriquecer o nome do tipo de documento; manter fallback para `documentName`/`fileName` no frontend.
  - Validação: a query retorna v1, v2 e demais versões, não somente `isLatest`, e nunca inclui placeholders sem arquivo.
- [x] 1.2: Aplicar na nova query os mesmos checks de autenticação e visibilidade das queries atuais.
  - Carregar o Processo Individual, obter o perfil e chamar `requireClientCanAccessProcess` antes de devolver documentos.
  - Para `client`, remover versões com `excludedFromReport === true`, seguindo `listGroupedByCategory`; para `admin`, preservar todas as versões autorizadas do processo.
  - Validação: um cliente não consegue consultar outro processo/empresa e a nova query não amplia o escopo de dados existente.
- [x] 1.3: Manter o snapshot como fonte histórica sem resolução posterior.
  - Retornar `processStatusAtUpload` como gravado na versão; não buscar `caseStatuses` nem `individualProcessStatuses` para substituir nome, tradução, código, cor ou categoria.
  - Validação: alterar o andamento atual ou o catálogo de status não modifica retroativamente o grupo exibido para uma versão já enviada.

### 2. Adicionar as abas ao card Lista de documentos

- [x] 2.1: Em `components/individual-processes/document-checklist-card.tsx`, envolver o conteúdo do card com `Tabs`, `TabsList`, `TabsTrigger` e `TabsContent` de `components/ui/tabs.tsx`.
  - Exibir as abas **Documentos** e **Por andamento** logo abaixo do título **Lista de documentos**.
  - Definir **Documentos** como aba inicial e manter cabeçalho, descrição e ações globais acessíveis sem duplicação.
  - Validação: o conteúdo hoje existente no card é movido integralmente para `TabsContent value="documents"`, sem regressão de progresso, exigências, pendentes, recebidos, empty state, seleção, PDF ou dialogs.
- [x] 2.2: Consultar `api.documentsDelivered.listVersionsByProgress` para alimentar a aba **Por andamento** e modelar os grupos sem `any` novo.
  - Derivar o nome localizado do snapshot: em pt usar `name`; em en usar `nameEn` com fallback para `name`.
  - Agrupar por identidade do snapshot, não apenas pelo texto do nome, para que duas ocorrências distintas do mesmo andamento não sejam mescladas indevidamente.
  - Criar **Sem andamento** para versões sem snapshot, posicionando esse grupo por último; ordenar os demais grupos e suas versões pela data de envio mais recente.
  - Validação: uma v1 enviada no andamento A e uma v2 no andamento B aparecem simultaneamente e nos grupos corretos.
- [x] 2.3: Renderizar cada grupo de andamento com seu nome, cor opcional e quantidade de versões, seguido pelos documentos enviados naquela fase.
  - Cada item deve mostrar pelo menos nome do documento, versão, data/hora do envio e badge do status de revisão já localizado.
  - Ao clicar, abrir `DocumentReviewDialog` com o `_id` daquela versão exata, inclusive quando ela não for `isLatest`.
  - Não expor nas linhas históricas botões de excluir, reenviar, atribuir tipo, reaproveitar ou selecionar em massa; manter essas ações na aba **Documentos**.
  - Validação: abrir uma versão antiga não redireciona para a última versão e não permite mutação acidental do histórico.
- [x] 2.4: Implementar estados de carregamento e vazio específicos da aba histórica.
  - Exibir loading localizado enquanto a query de versões não retornar.
  - Quando não houver nenhuma versão enviada, mostrar um empty state localizado sem confundir com os requisitos pendentes existentes na aba **Documentos**.
  - Validação: processos contendo somente placeholders exibem a lista atual em **Documentos** e o vazio correto em **Por andamento**.

### 3. Internacionalização, responsividade e acessibilidade

- [x] 3.1: Adicionar ao namespace `DocumentChecklist` de `messages/pt.json` as chaves para **Documentos**, **Por andamento**, **Sem andamento**, versão, data de envio, quantidade e empty state histórico.
- [x] 3.2: Adicionar as mesmas chaves e placeholders em `messages/en.json`, usando **Document list**, **Documents**, **By progress** e **No progress** como equivalentes.
  - Validação: as árvores pt/en mantêm paridade e nenhum novo título, badge, aria-label ou mensagem visível fica hardcoded.
- [x] 3.3: Ajustar o layout das abas e grupos para `sm`, `md` e `lg`.
  - `TabsList` deve ocupar a largura disponível no mobile sem overflow; cabeçalhos e linhas devem quebrar nome/metadados sem esconder as ações globais.
  - Manter navegação por teclado, foco visível, semântica Radix e alvo clicável claro para abrir a versão.

### 4. Quality gates

- [x] 4.1: Executar `pnpm exec tsc --noEmit` sem introduzir `any`, casts irrestritos ou erros nos validators/IDs Convex.
- [x] 4.2: Executar lint focado em `convex/documentsDelivered.ts` e `components/individual-processes/document-checklist-card.tsx`, depois `pnpm lint` e `pnpm run build`, registrando separadamente falhas globais preexistentes.
  - Resultado: TypeScript e build de produção passaram. O lint focado e o lint global continuam bloqueados por ocorrências preexistentes de `no-explicit-any`, `prefer-const` e avisos em arquivos já alterados; nenhuma ocorrência apontada está nas linhas adicionadas por esta feature.
- [ ] 4.3: Validar manualmente como administrador em `/pt/individual-processes/[id]` e `/en/individual-processes/[id]`:
  - abas aparecem logo após o título e **Documentos** abre por padrão com tudo como antes;
  - uma única versão aparece no andamento capturado;
  - versões do mesmo documento enviadas em andamentos diferentes aparecem nos dois grupos e abrem os arquivos corretos;
  - documento legado com arquivo e sem snapshot aparece em **Sem andamento**;
  - placeholders/itens sem arquivo não aparecem em **Por andamento**;
  - alteração posterior do andamento atual não move versões já registradas;
  - loading, vazio, nomes pt/en, cores, contagens e ordenação estão corretos.
  - Validação parcial concluída no processo de Isa Dogan: **Documentos** abre por padrão, pt/en corretos, uma versão aparece em **Exigência/Requirements Requested**, quatro versões legadas aparecem em **Sem andamento/No progress**, e a v1 histórica abre pelo próprio `_id`. Os cenários de duas versões capturadas em andamentos diferentes e troca posterior do andamento não foram forçados para não alterar dados do ambiente.
- [ ] 4.4: Validar como cliente um processo autorizado e uma tentativa de acesso a processo não autorizado.
  - Confirmar que versões excluídas para cliente permanecem ocultas e que abrir uma versão mantém os checks de acesso de `DocumentReviewDialog`.
  - Bloqueio de validação manual: o ambiente forneceu apenas credencial administrativa. A query reutiliza `requireClientCanAccessProcess`, remove `excludedFromReport` para `client` e o dialog continua consultando a versão por suas APIs autenticadas existentes.
- [x] 4.5: Conferir mobile e desktop (`sm`, `md`, `lg`), teclado, foco e ausência de overflow nas abas, grupos e linhas históricas.
  - Validado no desktop e em viewport 390×844: abas e painel sem overflow horizontal; `ArrowLeft`/`ArrowRight` alternam as abas e preservam `aria-selected` corretamente.

## Definition of Done

- [x] O detalhe do Processo Individual apresenta o card **Lista de documentos** com as abas **Documentos** e **Por andamento** logo após o título.
- [x] **Documentos** mantém integralmente o comportamento atual.
- [x] **Por andamento** lista todas as versões realmente enviadas sob o snapshot imutável capturado no upload.
- [x] Versões sem snapshot aparecem em **Sem andamento** e placeholders sem arquivo não aparecem na visão histórica.
- [x] Uma versão antiga pode ser visualizada pelo seu próprio ID, sem ações que alterem o histórico.
- [x] RBAC e visibilidade de cliente permanecem equivalentes aos fluxos atuais.
- [x] i18n pt/en, TypeScript strict, validators Convex, responsividade, acessibilidade, lint e build passam sem novos erros.
  - TypeScript e build passam; a feature não adiciona erros de lint. O lint global continua falhando apenas por débitos preexistentes registrados em 4.2.

---

# TODO: Reaproveitar upload do passaporte no documento do processo

## Contexto

Quando um administrador criar ou editar um passaporte com um novo arquivo — usando leitura por IA ou preenchimento manual — o sistema deve procurar, nos Processos Individuais da pessoa, documentos atuais chamados **Passaporte válido** ou **Passaporte**. Havendo candidatos, deve perguntar se o mesmo arquivo salvo no passaporte será anexado ao documento do processo. Um único candidato fica pré-selecionado; múltiplos candidatos aparecem em uma lista para escolha. Se o destino já possuir arquivo, o administrador deve escolher entre substituir a versão atual ou adicionar uma nova versão.

## Decisões de implementação

- Disparar a oferta somente quando a submissão atual salvar um arquivo novo (`storageId` novo); editar apenas os campos ou manter o arquivo existente não abre o fluxo.
- Salvar primeiro o passaporte e só então resolver o anexo. Sem candidato, ao escolher **Agora não** ou após anexar com sucesso, continuar o callback/fechamento/navegação já existente.
- Considerar apenas registros `documentsDelivered` atuais (`isLatest`) dos processos encontrados pelo índice `individualProcesses.by_person`. Comparar `documentTypes.name` e, como fallback, `documentsDelivered.documentName` após remover acentos, normalizar caixa e espaços; aceitar somente igualdade com `passaporte` ou `passaporte valido`, sem correspondência parcial.
- Reutilizar o mesmo `storageId`/URL do passaporte; não enviar o arquivo novamente ao Convex Storage. Derivar MIME, tamanho e extensão dos metadados armazenados, sem confiar em metadados enviados pelo cliente.
- Destino sem arquivo: preencher o documento pendente. Destino com arquivo: **Substituir** atualiza a linha latest sem incrementar `version`; **Adicionar nova versão** mantém o histórico, marca a atual como não latest e cria `max(version) + 1`. Ambos voltam para `uploaded`, limpam revisão/rejeição incompatível, registram snapshot do andamento, histórico e atividade.
- Remover os disparos automáticos atuais de sincronização ao salvar passaporte, vincular passaporte ou gerar checklist. O anexo deve depender da escolha explícita do administrador e uma recusa não pode ser desfeita silenciosamente depois.
- Não alterar `convex/schema.ts`, não criar migração nem índice: reutilizar `by_person`, `by_individualProcess` e o modelo de versões existente. Não editar manualmente `convex/_generated/`.
- Não criar testes automatizados para este MVP; validar com TypeScript, lint, build e browser autenticado.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Confirmar o contrato final nos padrões já mapeados.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/schema.ts`, `convex/lib/passportDocumentSync.ts`, `convex/documentsDelivered.ts`, `convex/lib/documentProgressSnapshot.ts`, `components/passports/passport-ai-upload-field.tsx`, `components/passports/passport-form-dialog.tsx` e `components/passports/passport-form-page.tsx`.
  - Validar: o arquivo novo chega como `preparedStorageId`; `documentsDelivered` já representa versões por linha; `PassportFormDialog` cobre processo individual, tabela de passaportes e subtabela da pessoa; `PassportFormPage` cobre `/[locale]/passports/new`.
- [x] 0.2: Confirmar os caminhos exatos da entrega.
  - Criar: `convex/passportDocumentAttachments.ts`.
  - Criar: `components/passports/passport-document-attachment-dialog.tsx`.
  - Modificar: `convex/lib/passportDocumentSync.ts`, `convex/passports.ts`, `convex/individualProcesses.ts`, `convex/lib/documentChecklist.ts`, `components/passports/passport-form-dialog.tsx`, `components/passports/passport-form-page.tsx`, `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `convex/lib/auth.ts`, `convex/lib/stringUtils.ts`, `convex/lib/documentProgressSnapshot.ts`, `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/button.tsx`, `components/ui/scroll-area.tsx`, `components/ui/badge.tsx` e `lib/validations/passports.ts`.

### 1. Detectar destinos e anexar o arquivo com segurança no Convex

- [x] 1.1: Em `convex/passportDocumentAttachments.ts`, criar uma query pública tipada para listar destinos pelo `passportId`.
  - Exigir `requireAdmin`, carregar o passaporte, consultar processos com `withIndex("by_person")` e documentos com `withIndex("by_individualProcess")`; fazer a comparação normalizada somente em memória após as leituras indexadas, sem `.filter()` do Convex.
  - Validar `args` e `returns` explicitamente e retornar somente dados necessários: `documentId`, `individualProcessId`, referência do processo, nome do documento, status, versão, nome do arquivo atual e `hasFile`.
  - Incluir somente documentos latest com nome normalizado exatamente `passaporte` ou `passaporte valido`; não retornar versões históricas, documentos de outra pessoa nem correspondências por substring.
- [x] 1.2: No mesmo arquivo, criar uma mutação pública administrativa para anexar o arquivo com modo `fill`, `replace` ou `new_version`.
  - Validar `passportId`, `documentId`, versão esperada e modo com validators Convex, incluindo validator de retorno; usar `Id<"passports">`/`Id<"documentsDelivered">` e nenhuma tipagem `any` nova.
  - Recarregar passaporte, processo, documento latest e tipo dentro da transação; revalidar dono, nome aceito, existência do arquivo e versão esperada para impedir seleção adulterada, race condition e versão duplicada.
  - `fill`: preencher o placeholder existente. `replace`: manter o número da versão e substituir o arquivo atual. `new_version`: tornar a atual não latest e inserir a próxima versão copiando requirement, vínculo com exigência, visibilidade e demais metadados estruturais aplicáveis.
  - Em todos os modos, reutilizar o arquivo do passaporte, aplicar datas de emissão/validade, capturar `processStatusAtUpload`, ajustar status/revisão, registrar `documentStatusHistory`, atividade e condições com a mesma paridade dos uploads existentes.
  - Tornar a operação idempotente: duplo clique não cria duas versões; conflito de versão/latest retorna erro controlado para a interface recarregar os candidatos.
- [x] 1.3: Em `convex/lib/passportDocumentSync.ts`, manter apenas helpers explícitos reutilizáveis pela nova API e eliminar o comportamento automático.
  - Remover imports/chamadas de sincronização em `convex/passports.ts`, `convex/individualProcesses.ts` e `convex/lib/documentChecklist.ts`.
  - Validação: criar/atualizar passaporte, vincular `passportId` e gerar/regenerar checklist nunca anexam arquivo sem confirmação; a nova query/mutação continua restrita a `admin`.

### 2. Perguntar, selecionar o destino e preservar os fluxos administrativos

- [x] 2.1: Criar `components/passports/passport-document-attachment-dialog.tsx` como orquestrador compartilhado após o passaporte ser salvo.
  - Enquanto consulta candidatos, manter a conclusão do formulário em estado controlado; zero candidatos conclui sem mostrar pergunta, um candidato vem pré-selecionado e mais de um renderiza uma lista selecionável com processo, documento, status, arquivo atual e versão.
  - Perguntar se deseja anexar o passaporte. Para destino vazio, oferecer **Anexar**; para destino com arquivo, exigir escolha explícita entre **Substituir** e **Adicionar nova versão** antes de confirmar.
  - Oferecer **Agora não** sem alterar documentos. Em sucesso, erro ou conflito, impedir dupla submissão, manter foco/teclado acessíveis, mostrar feedback localizado e permitir tentar novamente ou concluir sem anexo.
- [x] 2.2: Integrar o diálogo em `components/passports/passport-form-dialog.tsx`.
  - Abrir o fluxo somente quando o create/update confirmado tiver usado o novo `storageId`, passando o `passportId` criado/atualizado; não chamar `onSuccess`, fechar ou resetar o formulário antes da decisão terminar.
  - Após anexar, recusar ou não encontrar candidato, preservar exatamente o callback que seleciona o novo passaporte nos consumidores atuais.
  - Validação: edição sem arquivo novo, cancelamento e erro ao salvar o passaporte não consultam nem alteram documentos do processo.
- [x] 2.3: Integrar a mesma composição em `components/passports/passport-form-page.tsx`.
  - Adiar `onSuccess` ou `router.push` somente durante a resolução opcional do anexo e limpar estado temporário ao concluir.
  - Validação: `/pt/passports/new` e `/en/passports/new` continuam navegando normalmente quando não há destino ou o administrador escolhe **Agora não**; não duplicar lógica de seleção/versão entre página e modal.
- [x] 2.4: Garantir responsividade e acessibilidade com componentes existentes.
  - Em mobile, manter lista, nomes e ações sem overflow; em `sm`, `md` e `lg`, destacar destino e estratégia selecionados.
  - Preservar foco ao abrir/fechar, navegação por teclado, descrições acessíveis, estado `aria-busy`/`aria-live` e bloqueio de fechamento somente durante a mutação.

### 3. Internacionalização e quality gates

- [x] 3.1: Adicionar em `messages/pt.json`, no namespace `Passports`, textos para busca de destinos, pergunta de reaproveitamento, lista múltipla, documento vazio/com arquivo, substituir, nova versão, agora não, sucesso, conflito e erro.
- [x] 3.2: Adicionar as mesmas chaves e placeholders em `messages/en.json`.
  - Validação: árvores pt/en equivalentes; título, descrição, botões, badges, toasts, estados vazios e labels acessíveis sem texto hardcoded.
- [x] 3.3: Executar `pnpm exec tsc --noEmit`, lint focado nos arquivos criados/modificados, `pnpm lint` e `pnpm run build`, separando débitos globais preexistentes.
  - Confirmar TypeScript strict, nenhum `any` novo, IDs Convex corretos, `args`/`returns` em todas as funções públicas, queries indexadas e ausência de edição em `convex/_generated/`.
  - Confirmar a fronteira de formulário existente com `passportSchema`/Zod e a resposta de upload com `passportUploadResponseSchema`; a nova escolha de estratégia é validada na fronteira pública por união literal Convex, sem JSON não validado.
  - Resultado: `pnpm exec convex codegen`, `pnpm exec tsc --noEmit`, lint focado e `pnpm run build` passaram; as 18 chaves novas mantêm paridade pt/en. `convex/_generated/api.d.ts` foi atualizado exclusivamente pelo codegen. O `pnpm lint` global continua falhando em débitos preexistentes fora da feature, enquanto os arquivos novos/modificados do fluxo estão limpos no lint focado.
- [ ] 3.4: Validar no browser autenticado como administrador com `http://localhost:3000/`, usando `/pt` e `/en`.
  - Sem documento correspondente: salvar conclui sem pergunta. Um pendente: pergunta e anexa o mesmo arquivo. Mais de um: lista e anexa somente ao destino selecionado. **Agora não** não altera nenhum documento.
  - Destino com arquivo: **Substituir** mantém a versão e troca o arquivo; **Adicionar nova versão** incrementa uma única vez, preserva a anterior e deixa somente a nova como latest.
  - Cobrir `/[locale]/passports/new`, edição na tabela de passaportes, inclusão pelo seletor do Processo Individual e edição pela subtabela de passaportes da pessoa.
  - Conferir que apenas upload novo dispara a oferta, que OCR e preenchimento manual usam o mesmo fluxo, que não há segundo upload de storage, e que console/network ficam sem erro.
  - Validação parcial: login administrativo e `/pt/passports/new` carregaram sem erro de console; a query autenticada retornou quatro destinos **Passaporte** para a pessoa de teste, sendo três pendentes e um já enviado na versão 2. O seletor nativo de arquivos do navegador automatizado não aceita preenchimento programático, então os cliques finais de upload/anexo/substituição não foram forçados sobre os dados do ambiente.
- [ ] 3.5: Revisar segurança/RBAC e interface em mobile/desktop.
  - Confirmar por chamada autenticada que `client` não lista candidatos nem executa o anexo e que um `documentId` de outra pessoa/processo é rejeitado no backend.
  - Conferir viewports `sm`, `md`, `lg`, teclado, foco, leitor de tela e fechamento seguro durante loading/mutação.
  - Validação parcial: chamadas autenticadas com role `client` foram recusadas em `listCandidates` e `attach`; uma tentativa administrativa com documento de outra pessoa retornou `DOCUMENT_ACCESS_DENIED`; passaporte sem arquivo retornou `PASSPORT_FILE_NOT_FOUND` sem mutar o destino. A revisão responsiva/acessível ficou estática e coberta pelo lint/build, sem automação completa dos viewports.

## Definition of Done

- [x] Um novo upload de passaporte no admin procura documentos latest chamados **Passaporte válido** ou **Passaporte** nos processos da pessoa.
- [x] Um candidato gera confirmação; vários candidatos geram lista com seleção explícita do destino.
- [x] Documento já preenchido exige escolha entre substituir a versão atual e criar uma nova versão.
- [x] O mesmo arquivo do passaporte é reutilizado sem novo upload, com histórico, snapshot, condições e auditoria consistentes.
- [x] Nenhum caminho automático anexa o passaporte após o administrador recusar ou sem sua confirmação.
- [ ] Auth/RBAC, i18n pt/en, TypeScript strict, Zod/validators, responsividade, acessibilidade, lint, build e validação browser passam sem novos erros.
  - Auth/RBAC, i18n, TypeScript, validators, lint focado e build passaram. Permanecem pendentes apenas o lint global preexistente e a execução manual dos cenários que dependem do seletor nativo de arquivos.
  - Ajuste posterior: quando o administrador confirma o anexo, os modos `fill`, `replace` e `new_version` salvam o documento diretamente como `approved`, com `reviewedBy` e `reviewedAt` do próprio administrador e histórico de aprovação.

---

# TODO: Vincular o passaporte do cadastro rápido ao processo recém-criado

## Contexto

No wizard administrativo de criação de processos, tanto no fluxo **Individual** quanto no **Coletivo**, o botão **Adicionar Pessoa Rápido** já permite usar passaporte/OCR. Esse caminho salva imediatamente a pessoa e o passaporte no Convex e devolve `personId` e `passportId`, mas hoje o wizard conserva apenas o `personId`: o passaporte se perde do estado do candidato e o novo Processo Individual é criado sem `passportId`.

O novo fluxo deve manter esse passaporte associado ao candidato durante o preenchimento, criar cada Processo Individual já vinculado ao passaporte correto e aguardar a conclusão da criação do processo e do checklist. Somente depois disso o administrador recebe a oferta de usar o mesmo arquivo como documento oficial **Passaporte** ou **Passaporte válido**. O anexo deve reutilizar o fluxo já implementado, salvar o documento como aprovado e nunca reenviar o arquivo ao storage.

## Decisões de workflow

- O upload/OCR do cadastro rápido continua salvando a pessoa e o passaporte imediatamente. Se o administrador remover o candidato, trocar a pessoa, cancelar ou abandonar o wizard, os cadastros continuam válidos, mas nenhum documento de processo é alterado.
- `passportId` passa a ser metadado opcional do candidato no estado do wizard. Ele só é preenchido pelo retorno do cadastro rápido via passaporte; selecionar/trocar a pessoa manualmente limpa esse metadado para impedir associação cruzada.
- Cada chamada de `individualProcesses.create` recebe o `passportId` do respectivo candidato. O backend deve confirmar que o passaporte existe e pertence à mesma `personId` antes de criar o processo.
- A geração dos documentos já ocorre sincronamente dentro de `individualProcesses.create`; portanto, quando a mutação retorna o `individualProcessId`, o checklist daquele processo já pode ser consultado. A pergunta nunca deve abrir antes desse retorno.
- Depois que **todos** os processos da submissão forem criados, formar uma fila somente com os pares `{ individualProcessId, passportId }` originados do cadastro rápido. Resolver a fila antes de limpar o wizard ou redirecionar.
- No fluxo coletivo, cada candidato gera seu próprio Processo Individual e sua própria etapa da fila. Exibir candidato e progresso, por exemplo **Passaporte 2 de 4**, e resolver um passaporte por vez para evitar anexar o arquivo ao processo errado.
- Restringir a busca do diálogo ao Processo Individual recém-criado. Outros processos antigos da mesma pessoa não podem aparecer nessa confirmação. Se o novo checklist tiver mais de um documento com nome elegível, manter a lista existente para o administrador escolher o destino.
- **Agora não** ignora somente o item atual da fila: o processo continua vinculado ao passaporte e o documento oficial permanece pendente. Erro no anexo mantém o item aberto para tentar novamente ou pular; não desfazer processos já criados.
- Quando a fila terminar — inclusive quando nenhum checklist possuir documento elegível — mostrar o sucesso da criação, limpar o wizard e navegar como hoje: detalhe para um processo individual, lista para vários individuais e detalhe do coletivo para processo coletivo.
- Não alterar `convex/schema.ts`: `individualProcesses.passportId`, `passports.storageId` e os índices existentes já atendem ao fluxo. Não persistir uma segunda cópia do arquivo nem editar `convex/_generated/` manualmente.
- Reutilizar a idempotência de `passportDocumentAttachments.attach`: bloquear duplo clique no frontend, enviar `expectedVersion`, não duplicar nova versão em conflito e tratar o mesmo arquivo já aprovado como sucesso. Uma submissão ativa do wizard não pode criar novamente um candidato/processo já registrado na própria tentativa.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Confirmar o contrato atual do cadastro rápido e da criação de processos.
  - Revisar: `components/individual-processes/quick-person-form-dialog.tsx`, `components/process-requests/passport-upload-step.tsx`, `convex/passportUpload.ts`, `components/process-wizard/process-wizard-page.tsx`, `components/process-wizard/use-wizard-state.ts`, `lib/validations/process-wizard.ts` e `convex/individualProcesses.ts`.
  - Confirmar: `PassportUploadStep` devolve `PassportCandidateResult` com `personId`, `passportId` e `storageId`; `QuickPersonFormDialog.onSuccess` já repassa o `passportId`; os dois componentes de candidatos atualmente ignoram o segundo argumento; `individualProcesses.create` aceita `passportId` e gera os checklists antes de retornar o ID.
- [x] 0.2: Confirmar os caminhos exatos da mudança.
  - Criar: `components/process-wizard/passport-attachment-queue.tsx`.
  - Modificar: `lib/validations/process-wizard.ts`, `components/process-wizard/step2-process-data-individual.tsx`, `components/process-wizard/step3-3-candidates-collective.tsx`, `components/process-wizard/process-wizard-page.tsx`, `components/process-wizard/wizard-layout.tsx`, `components/passports/passport-document-attachment-dialog.tsx`, `convex/passportDocumentAttachments.ts`, `convex/individualProcesses.ts`, `messages/pt.json` e `messages/en.json`.
  - Reutilizar sem modificar: `components/individual-processes/quick-person-form-dialog.tsx`, `components/process-requests/passport-upload-step.tsx`, `convex/passportUpload.ts`, `convex/lib/passportDocumentSync.ts`, `components/ui/dialog.tsx`, `components/ui/progress.tsx` e `components/ui/badge.tsx`.
  - Validação: não criar tabela/campo/índice novo e não duplicar a lógica de upload, OCR, seleção de documento, versionamento ou aprovação.

### 1. Preservar o passaporte correto no candidato do wizard

- [x] 1.1: Estender `candidateSchema`/`CandidateData` em `lib/validations/process-wizard.ts` com `passportId` opcional tipado como `Id<"passports">`.
  - Manter o campo dentro de `wizardData.candidates`, de modo que voltar etapas, criar vários candidatos e alternar entre os fluxos individual/coletivo não perca o vínculo.
  - Validação: candidatos escolhidos normalmente continuam válidos sem `passportId`; nenhum `any`, string livre ou `storageId` precisa ser guardado no estado do wizard.
- [x] 1.2: Em `components/process-wizard/step2-process-data-individual.tsx`, capturar o segundo argumento de `QuickPersonFormDialog.onSuccess`.
  - Manter estado temporário `newCandidatePassportId`; ao adicionar, copiar `personId` e `passportId` juntos para o `CandidateData` e limpar ambos da linha de inclusão.
  - Ao trocar o valor de `PersonSelectorWithDetail` manualmente, limpar `newCandidatePassportId` antes de aceitar a nova pessoa. Ao detectar candidato duplicado ou cancelar o modal, não transportar passaporte para outro candidato.
  - Validação: cadastro manual não ganha passaporte implícito; cadastro por OCR conserva exatamente o ID retornado por `passportUpload.applyCandidate`, inclusive quando o OCR resolve pessoa/passaporte já existentes.
- [x] 1.3: Aplicar o mesmo contrato em `components/process-wizard/step3-3-candidates-collective.tsx`.
  - Cada linha adicionada deve conservar apenas o próprio `passportId`; remover uma linha remove também sua intenção de anexo e não afeta os demais candidatos.
  - Validação: múltiplos candidatos com passaportes diferentes mantêm pares estáveis mesmo após adicionar/remover outras linhas; a prevenção de pessoa duplicada continua funcionando.

### 2. Criar e vincular os processos antes de oferecer o anexo

- [x] 2.1: Em `convex/individualProcesses.ts`, reforçar a integridade de `passportId` na mutação pública `create`.
  - Após `requireAdmin`, quando `passportId` vier preenchido, carregar o passaporte e recusar se ele não existir ou se `passport.personId !== args.personId`.
  - Manter validators explícitos e o fluxo atual de criação/checklist; o `passportId` precisa estar gravado no Processo Individual antes de `generateDocumentChecklist` e `generateDocumentChecklistByLegalFramework` executarem.
  - Validação: um admin não consegue forjar o passaporte de outra pessoa; chamadas sem passaporte permanecem retrocompatíveis.
- [x] 2.2: Refatorar `components/process-wizard/process-wizard-page.tsx` para guardar o resultado completo da submissão antes do redirect.
  - Nos processos individuais, passar `candidate.passportId` para `individualProcesses.create` e registrar cada `{ candidate, individualProcessId }` retornado.
  - No coletivo, conservar o `collectiveProcessId`, passar o passaporte em cada criação individual e registrar os IDs individuais, que hoje são descartados.
  - Só montar a fila depois de todas as mutações necessárias retornarem; candidatos sem passaporte não entram. Não chamar `reset()` nem `router.push()` enquanto existir item pendente na fila.
- [x] 2.3: Tornar a finalização resistente a dupla submissão e erro parcial dentro da tentativa ativa.
  - Manter um estado de finalização separado (`creating`, `resolving_passports`, `complete`) e desabilitar **Cancelar**, **Anterior**, troca de etapa e novo clique em **Finalizar** após o primeiro envio.
  - Registrar em memória os processos já retornados na tentativa e nunca repetir sua criação ao tratar um erro posterior; no coletivo, reutilizar o `collectiveProcessId` já criado. Em erro de criação, preservar o wizard e informar claramente que nenhum anexo foi executado, sem apagar IDs já confirmados.
  - Validação: duplo clique não cria processos duplicados; falha no terceiro de quatro candidatos não reapresenta criação para os dois já concluídos na mesma sessão; erro no anexo não recria processo nem checklist.
- [x] 2.4: Ajustar `components/process-wizard/wizard-layout.tsx` para respeitar o estado de finalização.
  - Desabilitar também o botão **Cancelar** e os indicadores clicáveis enquanto a criação/fila estiver em curso; manter a proteção de saída ativa e usar texto/loading localizado para diferenciar **Criando processos** de **Finalizando passaportes**.
  - Validação: o admin não consegue alterar candidato ou navegar para trás entre a criação do processo e a decisão sobre o passaporte; refresh/fechamento continua recebendo proteção de navegação.

### 3. Restringir e reutilizar a confirmação de documento oficial

- [x] 3.1: Estender `convex/passportDocumentAttachments.listCandidates` com `individualProcessId` opcional.
  - Quando informado, carregar somente esse processo, validar que ele pertence à mesma pessoa do passaporte e consultar seus documentos por `by_individualProcess`; quando omitido, preservar exatamente a busca ampla usada pelas páginas/formulários de passaporte existentes.
  - Retornar somente `isLatest` chamados exatamente **Passaporte** ou **Passaporte válido**, usando a normalização já existente. Validar `args` e `returns` e manter `requireAdmin`.
  - Validação: a confirmação pós-wizard nunca mostra documentos de processos antigos/irmãos; ID de processo de outra pessoa retorna vazio/erro controlado e não vaza metadados.
- [x] 3.2: Adaptar `components/passports/passport-document-attachment-dialog.tsx` para aceitar escopo e contexto opcionais.
  - Adicionar props opcionais para `individualProcessId`, nome do candidato e posição/total da fila; repassar o escopo à query e mostrar o contexto sem alterar os consumidores atuais.
  - Fazer `onComplete` informar resultado tipado (`attached`, `skipped` ou `no_candidate`) para a fila poder avançar e produzir feedback final. Preservar seleção múltipla de documentos, modos `fill`/`replace`/`new_version`, aprovação automática e retry em erro.
  - Validação: zero destino avança automaticamente como `no_candidate`; **Agora não** avança como `skipped`; sucesso só avança após a mutação confirmar `approved`.
- [x] 3.3: Criar `components/process-wizard/passport-attachment-queue.tsx` para orquestrar os pares criados sequencialmente.
  - Receber entradas tipadas `{ individualProcessId, passportId, candidateName }`, abrir uma instância do diálogo compartilhado por vez e mostrar progresso **n de total**.
  - Acumular contagens de anexados, ignorados e sem documento correspondente. Impedir fechamento durante mutação; permitir pular o item atual; chamar `onComplete` uma única vez após consumir toda a fila.
  - Validação: em um coletivo com quatro candidatos, cada passaporte consulta/anexa somente no processo individual correspondente; pular o segundo não pula os demais; uma lista vazia conclui imediatamente.
- [x] 3.4: Integrar a fila ao resultado de `ProcessWizardPage` e concluir a navegação somente no final.
  - Um processo individual navega para seu detalhe; vários processos individuais navegam para a lista; processo coletivo navega para o detalhe coletivo, preservando as URLs localizadas atuais.
  - Exibir resumo localizado quando houver itens: quantidade anexada/aprovada, ignorada e sem documento elegível. O toast principal de processos criados deve ocorrer uma única vez.
  - Validação: optar por **Agora não** nunca bloqueia o sucesso do processo; ausência de documento **Passaporte** não apresenta modal vazio; anexar não provoca segundo upload de storage.

### 4. Internacionalização, acessibilidade e estados de UX

- [x] 4.1: Adicionar ao namespace `ProcessWizard` em `messages/pt.json` as chaves de finalização de passaportes.
  - Incluir: criação em andamento, preparação de documentos, candidato atual, progresso `{current}/{total}`, resumo anexado/ignorado/sem destino, erro parcial, tentar novamente e continuar sem anexar.
- [x] 4.2: Adicionar as mesmas chaves e placeholders em `messages/en.json`.
  - Validação: paridade exata pt/en; nenhum título, toast, status, aria-label ou contagem visível hardcoded.
- [x] 4.3: Garantir responsividade e acessibilidade na fila e no diálogo reutilizado.
  - Em mobile, nome do candidato, progresso, destino e ações devem quebrar sem overflow; em `sm`, `md` e `lg`, manter hierarquia clara entre processo criado, documento e modo de substituição.
  - Preservar foco entre itens, navegação por teclado, `aria-live` para progresso/resultado, `aria-busy` durante mutação e retorno de foco somente após a fila terminar.

### 5. Quality gates

- [x] 5.1: Executar `pnpm exec convex codegen` e `pnpm exec tsc --noEmit`.
  - Confirmar TypeScript strict, `CandidateData.passportId` tipado, sem `any` novo, IDs Convex corretos e validators completos para qualquer assinatura pública alterada.
- [x] 5.2: Executar lint focado nos arquivos desta entrega, `pnpm lint` e `pnpm run build`, registrando separadamente débitos globais preexistentes.
  - Validar que nenhuma mudança manual foi feita em `convex/_generated/`; aceitar apenas atualização produzida por codegen.
  - Resultado: `convex codegen`, TypeScript, lint focado e o build das 89 páginas passaram. O lint global continua falhando nos débitos preexistentes de `no-explicit-any`/imports/hooks; uma repetição posterior do TypeScript ficou bloqueada por uma edição concorrente e não relacionada em `convex/migrations/backfillDocumentReceiptTiming.ts:51`.
- [ ] 5.3: Validar no browser autenticado o fluxo **Individual** em `/pt/process-wizard` e `/en/process-wizard`.
  - Cadastro rápido manual: cria processo sem fila de passaporte.
  - Cadastro rápido por OCR: pessoa/passaporte ficam salvos, o processo recebe o mesmo `passportId`, documentos existem antes da pergunta e o arquivo escolhido fica `approved`.
  - Trocar a pessoa após o cadastro rápido: limpa o passaporte temporário e não vincula/anexa ao candidato substituto.
  - Remover candidato, cancelar wizard e escolher **Agora não**: não anexam documento; o passaporte previamente registrado continua associado à pessoa.
  - Mais de um documento elegível: mostrar somente os documentos do processo recém-criado e anexar apenas ao selecionado.
  - Validação parcial: wizard autenticado e cadastro rápido manual/por passaporte abriram corretamente em pt/en, sem erros de console. A query escopada retornou somente os dois destinos do Processo Individual informado. O seletor nativo de arquivos impediu repetir o upload OCR completo no navegador automatizado.
- [ ] 5.4: Validar no browser o fluxo **Coletivo** com múltiplos candidatos.
  - Misturar candidato selecionado normalmente, pessoa cadastrada manualmente e duas pessoas criadas por passaporte; somente as duas últimas entram na fila.
  - Confirmar ordem, nome e progresso; anexar uma, pular outra e verificar que cada Processo Individual recebeu apenas seu `passportId`/arquivo.
  - Forçar destino já preenchido e confirmar **Substituir** e **Adicionar nova versão**, ambos com resultado aprovado e sem duplicação de versão por duplo clique.
  - Validação parcial: propagação, fila sequencial e navegação coletiva foram cobertas por TypeScript/lint/build; o cenário multi-upload depende do mesmo seletor nativo de arquivos.
- [ ] 5.5: Revisar erros, idempotência, RBAC e interface.
  - Como `client`, confirmar que não é possível criar pelo wizard administrativo, listar destinos escopados nem executar `attach`.
  - Como admin, tentar combinar `passportId`/`personId` incompatíveis e `individualProcessId` de outra pessoa; o backend deve rejeitar sem mutação.
  - Simular erro na criação e no anexo: não duplicar processos/checklists/versões, manter retry/skip funcional e concluir o redirect uma única vez.
  - Conferir viewports mobile/desktop, teclado, foco, proteção de saída e console/network sem erros.
  - Validação parcial: `client` foi recusado por `requireAdmin`; combinação `personId`/`passportId` incompatível retornou `INVALID_PROCESS_PASSPORT`; processo escopado de outra pessoa retornou lista vazia e a mutation retornou `DOCUMENT_ACCESS_DENIED`, sem mutação. O browser não registrou erros; responsividade permanece coberta pelas classes e revisão estática, pois o override de viewport do navegador não foi aplicado à aba ativa.

## Definition of Done

- [x] O passaporte criado por OCR no cadastro rápido permanece registrado mesmo se o wizard for cancelado e acompanha o candidato correto enquanto ele estiver no wizard.
- [x] Cada Processo Individual criado pelo wizard recebe o `passportId` correto antes da geração do checklist, com validação servidor-side de pertencimento.
- [x] A confirmação só começa depois que todos os processos/checklists da submissão foram criados e só lista documentos do Processo Individual correspondente.
- [x] Fluxos individual e coletivo suportam zero, um ou vários candidatos com passaporte, incluindo lista múltipla de documentos dentro de cada processo.
- [x] **Agora não**, cancelamento, troca/remoção de candidato, erros e duplo clique não causam anexo cruzado, processo duplicado ou versão duplicada.
- [x] O arquivo já armazenado no passaporte é reutilizado sem segundo upload e o documento confirmado termina automaticamente como `approved`.
- [x] O wizard só é limpo/redirecionado após consumir a fila, mantendo navegação localizada e resumo profissional da finalização.
- [ ] RBAC, i18n pt/en, TypeScript strict, Zod/validators, responsividade, acessibilidade, lint, build e validação browser passam sem novos erros.

---

# TODO: Contador de espera e data de recebimento por versão de documento

## Contexto

Quando o Processo Individual e seu checklist são gerados, cada `documentsDelivered` pendente deve iniciar uma contagem em dias. Enquanto a versão atual estiver sem conteúdo/anexo, a linha do documento deve exibir uma pílula vermelha com o tempo de espera. Quando o conteúdo for recebido, a versão deve conservar a data em que nasceu, a data efetiva de recebimento e a duração transcorrida. O cliente pode enviar arquivos, mas nunca vê nem controla a data; somente o administrador pode informá-la ou corrigi-la.

## Decisões de implementação

- Persistir por linha/versão `createdAt` e `receivedAt` em `documentsDelivered`. Manter `uploadedAt` por compatibilidade com os fluxos atuais, mas parar de tratá-lo como data de recebimento para placeholders, pois hoje ele também é preenchido na criação de registros sem arquivo.
- Não persistir um terceiro campo `waitingDays`: derivar dias corridos de calendário com `max(0, receivedAtOuLimite - createdAt)`, evitando contador duplicado ou desatualizado.
- Estado atual confirmado: `linkToStatusAndReject` já cria automaticamente a próxima versão `not_started` sem anexo; `uploadWithType` também aceita criação sem `storageId`. Portanto, versões vazias são possíveis e devem ser suportadas, não descartadas.
- Para uma versão histórica recebida, encerrar a espera em `receivedAt`. Para uma versão vazia substituída por outra, encerrar a espera na `createdAt` da versão sucessora e exibir **aguardou N dias sem anexo**. Para a versão latest ainda vazia, usar o dia atual e manter a pílula vermelha viva.
- Ao preencher um placeholder, atualizar a mesma linha: preservar `createdAt` e gravar `receivedAt`. Ao criar uma versão nova já anexada, gravar as duas datas na nova linha. Criar uma versão vazia nunca altera as datas nem a duração já fechada das anteriores.
- O backend define `receivedAt = Date.now()` por padrão. Um valor diferente só é aceito de `admin`, deve representar uma data válida não futura e fica auditado; chamadas de cliente não podem forjar a data mesmo que alterem o payload manualmente.
- Considerar como “recebido” tanto arquivo anexado/reaproveitado quanto documento somente informativo efetivamente preenchido. Placeholder sem conteúdo continua sem `receivedAt`.
- Compatibilidade legada: usar `_creationTime` como origem segura para `createdAt` e, somente em versões com conteúdo real, `uploadedAt` como fallback/backfill de `receivedAt`.
- Preservar e integrar as alterações não commitadas atuais em `convex/documentsDelivered.ts`, `convex/schema.ts`, `convex/lib/documentChecklist.ts`, `convex/passportDocumentAttachments.ts`, `components/individual-processes/document-checklist-card.tsx`, `messages/pt.json`, `messages/en.json` e no restante do wizard/passaporte; não reverter, sobrescrever nem editar manualmente `convex/_generated/`.
- Não criar testes automatizados para este MVP; validar com TypeScript, lint focado, build, migração idempotente e browser autenticado.

## Sequência de tarefas

### 0. Project Structure Analysis

- [x] 0.1: Revalidar o fluxo completo de criação, preenchimento e versionamento antes de editar.
  - Referências: `app/[locale]/(dashboard)/prd.md`, `convex/schema.ts`, `convex/documentsDelivered.ts`, `convex/lib/documentChecklist.ts`, `convex/individualProcesses.ts`, `convex/passportDocumentAttachments.ts`, `components/individual-processes/document-checklist-card.tsx`, `components/individual-processes/client-document-checklist.tsx`, `components/individual-processes/document-history-dialog.tsx` e `components/individual-processes/document-review-dialog.tsx`.
  - Confirmar em especial: checklist por regra começa em **Em Preparação**; uma linha representa uma versão; placeholders têm `uploadedAt` mesmo sem upload; rejeição/exigência pode criar nova versão vazia.
- [x] 0.2: Confirmar os caminhos exatos da entrega e preservar o worktree atual.
  - Criar: `convex/lib/documentReceiptTiming.ts`, `convex/migrations/backfillDocumentReceiptTiming.ts`, `lib/document-wait-time.ts`, `components/individual-processes/document-wait-time-badge.tsx` e `components/individual-processes/document-received-date-field.tsx`.
  - Modificar backend: `convex/schema.ts`, `convex/documentsDelivered.ts`, `convex/lib/documentChecklist.ts`, `convex/individualProcesses.ts` e `convex/passportDocumentAttachments.ts`.
  - Modificar UI: `components/individual-processes/document-checklist-card.tsx`, `components/individual-processes/client-document-checklist.tsx`, `components/individual-processes/document-upload-dialog.tsx`, `components/individual-processes/pending-document-upload-dialog.tsx`, `components/individual-processes/upload-new-version-dialog.tsx`, `components/individual-processes/typed-document-upload-dialog.tsx`, `components/individual-processes/loose-document-upload-dialog.tsx`, `components/individual-processes/document-review-dialog.tsx`, `components/individual-processes/document-history-dialog.tsx` e `components/individual-processes/status-documents-dialog.tsx`.
  - Modificar i18n: `messages/pt.json` e `messages/en.json`. Atualizar `convex/_generated/api.d.ts` somente via `pnpm exec convex codegen`.

### 1. Modelar e retropreencher as duas datas por versão

- [x] 1.1: Em `convex/schema.ts`, adicionar `createdAt` e `receivedAt` opcionais e numéricos a `documentsDelivered` para permitir rollout compatível com registros existentes.
  - Não criar índice: as consultas continuam partindo de `by_individualProcess`, `by_individualProcessStatus` ou do ID exato.
  - Validação: `createdAt` nunca muda depois que a linha nasce; `receivedAt` permanece ausente enquanto não houver arquivo/conteúdo recebido.
- [x] 1.2: Em `convex/lib/documentReceiptTiming.ts`, centralizar a política servidor-side usada por todas as mutations.
  - Resolver `createdAt ?? _creationTime`, detectar conteúdo real, aplicar `Date.now()` por padrão e validar override administrativo de recebimento sem confiar no frontend.
  - Manter `uploadedAt` sincronizado quando necessário para compatibilidade, sem usá-lo como início do contador novo.
- [x] 1.3: Criar `convex/migrations/backfillDocumentReceiptTiming.ts` como `internalMutation` idempotente, com `args` e `returns` explícitos.
  - Preencher `createdAt` a partir de `_creationTime`; preencher `receivedAt` a partir de `uploadedAt` somente quando houver `storageId`, `fileUrl` não vazio ou conteúdo informativo concluído; deixar placeholders vazios sem recebimento.
  - Retornar contagens de atualizados, recebidos inferidos e ignorados. Validar uma amostra antes/depois e nunca confundir o `uploadedAt` artificial dos pendentes com recebimento.

### 2. Aplicar as datas em todos os caminhos que criam ou recebem uma versão

- [x] 2.1: Em `convex/documentsDelivered.ts`, aplicar `createdAt` em toda inserção e `receivedAt` em toda transição com conteúdo.
  - Cobrir `upload`, `restoreVersion`, `uploadLoose`, `uploadWithType`, `uploadForPending`, `reuseCompanyDocument`, `bulkReuseCompanyDocuments`, `addMissingDocument`, `syncMissingDocuments`, `submitInformationFields` e `linkToStatusAndReject`.
  - Em preenchimento de placeholder (`uploadForPending`, reuse e informação), preservar o início original; em `restoreVersion`, reenvio e nova versão anexada, criar um novo par de datas.
  - Validação: salvar apenas observações não encerra a espera; rejeitar/revisar um arquivo já recebido não reescreve `receivedAt`.
- [x] 2.2: Aplicar a mesma política fora do arquivo principal.
  - `convex/lib/documentChecklist.ts`: todos os documentos gerados pela regra nascem com `createdAt` comum ao lote e sem `receivedAt`.
  - `convex/individualProcesses.ts`: ao copiar um processo, as novas linhas recebem datas coerentes com o novo processo sem produzir duração negativa nem reutilizar silenciosamente o início da linha original.
  - `convex/passportDocumentAttachments.ts`: `fill`, `replace` e `new_version` registram recebimento; `fill` preserva criação do placeholder e `new_version` cria seu próprio início.
- [x] 2.3: Aceitar uma data de recebimento opcional nas mutations de upload usadas pelo admin e adicionar `updateReceivedAt` em `convex/documentsDelivered.ts`.
  - `updateReceivedAt` deve validar `args`/`returns`, `requireAdmin`, existência da versão, conteúdo real e data não futura; permitir corrigir inclusive versão histórica sem alterar `createdAt`, arquivo, status, review ou `isLatest`.
  - Registrar valor anterior/novo e versão em `activityLogs`. Cliente sempre recebe a data do servidor e qualquer override forjado deve ser recusado.
- [x] 2.4: Ampliar `getVersionHistory`, `listVersionsByProgress` e validators relacionados para devolver as duas datas e preservar versões históricas vazias necessárias à duração.
  - Não ocultar uma versão vazia já substituída apenas por ser `v0`/sem arquivo; marcá-la como sem anexo e impedir download/review de arquivo inexistente.
  - Validação: a sucessora correta, dentro do mesmo grupo de documento/requisito, fornece o limite estável da versão vazia anterior.

### 3. Exibir o contador e permitir edição somente administrativa

- [x] 3.1: Criar `lib/document-wait-time.ts` e `components/individual-processes/document-wait-time-badge.tsx` com cálculo tipado e apresentação reutilizável.
  - Latest sem recebimento: pílula destrutiva/vermelha **Aguardando há N dias**. Recebida: pílula neutra/positiva **Recebido em N dias**. Histórica vazia: **Aguardou N dias sem anexo**.
  - Usar dias de calendário, pluralização i18n e `max(0, ...)`; não usar intervalos/timers por linha. A reatividade da página e a data atual recalculam o valor sem gravar no banco.
- [x] 3.2: Mostrar a pílula imediatamente à frente dos metadados/status de cada documento atual.
  - Integrar em `components/individual-processes/document-checklist-card.tsx`, inclusive grupos de exigência, e em `components/individual-processes/client-document-checklist.tsx`.
  - Validação: pendente há 12 dias mostra pílula vermelha com 12 dias em admin e cliente; documento recebido deixa de crescer e mostra a duração fechada.
- [x] 3.3: Criar `components/individual-processes/document-received-date-field.tsx` com `DatePicker` e validação Zod da data de calendário, reutilizando-o nos dialogs de upload listados em 0.2.
  - Para admin, iniciar visualmente no dia atual e enviar override somente quando aplicável. Para cliente, não renderizar label, input, hint nem espaço reservado; `PendingDocumentUploadDialog` deve receber a capacidade administrativa explicitamente, sem inferi-la de estado visual.
  - Validação: client envia normalmente e o servidor grava hoje; admin pode escolher uma data válida anterior sem alterar a data de criação.
- [x] 3.4: Em `components/individual-processes/document-review-dialog.tsx` e `components/individual-processes/document-history-dialog.tsx`, exibir por versão data de criação, data de recebimento/ausência e duração.
  - Somente admin vê lápis/DatePicker e chama `updateReceivedAt`; cliente recebe apresentação somente leitura. Versões históricas vazias mostram o limite pela sucessora e não oferecem abrir/baixar arquivo inexistente.
  - Propagar a role/capacidade pelos chamadores `document-checklist-card.tsx`, `status-documents-dialog.tsx` e `app/[locale]/(dashboard)/individual-processes/[id]/individual-process-detail-client.tsx` sem confiar apenas em ocultação frontend.

### 4. Internacionalização, acessibilidade e quality gates

- [x] 4.1: Adicionar chaves equivalentes em `messages/pt.json` e `messages/en.json` para criação, recebimento, aguardando/recebido em dias, versão encerrada sem anexo, edição administrativa, data inválida/futura, sucesso e erro.
  - Validar plural de zero/um/muitos dias, textos do DatePicker, tooltip e aria-label; nenhum texto visível novo fica hardcoded.
- [x] 4.2: Conferir layout e acessibilidade em `sm`, `md` e `lg`.
  - Pílula não pode ocultar nome/status/ações; datas quebram sem overflow. Campo administrativo tem label, descrição e erro associados; histórico sem arquivo não apresenta ação enganosa.
- [x] 4.3: Executar `pnpm exec convex codegen`, `pnpm exec tsc --noEmit`, lint focado nos arquivos desta seção, `pnpm lint` e `pnpm run build`, separando débitos preexistentes.
  - Confirmar TypeScript strict, nenhum `any` novo, validadores `args`/`returns`, IDs Convex corretos, nenhuma query nova com `.filter()` do Convex e nenhuma edição manual em `convex/_generated/`.
- [x] 4.4: Validar no browser autenticado em `/pt/individual-processes/[id]` e `/en/individual-processes/[id]`.
  - Checklist recém-gerado começa em 0 dias; alterar a origem para 12 dias exibe 12; anexar como client usa hoje e não mostra data; anexar/editar como admin respeita a data escolhida e congela a duração.
  - Cobrir upload pendente, nova versão, rejeição/exigência que cria versão vazia, versão vazia substituída por outra, documento informativo, reaproveitamento e anexo de passaporte.
  - Confirmar que a versão anterior conserva sua duração, a nova reinicia em zero, somente uma versão fica latest e a edição administrativa produz auditoria sem mudar arquivo/status.

## Definition of Done

- [x] Cada versão possui início próprio e, quando recebida/preenchida, data de recebimento própria.
- [x] Todo documento latest pendente mostra contador vermelho em dias; ao receber, a duração fica congelada.
- [x] Versão nova vazia reinicia a contagem sem apagar o tempo da anterior, inclusive quando a anterior também terminou sem anexo.
- [x] Cliente envia sem ver/controlar data; somente admin pode informar ou corrigir o recebimento e o backend reforça o RBAC.
- [x] Histórico exibe criação, recebimento/ausência e duração de cada versão, sem download falso para versão vazia.
- [x] Migração legada é idempotente e não converte placeholders em recebidos por causa do `uploadedAt` atual.
- [x] i18n pt/en, TypeScript strict, Zod/validators Convex, responsividade, acessibilidade, lint, build e validação browser passam sem novos erros.
