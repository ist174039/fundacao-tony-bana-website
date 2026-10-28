# Firebase Storage Rules — regras propostas para o bucket existente

## Análise das regras partilhadas
O conjunto ativo fornecido pelo administrador contém `match /{allPaths=**}` com `allow read: if true` e `allow write: if request.auth != null`. Esta configuração autoriza leitura anónima de qualquer objeto e criação/alteração/eliminação por qualquer utilizador autenticado. **Não usar para documentos ou dados pessoais.**

Em Cloud Storage Rules v2, se duas regras se aplicarem ao mesmo objeto, o acesso é concedido quando **qualquer** `allow` for verdadeiro. Acrescentar um bloqueio em `private/documents/` sem remover o wildcard permissivo NÃO protege os documentos.

## Candidato de substituição — ainda não publicado

Ver `tests/firebase/candidate-shared-storage.rules`: somente `get` público nas pastas `membros/`, `noticias/`, `parceiros/` e `carrossel/`; `list` e escritas diretas bloqueadas; todas as operações em `private/documents/` e restantes caminhos negadas. O código administrativo de imagens usa Firebase Admin SDK, que contorna Storage Rules, mas requer autorização e auditoria no servidor. A biblioteca documental também acede apenas via servidor.

**IMPORTANTE:** a política candidata só é segura funcionalmente após inventariar todos os objetos do bucket. Se há imagens públicas fora das quatro pastas, a substituição bloqueará a leitura dessas imagens. Não adicionar automaticamente exceções para diretórios não auditados.

## Validação obrigatória antes de Publish
1. Fazer cópia integral das regras ativas e do inventário de caminhos e metadados, com data, utilizador e versão. Inspecionar se há dados sensíveis já carregados; a troca de regras não desfaz exposição anterior.
2. Confirmar que os URLs do website apontam exclusivamente para as quatro pastas públicas. URLs com tokens do Firebase podem permitir acesso mesmo com regras deny-all: inventariar e revogar tokens existentes de objetos que devam ser privados.
3. Verificar Google Cloud IAM/ACL e políticas de acesso público do bucket: estas regras controlam pedidos Firebase SDK, não substituem IAM nem revogam URLs com tokens.
4. Testar no Firebase Emulator `npx firebase-tools emulators:exec --only storage --config tests/firebase/candidate-storage-emulator.json` com `tests/firebase-candidate-storage-emulator.test.mjs` e confirmar os testes da aplicação.
5. Validar com conta anónima e conta autenticada: as quatro pastas públicas permitem apenas download por objeto; nenhuma conta cliente pode carregar, modificar, eliminar, listar ou abrir `private/documents/`.
6. Só depois de testes reais do bucket, rever a política com o responsável, publicar as regras completas em Storage → Rules e verificar novamente. Guardar rollback seguro das regras anteriores, mas **nunca repor regras abertas em caso de falha**; preferir corrigir caminhos afetados.
7. No servidor, `FTB_DOCUMENTS_BUCKET` pode apontar ao bucket existente após verificação. `FTB_STORAGE_RULES_VERIFIED` e `FTB_SHARED_DOCUMENTS_STORAGE_VERIFIED` só devem ficar true depois das evidências reais; não bastam os testes do Emulator.

## Limitações
O candidato protege o acesso por regras Firebase Storage a novos objetos privados no caminho esperado. Não prova que objetos privados antigos estejam inacessíveis via download tokens, IAM público ou cache; essas superfícies exigem revisão específica.

**PR em revisão, sem alteração das regras de produção e sem ativação de módulos.**
