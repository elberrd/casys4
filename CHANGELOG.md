# Changelog

## [2026-01-02] - Correção fillableFields RNM e Em Trâmite

### Corrigido
- **fillableFields do status "RNM"**: Removido `protocolNumber` e `appointmentDateTime` dos campos editáveis
  - Antes: `["appointmentDateTime", "protocolNumber", "rnmNumber", "rnmDeadline"]`
  - Depois: `["rnmNumber", "rnmDeadline"]`

- **fillableFields do status "Em Trâmite"**: Mantido apenas `protocolNumber`
  - Configuração: `["protocolNumber"]`

### Impacto
- Quando o usuário edita o histórico de andamento **RNM**, agora só pode alterar:
  - Número RNM (`rnmNumber`)
  - Prazo de Validade do RNM (`rnmDeadline`)

- Quando o usuário edita o histórico de andamento **Em Trâmite**, só pode alterar:
  - Número do Protocolo (`protocolNumber`)

### Justificativa
O campo `protocolNumber` estava sendo alterado incorretamente quando o usuário editava o histórico de andamento RNM. Agora, o `protocolNumber` só pode ser alterado através do histórico de andamento "Em Trâmite", conforme o fluxo correto do processo.

### Método de Aplicação
Correção aplicada via script de migração executado diretamente no banco de dados Convex:
```bash
npx convex dev --run checkCaseStatusFillableFields:default --once
```

### IDs dos Registros Atualizados
- Status "Em Trâmite": `pd70d7s19av2pmt1rdpy9p6g2h7t8jae`
- Status "RNM": `pd784kv711xe58pnmfqsdzh85h7t90af`
