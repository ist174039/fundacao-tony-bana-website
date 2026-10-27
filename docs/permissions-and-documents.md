# Fundação Tony Bana — IAM, perfis e gestão documental (proposta implementável, 27/10/2026)

Estado: **código preparado localmente; NÃO integrado na main nem lançado**.
Fonte: Notion PDD / FTB-IAM-001, FTB-DOC-001/002/003/006/007 e código principal do repositório.

## Padrão obrigatório da interface

Em todos os módulos operacionais: **tabela central responsiva** com pesquisa, filtros, ordenação e paginação. Detalhes, criação, edição e configurações num **Sheet lateral direito**, preservando a página de listagem e estados dos filtros.

A gestão de utilizadores conserva a tabela principal e apresenta **Perfis e permissões** no mesmo painel lateral dos detalhes. A alteração pontual é feita pelo perfil operacional e por exceções `Herdar / Permitir / Negar`. Administradores globais são exclusivamente geridos pelo Firebase com claims verificados, não pelo campo de perfil.

## Modelo de acesso

- `area_user_access/{firebaseUid}`: `profiles`, `schoolCodes`, `overrides`, `revision`, `updatedBy`, `updatedAt`.
- `area_permission_audit/{eventId}`: autor e destinatário (UIDs), revisão anterior/seguinte, data. Sem tokens ou payloads privados.
- Perfis predefinidos: `school_coordinator`, `education_worker`, `logistics`, `treasurer`, `document_reviewer`, `auditor`, `associate`.
- Permissões: módulo (`schools`, `students`, `donations`, `stock`, `finance`, `documents`, `visits`, `reports`) × ação (`read`, `create`, `update`, `approve`, `delete`, `share`). `users` só via administrador verificado, sem concessão delegável.
- **Deny-by-default** e âmbito escolar obrigatório para qualquer recurso associado a uma escola. As permissões definidas não se tornam efetivas até cada API integrar explicitamente a verificação do token, permissão e âmbito do recurso. Firebase Firestore e Storage Rules e testes de autorização negativa constituem critérios de aceitação.
- Alterações atómicas, revisionadas (409 no caso de atualização concorrente), auditadas, sem permitir criar conta para menores nem promover utilizadores a administrador.
- Flag `FTB_GRANULAR_ACCESS_ENABLED=false` por defeito; ativar somente em TEST após comprovar regras e políticas em vigor.

## Biblioteca documental estilo Teams/SharePoint

Entidades sugeridas:

1. `document_libraries/{libraryId}`: biblioteca, finalidade, proprietário institucional, classificação, grupos elegíveis.
2. `document_folders/{folderId}`: biblioteca, pasta pai, título e ACL herdada ou restrita.
3. `documents/{documentId}`: pasta, nome, tipo, classificação (`internal` / `confidential` / `minor`), estado atual, revisão atual, metadata e event log.
4. `documents/{documentId}/versions/{version}`: nome de objeto único no Storage privado, SHA-256, tamanho, autor, timestamp e estado; **versões append-only**.
5. `document_acl/{documentId}` ou ACL incorporada versionada: UID, equipas, âmbito escolar, ação permitida, justificativa, expiração quando aplicável.
6. `document_audit`: download, revisão, concessão/revogação, tentativa negada (sem conteúdos nem links confidenciais).

Fluxo seguro: upload temporário não público → validar MIME por *magic bytes*, limite de dimensão e malware → calcular checksum → guardar blob com chave única em bucket **privado** → criar metadata/versão transacionalmente → rever/aprovar → partilhar com UID/equipa interna autorizada → URL assinada de vida curta apenas após autorização em cada pedido. Nunca expor download tokens do Firebase em coleções acessíveis aos clientes. Não substituir silenciosamente versões aprovadas; criar versão nova; manter histórico de revogações.

**Partilha externa fica desativada** até serem definidas regras de identidade externa, expiração, finalidade, RGPD e autorização de um responsável. Os dados de menores exigem acesso nominal explícito; pertença genérica a equipa não basta.

O protótipo `document-library.mjs` já valida descritores, ACLs e versões e conta com testes de negação por omissão, isolamento por escola, imutabilidade SHA-256, MIME/tamanho e revisão. **Não inclui upload, ficheiros reais, regras Storage, downloads, painel documental final, grupos reais nem workflows jurídicos**. Estes itens continuam pendentes.

## Sincronização Notion / GitHub Projects

`sync-github-project.mjs` faz reconciliação idempotente das **46 Issues [REQ]** e **69 Issues [TEST]** já criadas, sem ler nem alterar o Notion. A rotina, quando executada com credenciais, associa os itens ao GitHub Project #2 por GraphQL. Tem modo dry-run, valida duplicados, lê todas as páginas e recusa importação com inventário incompleto.

Falta configurar um token do GitHub com acesso ao Projects (`FTB_GH_PROJECTS_TOKEN`) em *Actions secrets*, executar a rotina e verificar visualmente as vistas. **Não existe sincronização bidirecional Notion ↔ Projects**: o Notion mantém-se como origem documental histórica e é necessário definir uma estratégia de conflitos antes de automatizar escrita nos dois sentidos.

## Condicionantes atuais

- Repositório GitHub: `ist174039/fundacao-tony-bana-website`.
- Ruleset `chatgpt` (id 25839227) é aplicado a `~ALL` e `~DEFAULT_BRANCH`, com revisão, Checks e bloqueio de alterações de refs; **GitHub recusou criar branches com HTTP 422**. Não foi editado nem contornado.
- Resolver no GitHub para permitir criar **branches de trabalho** sem revisão prévia, mantendo regras rigorosas na `main` (PR, 1 aprovação humana, checks e threads resolvidas).
- `main` e produção não foram alteradas. Produção e regras de segurança pendentes de verificação, 0/14 gates independentes formalmente aprovados.

## Plano de integração

1. Corrigir o ruleset para que apenas a branch `main` exija PR/revisão e checks de merge, sem permitir pushes diretos à `main`.
2. Criar PR 1 — sincronização GitHub Project #2; configurar o token secret com menor privilégio possível, dry-run, aplicar e verificar contagens.
3. Criar PR 2 — interface de escolas e doações materiais: tabela central, filtros, ordenação e paginação + painel lateral. Validar responsive e E2E; flags continuam OFF.
4. Criar PR 3 — cadastro de alunos, cifragem, HMAC, admin-only e testes Emulator; sem menores reais. Integrar no menu e validar antes de ativar.
5. Criar PR 4 — gestão de perfis por utilizador e políticas de escopo. Aplicar guardas a cada API antes de autorizar operadores não administradores.
6. Criar PR 5 — gestão documental privada + Storage + versões + partilha explícita + auditoria; testes de Storage Emulator e autorização negativa.

**Regra de release:** nenhuma flag de estudantes/documentos é ativada enquanto autorização, proteção de dados, backups, Firebase Rules e aceitação independente estiverem pendentes.
