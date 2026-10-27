# Fundação Tony Bana — Entregas materiais e biblioteca de documentos por equipas

## Entregas de doações (FTB-DON-006 / FTB-DON-008)

A receção de bens e a entrega a beneficiários são movimentos diferentes. As receções confirmadas criam lotes de stock; **a entrega nunca altera o stock no registo inicial**. O novo módulo regista guia `ENT-*`, destino (escola existente e ativa ou outra entidade), local exato, responsável pela entrega, itens e lotes, quantidades e referência de documento.

1. Registar entrega **Pendente**. Os lotes selecionados são verificados, mas não reservados; a disponibilidade pode mudar.
2. Confirmar entrega física indicando **quem recebeu**, **data efetiva** e referência do comprovativo. O servidor regista ainda quem confirmou e a hora da confirmação.
3. Numa transação Firestore, verificar o destino e cada lote disponível, descontar as quantidades, criar um movimento por lote e mudar a entrega para **Entregue**. Operações repetidas não duplicam o stock; entregas concorrentes disputando o mesmo lote não podem produzir saldo negativo.
4. Registos de destino, nomes, notas e itens são cifrados com AES-256-GCM e autenticados com o caminho do documento. Chaves não são registadas no código. Apenas administrador Firebase já autorizado pode usar os endpoints enquanto não existir ABAC implementada para outros papéis.

**Configuração de TEST**: ativar `FTB_MATERIAL_DELIVERIES_ENABLED=true` somente depois de configurar o Firebase Admin e `FTB_DATA_ENCRYPTION_KEYS_JSON` + `FTB_DATA_ENCRYPTION_ACTIVE_KID`. Por defeito o módulo está **OFF**. Testar Firestore Emulator, listas com grande volume, mobile e acessibilidade. Não é permitido editar stock diretamente pela interface.

**Fase seguinte**: associação de comprovativo documental por ID imutável, devoluções/estornos, reservas, ordens de distribuição, guias PDF e assinatura digital da entidade recebedora. A referência textual não constitui prova autenticada.

## Biblioteca documental com experiência Teams/SharePoint (FTB-DOC-001/002/003/006/007)

- **Equipa**: nome, membros Firebase verificados, registo e revisão otimista. Os administradores gerem equipas e entradas/saídas. Remover alguém da equipa revoga o acesso na chamada seguinte.
- **Pasta**: pertence a uma equipa; pode ter pasta-mãe dentro da mesma equipa. Não existem pastas públicas.
- **Ficheiro**: pasta, equipa, classificação (`internal`, `confidential`, `minor`), ACL de equipa e UIDs explícitos, nome cifrado, versões e eventos de auditoria.
- **Versão**: ficheiro imutável em `private/documents/{documentId}/v{n}`, `SHA-256`, tamanho, criador, data e histórico de descarregamentos. A nova versão não substitui a anterior; rejeita tentativas concorrentes através de `ifGenerationMatch: 0` e revisão transacional.
- **Acesso**: token Firebase verificado pelo servidor (revogação ativa). Administrador identificado por política independente; membros precisam de perfil IAM de documentos, pertença à equipa e ACL de ficheiro. Dados de menores e confidenciais exigem UID explícito. Partilha externa ou por URL pública **não está implementada**.
- **Download**: bytes fornecidos por endpoint autenticado, `Content-Disposition: attachment`, `no-store`, `nosniff` e registo de auditoria. Nunca fornecer URLs públicas, Firebase download tokens nem signed URLs persistentes.
- **Frontend**: tabela central com filtros, ordenação, paginação e detalhes laterais; seleção de equipa e pasta, ficheiros com histórico e controlo de versões, partilha e gestão de membros. Utilizadores autorizados podem entrar diretamente em `/platform/documents`, incluindo colaboradores que ainda não têm acesso ao portal de sócios.

**Pré-requisitos obrigatórios antes de ativar:** `FTB_DOCUMENTS_ENABLED=true` somente em ambiente TEST com `FTB_DOCUMENTS_BUCKET` dedicado **privado e com regras de Storage a negar acesso direto por clientes**, Firebase Admin, e `FTB_DATA_ENCRYPTION_KEYS_JSON` + `FTB_DATA_ENCRYPTION_ACTIVE_KID`; para membros não administradores é também necessário `FTB_GRANULAR_ACCESS_ENABLED=true` e perfil correspondente em `area_user_access`.

**Segurança de ficheiros:** neste incremento suportam-se **apenas PDF, PNG, JPEG, WEBP e TXT até 10 MB**, com validação básica da assinatura de ficheiro; DOCX/XLSX, edição colaborativa, visualização inline, antivírus e proteção contra malware avançada são **pendentes**. Os formatos Office não devem ser ativados antes de haver análise de malware. A interface não fornece uma edição online equivalente ao Microsoft 365.

A biblioteca exige revisão independente das regras reais do bucket, testes E2E (inclusive permissões entre equipas, revogação e gestão de versões) e avaliação RGPD, especialmente para dados de menores, antes de permitir documentos reais e antes do lançamento.

## Critérios GO/NO-GO

Os testes unitários e de integração em CI são evidências técnicas, não aprovam sozinhos a libertação dos módulos. Não marcar requisitos do Notion como verificados nem alterar os 14 gates de lançamento até existir avaliação humana e evidência de TEST. Não configurar as flags em produção nesta PR.
