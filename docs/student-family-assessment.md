# FTB-FAM-001 — Avaliação familiar associada ao aluno

**Fonte funcional:** formulário «Questionário de Avaliação Familiar | Guiné-Bissau», fornecido pelo cliente (4 páginas). Os campos são adaptados à Fundação; o produto não reutiliza marcas nem elementos gráficos de terceiros.

## Navegação e experiência
- Gestão da Fundação → Alunos → Detalhes de aluno → Avaliação familiar, como separador dentro do Sheet lateral, ao lado do separador Dados do aluno.
- Secções A a I: identificação; composição familiar; educação; saúde; trabalho e rendimento; alimentação; habitação; observações da visita; recomendação e fundamentação.
- A ficha pode ser guardada em rascunho e marcada como concluída após justificação. O parecer não é uma decisão automática de atribuição de ajuda.
- Histórico de revisões: cada alteração cria nova versão imutável e evento de auditoria. No painel podem consultar-se versões anteriores em modo de leitura.
- A ficha vive na coleção `area_student_family_assessments/{studentId}`; versões em `/revisions/{000001...}`. O cadastro do aluno não é alterado pelas avaliações.

## Segurança e proteção de dados
- Ficha disponível apenas aos administradores autorizados pelo servidor; a mera presença de um tab não concede permissões.
- Requer o módulo Alunos ativo, AES-256-GCM e a flag independente `FTB_FAMILY_ASSESSMENTS_ENABLED=true`. A flag está OFF por defeito e não é ativada por este PR.
- Respostas integralmente cifradas com AAD ligado ao documento (incluindo saúde e condições socioeconómicas). Índice contém apenas studentId, estado, revisão, autor e datas.
- Os eventos de auditoria guardam ator, operação, data e antes/depois protegidos. Sem anexos ou exposição via browser Firebase; Firestore Rules têm de impedir leituras e escritas diretas.
- A recolha de saúde, deficiência, composição familiar e dados de menores requer base legal documentada (RGPD), avaliação de necessidade e proporcionalidade, política de conservação, acesso mínimo e protocolo de recolha no terreno. O utilizador confirma a base de recolha em cada gravação; essa marcação não substitui a revisão jurídica.
- Não considerar o consentimento informal como base suficiente para tratamento de dados especiais; proceder a avaliação de impacto quando aplicável e verificar obrigações e jurisdição dos dados recolhidos na Guiné-Bissau.

## Critérios de teste
- Formatos, listas fechadas, limites de comprimento, controlo da revisão e prevenção de campos arbitrários.
- Cifragem, AAD, histórico transacional, auditoria e validação de permissão.
- E2E por responsável autorizado e negação a utilizadores externos antes de ativar a flag.