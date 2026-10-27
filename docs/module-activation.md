# Fundação Tony Bana — Ativação e desativação administrativa de módulos

## Objetivo

Configuração → Módulos: tabela central com pesquisa, filtros, ordenação e paginação; detalhe e ativação num painel lateral. A ação exige uma sessão Firebase com papel de administração confirmado no servidor.

## Modelo de segurança: dupla autorização

1. **Capacidade do deployment**: flag de ambiente do módulo expressamente ativada e pré-requisitos técnicos (Firebase Admin, cifragem, índice de alunos, bucket privado de documentos) configurados. A verificação do bucket, respetivas regras privadas e segurança com dados reais exige aprovação humana anterior à flag técnica.
2. **Estado operacional**: documento Firestore `area_module_settings/{moduleId}` com `enabled: true`, criado apenas por administrador no endpoint autenticado. Sem documento ou em caso de falha no Firestore, o módulo está desativado.

O servidor consulta o estado operacional em **cada chamada API**; não se trata de esconder botões no frontend. Os registos de configuração nunca contêm segredos e cada mudança deixa auditoria em `area_module_settings_audit`. `revision` impede que dois administradores substituam silenciosamente alterações concorrentes.

Dependências: **Alunos → Escolas** e **Entregas → Doações materiais**. Se um módulo pai for desativado, o filho deixa de funcionar imediatamente, mesmo que o seu estado desejado continue ativo. Módulos nucleares como Autenticação, Sócios e Quotas não são desligáveis neste painel para evitar bloquear o acesso e a governança financeira.

## Configuração técnica

- Escolas: `FTB_SCHOOLS_ENABLED=true` e Firebase Admin + chaves de cifragem.
- Alunos: `FTB_STUDENTS_ENABLED=true`, índice secreto e Escolas ativo.
- Doações materiais: `FTB_MATERIAL_DONATIONS_ENABLED=true`, cifragem e Firebase.
- Entregas de doações: `FTB_MATERIAL_DELIVERIES_ENABLED=true`, Doações materiais ativo.
- Documentos: `FTB_DOCUMENTS_ENABLED=true` e `FTB_DOCUMENTS_BUCKET` privado, cifragem e Firebase; para colaboradores, permissões granulares previamente configuradas.

**Nunca ativar estas flags em produção apenas porque existe um botão.** Necessárias validação das Firestore Rules e Storage Rules reais, testes E2E, privacidade dos alunos, limites de acesso e gate operacional aprovado. A interface identifica condições técnicas por satisfazer e bloqueia o toggle de ativação.

## Comportamento e auditoria

O endpoint `GET /api/area/config/modules` devolve o estado desejado, estado efetivo e motivos de bloqueio (sem valores secretos); `PUT` recebe exclusivamente `{moduleId,enabled,expectedRevision}`. Não existe endpoint público de alteração. Desativar um módulo bloqueia novos pedidos API; operações já iniciadas não são canceladas retroativamente, pelo que desativações durante a confirmação de entregas devem ser coordenadas.

A atualização do estado operacional não executa deployments, não altera os requisitos do Notion nem aprova gates de lançamento. O módulo só será mostrado aos administradores quando estiver efetivamente ativo. O painel Configuração fica sempre acessível ao administrador para recuperar a operação.
