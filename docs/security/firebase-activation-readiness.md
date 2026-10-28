# Fundação Tony Bana — Validação das regras Firebase antes de ativar módulos

## Estado confirmado
As quatro variáveis de cifragem estão presentes na Vercel production (somente a existência foi verificada; não houve leitura das chaves). O redeploy foi concluído, mas as flags técnicas dos módulos permanecem OFF e falta o bucket privado de documentos.

**As regras reais Firestore e Storage não foram consultadas.** O plugin Firebase está instalado, mas não há uma operação disponível nesta sessão para obter as regras publicadas. Não se pode interpretar testes do Emulator como prova da configuração de produção.

## O Firebase Storage já existente pode ser usado

Não é obrigatório contratar nem criar outro serviço de Storage. A plataforma já utiliza `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` para imagens públicas e o módulo de documentos já guarda objetos na pasta `private/documents/`. São possíveis duas arquiteturas:

- **Preferencial:** um bucket privado dedicado, diferente do bucket público.
- **Reutilização controlada:** definir `FTB_DOCUMENTS_BUCKET` com o nome do bucket existente e só depois de uma auditoria específica definir `FTB_SHARED_DOCUMENTS_STORAGE_VERIFIED=true`. Esta atestação exige regras Storage publicadas que neguem leitura/escrita direta ao caminho `private/documents/{allPaths=**}`, nenhum `allow` mais amplo que permita contornar a negação, ausência de GCS public IAM/ACL para os objetos privados, e testes de download sem autenticação, com autenticação de outro utilizador e com tokens antigos. Não criar `getDownloadURL` nem download tokens para ficheiros privados; servir exclusivamente via API autenticada.

O bucket existente ser utilizado para imagens públicas **não constitui prova** de isolamento da pasta documental. Não ativar nem simular aprovação destas condições sem consultar as regras REAIS e o IAM atual.

## Duas condições adicionais de negação por omissão
- `FTB_FIRESTORE_RULES_VERIFIED=true`: atestação manual, apenas após exportação, revisão e testes das Firestore Rules reais do ambiente correspondente.
- `FTB_STORAGE_RULES_VERIFIED=true`: atestação manual, específica da gestão documental, após revisão das regras reais de Storage do bucket privado.
- `FTB_DOCUMENTS_BUCKET`: preferir bucket GCS dedicado; pode apontar ao bucket atual apenas com `FTB_SHARED_DOCUMENTS_STORAGE_VERIFIED=true` após testes de isolamento reais da pasta `private/documents/` e verificação IAM/Rules.
- As atestações não constituem prova por si só. Nunca configurá-las apenas para fazer desaparecer um bloqueio do painel.

Além destas condições, continuam necessárias as flags técnicas por módulo (OFF por defeito), cifragem, Firebase Admin e autorização operacional explícita na área Configuração. Não alterar as flags de produção nem criar registos de ativação durante esta revisão.

## Plano de validação seguro (ordem obrigatória)
1. Confirmar o Project ID Firebase certo, exportar a versão **publicada** de Firestore Rules e Storage Rules e conservar cópia integral com SHA-256, data e responsável. Não modificar as regras antes de rever a sua extensão.
2. Inventariar as coleções de conteúdo público (`eventos`, `programas`, `agenda`, `noticias`, `membros`, `parceiros`, `carrossel`) e verificar campo a campo que não contêm dados privados.
3. Rever todos os blocos match, em especial wildcards sobrepostos. Em Firestore, múltiplos allow aplicáveis combinam-se por OR; allow false específico NÃO anula um allow true geral.
4. Comparar com o candidato em `tests/firebase/candidate-firestore.rules`. Este ficheiro é apenas para um projeto TEST separado; não o publicar automaticamente em produção.
5. Executar testes com utilizadores anónimos, utilizadores autenticados, operadores de escolas diferentes, equipas distintas, IDs forjados, acesso ao audit log e alterações de configuração. Repetir com identidades reais de TEST.
6. Criar um bucket dedicado para documentos privados em TEST: prevenir acesso público, utilizar IAM mínimo, prevenir links públicos/tokens, definir conservação e testar downloads autenticados. `tests/firebase/candidate-private-storage.rules` é candidato de regras deny-all, não substitui políticas publicadas existentes.
7. Validar chaves de cifragem sem as expor, backup/restauro, rotação, RGPD e retenção. A instalação de chaves por si só não verifica privacidade.
8. Só depois atestar as regras em TEST, configurar flags técnicas de TEST, executar redeploy TEST e testar cada módulo através da área Configuração. Produção exige aprovação separada e plano de rollback.

## Evidência automatizada deste incremento
- `node --test tests/security-readiness.test.mjs` verifica que nenhuma chave ou configuração de bucket contorna a revisão das regras.
- O CI executa o Firestore Emulator com regras existentes de TEST e, numa segunda execução isolada, com `tests/firebase/candidate-emulator.json` e `tests/firebase-candidate-emulator.test.mjs`.
- O teste candidato verifica que o website consegue ler notícias públicas mas não alterá-las, e que alunos, sócios, dados financeiros, documentos, eventos de auditoria e configurações são privados.
- O teste NÃO comprova as regras publicadas, as permissões de uma conta de serviço, o bucket real ou a partilha de documentos com dados de menores.

## Estado de entrega
Sem criação de bucket, sem alteração de regras reais, sem ativação de módulos e sem publicação de dados pessoais nesta tarefa. O lançamento integral continua NO-GO até às verificações e aprovações independentes.