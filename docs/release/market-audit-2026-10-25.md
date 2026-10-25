# Fundação Tony Bana — Auditoria técnica e de governação para mercado

**Snapshot:** 25 de outubro de 2026. **Health: RED / NO-GO**. Este relatório não certifica segurança, legalidade ou prontidão para lidar com dados reais de crianças.

## Ordem das fontes e limites

1. [Project Definition & Delivery 00–14](https://app.notion.com/p/3ffbe9392b6081b7bbf8dfecdd1362e8) — governação.
2. As 13 bases operacionais locais do Notion — estados, relações, requisitos e decisões.
3. GitHub `main` `685956efb872fbcde6c6da59035715c957a19640` — implementação observada no repositório.
4. Documentação complementar — apoio, não substitui uma evidência real.

Contagens por vistas das bases no momento da consulta; bases vivas podem mudar. A presença de uma relação no Notion **não é** aprovação, implementação, execução ou evidência aceite.

## Baseline quantitativa — após reconciliação de IDs

| Dimensão | Observado | Interpretação |
| --- | ---: | --- |
| PDD 00–14 | 15/15 páginas | Estrutura presente; completude material não verificada |
| Requirements | 46 | 15 Em implementação; 31 Por validar; 0 Aprovado/Verificado |
| IDs dos requisitos | 46/46 | 9 códigos históricos normalizados neste ciclo; IDs não provam implementação |
| Fonte preenchida | 22/46 | 24 sem Fonte; 5 URLs de commits inexistentes substituídas por PR #1 verificado; o PR é **referência técnica de implementação**, não prova da origem do requisito |
| Architecture Components | 23 | 6 Atual observado; 13 Proposto; 4 A validar |
| Sequence Diagrams | 17 | 17 Conceptual, sem verificação de fluxo |
| Standards & Controls | 38 | 0 Conforme com evidência |
| Tasks & Deliverables | 63 | 24 Em curso, 29 Backlog, 6 Bloqueado; **0 Concluído** (consultas podem mudar) |
| Test Cases | 61 | 23 Pronto; restantes Por desenhar |
| Executions & Evidence | 20 | 9 Passou, 0 revisão Aceite; planos e observações não são testes |
| Decisions & Risks | 37 | 29 Aberto; 8 Em análise; 0 Mitigado/Fechado |
| APIs & Integrations | 25 | 25 operações Observado em main |
| Matriz de rastreabilidade geral | 16 | 4 Parcial; 12 Não avaliado |
| Atores / perfis / permissões | 18 / 17 / 43 | 17 perfis Proposto, sem autorização por escola validada |

Cobertura **por relações documentais** de 46 requisitos: 46 relacionados a um Architecture Component, 46 a uma Task, 39 a pelo menos um Test Case, 29 a pelo menos um registo de Evidence e 11 a pelo menos uma operação da base APIs. A relação não prova que o requisito está implementado, testado ou aceite.

## Completion Metrics — critérios e denominadores

| Métrica | Valor auditável | Regra de interpretação |
| --- | --- | --- |
| Functional Completeness | **0/46 = 0% verificado** | Requisitos com estado Verificado; 15 em implementação não são conclusões |
| Documentation Completeness | **15/15 = 100% estrutural; material N/A** | Faltam revisões/decisões e proveniência |
| Architecture Completeness | **6/23 = 26,1% observado** | Não equivale a arquitetura aprovada nem integração validada |
| Requirements Coverage | **46/46 com ID, 39/46 com teste ligado** | Identificadores 100%, test design coverage 84,8%; origem documentada apenas em 22/46 |
| Test Coverage | **23/61 = 37,7% casos Pronto** | Percentagem de preparação; não execução/testes passados |
| Evidence Coverage | **0/20 = 0% aceite** | 9 registos Passou sem revisão aceite |
| Risk Coverage | **0/37 = 0% encerrados** | Não há prova de mitigação ou aceitação |
| Traceability Coverage | **0% ponta a ponta aceite** | Falta evidência revista, entregável concluído e aprovação |
| Delivery Readiness | **0/14 = 0% dos gates aprovados** | Resultado do manifesto GO/NO-GO |

**Progress para lançamento = 0/100%**, medido pelos 14 gates obrigatórios aceites, não pela quantidade de código produzida. Ciclos 0–10%, 10–20% etc. são lotes de trabalho, não certificados de produto concluído.

## Código, CI e produção

- Branch `main`: `685956efb872fbcde6c6da59035715c957a19640` (PR #7 integrado); branch protection **false** na leitura GitHub.
- Último deployment de produção listado: Vercel `READY`, `97864406322e6e9e8ab4dcefc0283195b47797f1`, anterior à `main`; **não promover automaticamente**.
- `GET /api/area/session` sem sessão: 401. `GET /api/area/schools` e `/api/area/material-receptions`: 503 em produção, coerente com flags seguras desativadas; isso não comprova isolamento entre escolas.
- O repositório contém Firebase Auth/Admin, Firestore, funcionalidades de escola e receção de materiais com cifragem e flags, mas os controlos e as Rules **reais** do Firebase de produção não foram verificados.
- Existe pipeline de testes Node, build Next.js e Firestore Emulator. Suite de teste não equivale a E2E autenticado nem aceitação do ambiente publicado.

## Principais riscos / NO-GO

1. Estatutos e enquadramento jurídico de sócios/quotas; papéis da Fundação e das escolas por finalidade, jurisdição e bases legais por validar.
2. Tratamento de menores: minimização, retenção, autorizações de imagem, triagem AIPD e competências dos encarregados por aprovar.
3. Firestore e Storage Security Rules de produção sem exportação/revisão, chaves e migração de PII legada sem aceitação.
4. Autorização ainda insuficiente para perfis específicos por escola/projeto; teste cross-school bloqueado enquanto pré-condições de TEST não estiverem disponíveis.
5. Fluxos financeiros e de distribuição incompletos (reversões, fundos restritos, stock/entregas), backups e resposta a incidentes não demonstrados.
6. Branch `main` desprotegida, SHA de produção desfasado, 0 evidências aceites e 0 autorização de GO.

## Alteração deste ciclo — sem merge ou deploy

A branch `audit/readiness-explicit-sha-20261025` endurece `scripts/market-readiness.mjs`: **`--enforce` deve receber `--sha` e `--production-sha` explícitos, completos e com 40 caracteres**. O relatório `--report-only` mantém uso diagnóstico com fallback histórico. Testes de regressão em `tests/market-readiness.test.mjs`. A mudança não cria prova de release: PR, CI, revisão e merge ainda sujeitos à política de governação.

## Critérios do próximo ciclo 10–20%

- Resolver scope e estatutos; formalizar a fronteira entre website institucional e gestão de menores.
- Registar owners humanos para privacidade, aprovação financeira, QA/release e configuração Firebase.
- Confirmar revisão do PR de hardening, CI e documentação de rastreabilidade; não marcar tarefas Concluído sem evidência.
- Definir identidade, fluxos financeiros, school-scoped authorization, regras de dados e plano de teste com dados sintéticos.
- Solicitar aprovação formal de produto/jurídico para o âmbito alargado antes de habilitar features.

**Decisão de release: NO-GO.** Nenhum teste de menores com dados reais; nenhum deploy/migração/promoção automática.
