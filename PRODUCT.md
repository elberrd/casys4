# CASYS4

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Equipe administrativa de um escritório de advocacia migratória, responsável por processos, documentos, tarefas, prazos e comunicação operacional.
- Representantes de empresas clientes, com acesso restrito aos dados da própria empresa e aos fluxos disponibilizados no portal.

## Product Purpose

O CASYS4 centraliza a gestão de processos de imigração, vistos, passaportes e RNM. O produto organiza processos coletivos e jornadas individuais, seus documentos, notas, tarefas, prazos e histórico, reduzindo perdas de contexto e prazos esquecidos.

## Positioning

O mecanismo central do produto é tratar processos coletivos como contêineres de jornadas individuais completas, permitindo acompanhamento agregado e detalhado no mesmo sistema.

## Operating Context

- O trabalho acontece principalmente em um dashboard autenticado, em português, com inglês como idioma secundário.
- A equipe acompanha mudanças de status, documentos, notas com alarmes, tarefas e datas de vencimento ao longo do dia.
- Notificações devem preservar o contexto da entidade de origem para que o usuário possa agir sem precisar procurá-la novamente.

## Capabilities and Constraints

- Frontend em Next.js, React, Tailwind e next-intl; backend reativo em Convex.
- Perfis `admin` e `client`; clientes só podem acessar dados das empresas às quais estão atualmente vinculados.
- Funções públicas do backend exigem autenticação, validação de argumentos e retornos e consultas indexadas.
- Alertas agendados devem aparecer no dia relevante, admitir adiamento individual e permitir dispensar os alertas do restante do dia.
- Toda interface visível deve existir em português e inglês e ser responsiva e acessível.

## Brand Commitments

- Nome do produto: CASYS4 (a interface atual também usa a marca curta CASys).
- A nova interface deve ampliar, e não substituir, o sistema visual estabelecido no dashboard.

## Evidence on Hand

- PRD do produto: `app/[locale]/(dashboard)/prd.md`.
- Estado do portal do cliente: `ai_docs/portal.md`.
- Implementação e tokens visuais existentes em `app/globals.css`, `components/ui/` e `components/app-sidebar.tsx`.
- Não há depoimentos, benchmarks externos ou claims comerciais aprovados; trabalhos futuros não devem inventá-los.

## Product Principles

1. Manter o contexto operacional a um clique de distância.
2. Tornar prazos e pendências difíceis de esquecer sem interromper o trabalho desnecessariamente.
3. Preservar isolamento entre empresas clientes em todas as leituras e ações.
4. Registrar mudanças importantes e manter histórico confiável.
5. Favorecer fluxos claros, acessíveis e consistentes nos dois idiomas do produto.

## Accessibility & Inclusion

Componentes interativos devem funcionar com teclado, expor nomes acessíveis, manter contraste legível e se adaptar a telas móveis e desktop.
