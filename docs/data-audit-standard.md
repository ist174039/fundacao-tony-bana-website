# Fundação Tony Bana — Standard de Auditoria de Dados e Operações

## Regra fundamental
Todas as criações, alterações e eliminações de registos executadas pela aplicação devem deixar eventos de auditoria no servidor: identidade, data, registo, operação, campos e resultado. Em operações Firestore, o evento é guardado na mesma transação ou batch do dado alterado.

A coleção canónica é `area_audit_events`. O painel administrativo **Auditoria** apresenta tabela central com pesquisa, filtros, ordenação, paginação e painel lateral, nunca devolvendo os valores pessoais dos instantâneos.

## Estrutura e privacidade
- `version`, `module`, `action`, `recordPath`, `actorUid`, `at`, `source` e `changedFields` (nomes de campos, sem valores).
- `beforeEncrypted` e `afterEncrypted`: instantâneos protegidos por AES-256-GCM e AAD do evento, **apenas** quando existem chaves de cifragem. Sem chaves, o evento contém metadados sem dados em claro e indica que o instantâneo não está disponível.
- Não guardar segredos, tokens ou dados pessoais em claro na auditoria.

## Cobertura implementada no PR #149
| Área | Criação | Atualização / conclusão | Eliminação |
| --- | --- | --- | --- |
| Escolas, contactos e alunos | Eventos transacionais | Eventos transacionais | Sem DELETE exposto |
| Receções e entregas de materiais | Eventos transacionais | Confirmação, lotes e movimentos de stock transacionais | Sem DELETE exposto |
| Bibliotecas, equipas, pastas, documentos e versões | Eventos transacionais | Versões, membros e ACL com eventos | Sem DELETE exposto |
| Sócios e pedidos de adesão | Eventos transacionais | Aprovação, rejeição, atualização, associação | Sem DELETE exposto |
| Quotas e recebimentos | Eventos transacionais | Movimentos financeiros | Sem DELETE exposto |
| Perfis e permissões | Eventos transacionais | Histórico de revisões | Sem DELETE exposto |
| Configuração | Ativar ou desativar com evento | Revisão concorrente e histórico | Não elimina dados |
| Conteúdo institucional (notícias, membros, parceiros, carrossel) | API admin e auditoria | API admin e auditoria | API admin e auditoria |
| Imagens públicas | Evento de intenção e conclusão | Upload em Storage | Eliminação com eventos |
| Firebase Authentication | Evento de intenção e conclusão | Alteração, revogação de acessos | Desativação auditada |

## Particularidade Auth/Storage
Firebase Authentication e Cloud Storage não participam na mesma transação que Firestore. É registada uma **intenção durável antes da operação externa** e um segundo evento após a conclusão. Intenções sem conclusão precisam de reconciliação e não podem ser confundidas com operações concluídas.

## Bloqueios de validação e segurança
1. As regras reais de **Firestore e Storage em produção** não estão versionadas neste repositório. Antes de validar, obter cópia exata autorizada e testar que os clientes Firebase não conseguem modificar, ler ou eliminar `area_audit_events` nem aceder a dados privados. O Emulator usa regras deny-all, o que não comprova a configuração real.
2. Operações anteriores a este sistema não produzem eventos retroativos; não inventar histórico.
3. Escritas efetuadas diretamente pela consola Firebase, contas de serviço externas ou scripts fora da aplicação exigem Cloud Audit Logs, restrições IAM, backups e controlo de retenção à parte. O sistema de aplicação, isoladamente, não prova auditoria global de todas as fontes.
4. Eventos append-only ao nível da aplicação não são imutabilidade física contra administradores de infraestrutura. Para integridade forte é necessária exportação WORM/imutável, retenção, revisão e alertas.
5. O registo e eliminação de dados pessoais exige uma política RGPD de conservação e exceções legais; auditoria não pode reter identificadores sensíveis indefinidamente sem justificação.
6. A consulta não expõe os instantâneos cifrados. Recuperação autorizada futura exige permissão específica e deve ser auditada.

## Aceitação / GO-NO-GO
Requer CI e Firestore Emulator verdes, testes E2E contra regras reais em TEST, reconciliação de Auth/Storage, revisão independente, definição de retenção e decisão formal dos gates. **Não considerar a auditoria integral aceite nem lançar apenas porque o código foi integrado.**
