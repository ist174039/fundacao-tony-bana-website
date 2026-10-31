export type ManualRole = "admin" | "operational" | "socio";
export type ManualStep = { title: string; action: string; expected: string; ifFail: string };
export type ManualGuide = {
  id: string; group: string; title: string; summary: string; roles: ManualRole[];
  location: string; prerequisites: string[]; steps: ManualStep[];
  decision: { question: string; yes: string; no: string };
  tip: string; warning: string;
};
/** Verified against the current /platform and /api/area structure. Role visibility is educational only:
 * every real operation must still pass backend authorization and module readiness gates. */
export const manualGuides: ManualGuide[] = [
  {
    "id": "acesso",
    "group": "Início e conta",
    "title": "Primeiro acesso e navegação",
    "summary": "Da autenticação à escolha do módulo com as permissões adequadas.",
    "roles": [
      "admin",
      "operational",
      "socio"
    ],
    "location": "/platform",
    "prerequisites": [
      "Conta Firebase ativa e credenciais próprias",
      "Perfil associado à Fundação; permissões concedidas pelo administrador"
    ],
    "steps": [
      {
        "title": "Abrir o portal",
        "action": "Acede a /platform/login e identifica-te com o email e a palavra-passe da Fundação.",
        "expected": "A aplicação verifica a sessão e apresenta os espaços a que tens acesso.",
        "ifFail": "Se a conta não entrar, confirma a ativação e pede revisão ao administrador."
      },
      {
        "title": "Escolher o espaço",
        "action": "No ecrã /platform abre a Área do sócio, Gestão da Fundação ou, se fores administrador, a Administração do site.",
        "expected": "A navegação corresponde ao perfil atribuído, não a um perfil escolhido manualmente.",
        "ifFail": "Se surgir um espaço indevido, não continues: regista a anomalia."
      },
      {
        "title": "Encontrar as funções",
        "action": "Na barra lateral expande Início e conta, Educação e apoio, Doações e logística, Documentos ou Administração.",
        "expected": "O menu apresenta apenas módulos disponíveis e autorizados.",
        "ifFail": "Se não vires um módulo, verifica o estado em Configuração e as permissões."
      },
      {
        "title": "Consultar os detalhes",
        "action": "Nas listas usa pesquisa, filtros, ordenação e abre a ficha ou o painel lateral.",
        "expected": "Visualizas o registo selecionado sem perder o contexto da lista.",
        "ifFail": "Não uses links diretos para contornar permissões."
      },
      {
        "title": "Terminar a sessão",
        "action": "Seleciona Sair depois de concluir o trabalho, especialmente em equipamentos partilhados.",
        "expected": "A sessão local é terminada e regressas ao login.",
        "ifFail": "Se não terminar, fecha o separador e comunica o problema."
      }
    ],
    "decision": {
      "question": "O módulo aparece no menu?",
      "yes": "Segue o fluxo de trabalho desse módulo.",
      "no": "Confirma perfil, âmbito escolar, ativação e dependências; não forces acesso."
    },
    "tip": "Usa sempre a tua própria conta; ações administrativas ficam associadas ao utilizador.",
    "warning": "Nunca partilhes palavras-passe, tokens ou dados pessoais por capturas de ecrã."
  },
  {
    "id": "socio",
    "group": "Sócios e finanças",
    "title": "A minha área de sócio e dívidas",
    "summary": "Consultar registo pessoal, quotas, valores pagos e saldo em dívida.",
    "roles": [
      "admin",
      "socio"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Sessão de sócio vinculada ao respetivo registo",
      "Quotas e recebimentos já registados"
    ],
    "steps": [
      {
        "title": "Abrir a visão geral",
        "action": "Na Área do sócio consulta os indicadores financeiros no topo.",
        "expected": "O resumo apresenta valores pagos, por pagar e situações em atraso, quando existirem.",
        "ifFail": "Se o resumo falhar, não concluas que a dívida é zero."
      },
      {
        "title": "Abrir quotas",
        "action": "Expande Início e conta e seleciona Quotas e finanças.",
        "expected": "A lista mostra períodos, valores, vencimentos e estados.",
        "ifFail": "Se a lista não carregar, comunica o erro antes de pagar."
      },
      {
        "title": "Analisar dívida",
        "action": "Seleciona a quota em dívida para ver valor inicial, pago, pendente e vencimento.",
        "expected": "Consegues distinguir uma quota pendente de uma parcialmente paga.",
        "ifFail": "Se houver pagamento em falta, reúne o comprovativo."
      },
      {
        "title": "Confirmar os movimentos",
        "action": "Consulta os recebimentos associados e compara com os teus comprovativos.",
        "expected": "O saldo reflete os pagamentos registados, não promessas de pagamento.",
        "ifFail": "Uma diferença exige reconciliação pela administração."
      },
      {
        "title": "Pedir correção",
        "action": "Comunica uma divergência à Fundação com período e referência, evitando enviar dados sensíveis desnecessários.",
        "expected": "A administração pode rever a transação e o saldo.",
        "ifFail": "Não registes uma segunda transação por iniciativa própria."
      }
    ],
    "decision": {
      "question": "O pagamento já está refletido na quota?",
      "yes": "Consulta o saldo atualizado e termina.",
      "no": "Solicita verificação documental à tesouraria; não dupliques lançamentos."
    },
    "tip": "Quotas em aberto não equivalem a dinheiro efetivamente recebido.",
    "warning": "O utilizador sócio deve visualizar os seus próprios registos; qualquer acesso a terceiros é incidente."
  },
  {
    "id": "pedidos",
    "group": "Pessoas e adesões",
    "title": "Pedidos de adesão e sócios",
    "summary": "Da manifestação de interesse ao registo seguro do sócio.",
    "roles": [
      "admin"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Permissão de administrador",
      "Dados de adesão e base jurídica confirmados"
    ],
    "steps": [
      {
        "title": "Consultar pedidos",
        "action": "Abre Administração → Contactos e pedidos e filtra os pedidos pendentes.",
        "expected": "Surge a lista de entradas por tratar.",
        "ifFail": "Não aproves uma intenção sem confirmar a identidade e consentimentos necessários."
      },
      {
        "title": "Rever dados",
        "action": "Abre o detalhe, confirma contacto, duplicados e estado.",
        "expected": "O pedido contém os dados mínimos para uma decisão.",
        "ifFail": "Em falta de informação, mantém o pedido pendente."
      },
      {
        "title": "Decidir",
        "action": "Aprova ou rejeita segundo o procedimento da Fundação e regista a razão quando aplicável.",
        "expected": "O pedido muda de estado e fica rastreável.",
        "ifFail": "Não aproves duas vezes o mesmo pedido."
      },
      {
        "title": "Confirmar sócio",
        "action": "Em Sócios / Meu registo confirma a existência do registo único.",
        "expected": "O sócio aparece com identificador próprio e estado adequado.",
        "ifFail": "Se não existir, verifica o erro e a cifragem antes de tentar novamente."
      },
      {
        "title": "Gerir alterações",
        "action": "Atualiza dados autorizados, valida contactos e confirma na lista.",
        "expected": "A informação permanece correta após recarregar.",
        "ifFail": "Não elimines registos financeiros históricos para corrigir dados de contacto."
      }
    ],
    "decision": {
      "question": "O pedido é válido e não duplicado?",
      "yes": "Prossegue para aprovação e verifica o sócio criado.",
      "no": "Rejeita ou solicita correção, preservando o histórico."
    },
    "tip": "Um pedido aprovado não dispensa a verificação do registo no cadastro.",
    "warning": "Fluxos legados e novas escritas cifradas devem ser testados antes de carga real."
  },
  {
    "id": "financas",
    "group": "Sócios e finanças",
    "title": "Quotas, pagamentos e donativos monetários",
    "summary": "Criar obrigação, receber valor, reconciliar e consultar movimentos.",
    "roles": [
      "admin"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Sócio ativo para lançamento de quota",
      "Autorização financeira e regras de cifragem configuradas"
    ],
    "steps": [
      {
        "title": "Selecionar sócio",
        "action": "Abre Quotas e finanças e identifica o sócio correto.",
        "expected": "A obrigação fica associada a um único sócio.",
        "ifFail": "Se não estiver ativo, resolve primeiro o cadastro."
      },
      {
        "title": "Criar quota",
        "action": "Preenche período AAAA-MM, vencimento e montante conforme o formulário.",
        "expected": "Uma quota única é criada para o período.",
        "ifFail": "Se existir a mesma quota, a API deverá rejeitar duplicação."
      },
      {
        "title": "Registar recebimento",
        "action": "Na secção de movimentos escolhe quota ou doação, data, método e valor.",
        "expected": "A transação é guardada como recebimento financeiro.",
        "ifFail": "Se o valor exceder o saldo da quota, o lançamento deve ser rejeitado."
      },
      {
        "title": "Conciliar",
        "action": "Compara quota, total pago, montante em aberto e documento de suporte.",
        "expected": "Os números ficam coerentes e não existe pagamento duplicado.",
        "ifFail": "Se houver divergência, não alteres o histórico diretamente na base de dados."
      },
      {
        "title": "Rever auditoria",
        "action": "Consulta o histórico e confirma o responsável por criação/alteração.",
        "expected": "O lançamento é rastreável para revisão.",
        "ifFail": "Movimentos definitivos não devem ser apagados para corrigir saldos."
      }
    ],
    "decision": {
      "question": "Pagamento é de quota existente?",
      "yes": "Associa-o à obrigação e verifica o saldo.",
      "no": "Regista doação monetária com identificação/anonimato adequado."
    },
    "tip": "A moeda operacional é XOF; confirma sempre a unidade e não confundas obrigação com recebimento.",
    "warning": "Não cries novas entradas financeiras em texto claro se a cifragem não estiver ativa."
  },
  {
    "id": "escolas",
    "group": "Educação e apoio",
    "title": "Escolas e responsáveis",
    "summary": "Criar escola, associar contactos, editar e controlar o âmbito.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Módulo Escolas operacionalmente ativo",
      "Permissão para a escola e ação pretendida"
    ],
    "steps": [
      {
        "title": "Encontrar o módulo",
        "action": "Expande Educação e apoio → Escolas; pesquisa pelo código ou nome.",
        "expected": "A lista apresenta apenas escolas autorizadas.",
        "ifFail": "Um operador sem escola atribuída não deve obter dados."
      },
      {
        "title": "Registar escola",
        "action": "Se autorizado, preenche código, nome e contactos institucionais e guarda.",
        "expected": "A escola passa a existir com código único.",
        "ifFail": "Corrige obrigatórios inválidos; não reutilizes código de outra escola."
      },
      {
        "title": "Adicionar responsável",
        "action": "Abre a ficha da escola e regista contacto, função e meios de contacto.",
        "expected": "O responsável fica vinculado à escola.",
        "ifFail": "Confirma a autorização antes de guardar dados pessoais."
      },
      {
        "title": "Atualizar contacto",
        "action": "Usa a ação de edição do responsável, altera os campos e confirma.",
        "expected": "A listagem reflete a alteração e a auditoria regista-a.",
        "ifFail": "Se a ação não estiver visível, verifica a permissão Editar."
      },
      {
        "title": "Remover contacto",
        "action": "Se estiver autorizado e não houver dependências indevidas, usa a eliminação com confirmação.",
        "expected": "O contacto deixa de surgir nos registos ativos.",
        "ifFail": "Não apagues uma escola com entregas pendentes; o fluxo de arquivamento da PR #161 não está integrado."
      }
    ],
    "decision": {
      "question": "A escola tem movimentos ou alunos associados?",
      "yes": "Verifica dependências e usa procedimento de arquivamento quando estiver disponível.",
      "no": "Pode ser atualizada por utilizador autorizado."
    },
    "tip": "O código da escola é a referência para o isolamento ABAC.",
    "warning": "A eliminação/arquivamento de escolas e alunos é trabalho ainda presente na PR #161."
  },
  {
    "id": "alunos",
    "group": "Educação e apoio",
    "title": "Alunos, encarregados e ficha individual",
    "summary": "Do registo do aluno às atualizações escolares e ligação familiar.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Escola ativa já registada",
      "Módulo Alunos ativo e autorização para a escola"
    ],
    "steps": [
      {
        "title": "Abrir Alunos",
        "action": "Seleciona Educação e apoio → Alunos e filtra por escola.",
        "expected": "A lista apresenta apenas alunos dentro do âmbito de acesso.",
        "ifFail": "Se surgirem alunos de outras escolas, interrompe e reporta."
      },
      {
        "title": "Criar aluno",
        "action": "Preenche código interno, nome, escola, ano letivo, encarregado e contacto válido.",
        "expected": "O registo é criado com dados pessoais cifrados.",
        "ifFail": "A API recusa código inválido, escola inativa ou encarregado/contacto em falta."
      },
      {
        "title": "Ver ficha",
        "action": "Abre o aluno e confirma dados, escola e associação ao agregado.",
        "expected": "A ficha disponibiliza dados e separadores permitidos.",
        "ifFail": "Não fotografe ou exporte dados sem autorização e finalidade."
      },
      {
        "title": "Editar aluno",
        "action": "Altera apenas campos permitidos, como classe ou contacto; guarda.",
        "expected": "O histórico mantém o mesmo ID e os dados são atualizados.",
        "ifFail": "Transferir escola ou alterar identidade não deve ser feito como edição simples."
      },
      {
        "title": "Ligar família",
        "action": "Usa a secção familiar para associar o agregado quando disponível.",
        "expected": "O aluno fica associado ao agregado previsto.",
        "ifFail": "Se existirem irmãos, verifica relações antes de criar agregado duplicado."
      }
    ],
    "decision": {
      "question": "O aluno já existe na escola?",
      "yes": "Abre e atualiza a ficha existente.",
      "no": "Cria um registo único após confirmar escola e encarregado."
    },
    "tip": "Não uses dados reais de menores nos testes; emprega apenas dados sintéticos.",
    "warning": "A gestão completa de arquivamento está pendente da PR #161; não a descrevemos como pronta."
  },
  {
    "id": "familias",
    "group": "Educação e apoio",
    "title": "Agregado familiar e avaliação social",
    "summary": "Registar família, recolher avaliação, submeter e rever estados.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Aluno registado e escola autorizada",
      "Finalidade de avaliação definida e informação recolhida de forma legítima"
    ],
    "steps": [
      {
        "title": "Localizar a ficha",
        "action": "Abre Alunos, escolhe o aluno e acede aos separadores familiares.",
        "expected": "Encontrarás a família/avaliação associada ao aluno quando o módulo estiver disponível.",
        "ifFail": "Se não aparecer, confirma permissões e ativação; não contornes a aplicação."
      },
      {
        "title": "Registar agregado",
        "action": "Indica representante e comunidade e associa a família ao aluno.",
        "expected": "Os dados privados são cifrados e relacionados com a ficha.",
        "ifFail": "Verifica duplicados e relações entre irmãos."
      },
      {
        "title": "Preparar a visita",
        "action": "Confirma data, representante e voluntário selecionado de utilizadores ativos.",
        "expected": "Ficam identificados data, responsável e contexto da avaliação.",
        "ifFail": "Nunca escrevas um UID técnico no campo do voluntário."
      },
      {
        "title": "Preencher avaliação",
        "action": "Completa composição familiar, educação, saúde, rendimento, alimentação, habitação e recomendação.",
        "expected": "A validação impede números de membros incoerentes e campos obrigatórios em falta.",
        "ifFail": "Regista apenas dados estritamente necessários à avaliação."
      },
      {
        "title": "Guardar rascunho",
        "action": "Guarda o formulário e verifica os dados antes de alterar o estado.",
        "expected": "A ficha conserva o rascunho e um evento de auditoria.",
        "ifFail": "Uma avaliação submetida não deve poder ser editada diretamente."
      },
      {
        "title": "Submeter e analisar",
        "action": "Submete o rascunho; utilizador autorizado faz revisão e decisão justificada.",
        "expected": "A transição respeita estados permitidos e preserva histórico.",
        "ifFail": "Se for necessária nova recolha, inicia visita/revisão apropriada, não altera o resultado fechado."
      }
    ],
    "decision": {
      "question": "A avaliação está completa e coerente?",
      "yes": "Submete para revisão e decisão fundamentada.",
      "no": "Mantém em rascunho, corrige lacunas e volta a validar."
    },
    "tip": "O questionário familiar inclui informação potencialmente sensível; minimiza o que recolhes.",
    "warning": "As famílias e avaliações têm permissões mais restritas do que o cadastro de alunos."
  },
  {
    "id": "doacoes",
    "group": "Doações e logística",
    "title": "Receção de doações materiais",
    "summary": "Da entrada de bens à confirmação física e criação de stock.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Módulo Doações materiais ativo",
      "Bens recebidos e quantidades verificáveis"
    ],
    "steps": [
      {
        "title": "Abrir doações materiais",
        "action": "Expande Doações e logística → Doações materiais e consulta registos recentes.",
        "expected": "Identificas receções pendentes ou confirmadas.",
        "ifFail": "Não confundas registo de receção com entrada definitiva em stock."
      },
      {
        "title": "Criar receção",
        "action": "Regista doador ou anonimato aplicável, descrição, categoria, quantidade, unidade e condições.",
        "expected": "A doação é criada em estado pendente.",
        "ifFail": "Cada item deve ter quantidade positiva e unidade coerente."
      },
      {
        "title": "Conferir materiais",
        "action": "Compara a lista com os bens efetivamente entregues à Fundação.",
        "expected": "As quantidades e estados podem ser corrigidos enquanto pendentes, conforme ações disponíveis.",
        "ifFail": "Não confirmes sem conferência física."
      },
      {
        "title": "Confirmar receção",
        "action": "Usa a ação de confirmação autorizada.",
        "expected": "A operação cria lotes e movimentos de entrada uma única vez.",
        "ifFail": "Uma segunda confirmação não deve duplicar stock."
      },
      {
        "title": "Consultar stock",
        "action": "Abre a zona de stock disponível associada às doações e confirma lotes e quantidades.",
        "expected": "Os bens confirmados passam a estar disponíveis, descontadas as reservas.",
        "ifFail": "Se o lote não aparecer, confirma estado e histórico antes de repetir."
      }
    ],
    "decision": {
      "question": "A entrega física foi conferida?",
      "yes": "Confirma receção, gera lotes e verifica stock.",
      "no": "Mantém pendente; não aumentes o stock disponível."
    },
    "tip": "Não somes quilogramas e unidades no mesmo indicador.",
    "warning": "As edições de doações pendentes mais recentes estão na PR #161 e exigem merge e validação."
  },
  {
    "id": "entregas",
    "group": "Doações e logística",
    "title": "Reservas de stock e entrega de bens",
    "summary": "Do pedido até à reserva, confirmação física ou cancelamento.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Módulo Entregas ativo e doações confirmadas",
      "Existência de lotes com stock livre"
    ],
    "steps": [
      {
        "title": "Escolher destino",
        "action": "Abre Entregas de doações; escolhe Escola na lista de escolas ativas ou Outra entidade.",
        "expected": "O destino fica identificado de forma consistente.",
        "ifFail": "Se a escola estiver inativa, não a substituas por texto livre para contornar validação."
      },
      {
        "title": "Selecionar itens",
        "action": "Escolhe lotes de stock e quantidades com as respetivas unidades.",
        "expected": "O sistema calcula disponibilidade livre por lote.",
        "ifFail": "Não uses quantidades superiores ao saldo livre."
      },
      {
        "title": "Registar entrega pendente",
        "action": "Confirma os dados e guarda a entrega com destinatário e responsável.",
        "expected": "A transação reserva stock sem registar saída física.",
        "ifFail": "Se não houver stock livre, a API rejeita a reserva."
      },
      {
        "title": "Confirmar entrega física",
        "action": "Após comprovativo e entrega real, usa Confirmar entrega.",
        "expected": "As quantidades reservadas convertem-se em saída efetiva e fica histórico.",
        "ifFail": "Se a entrega não ocorreu, nunca a marques como entregue."
      },
      {
        "title": "Cancelar se necessário",
        "action": "Se a entrega pendente não avançar, seleciona Cancelar.",
        "expected": "A reserva é libertada e o lote volta a ter saldo livre.",
        "ifFail": "Verifica concorrência e não anules movimentos já concluídos."
      },
      {
        "title": "Reconciliar",
        "action": "Compara guia, lotes, quantidades reservadas, entregues e movimentos.",
        "expected": "Não existem saldos negativos nem movimentos repetidos.",
        "ifFail": "Uma diferença exige reconciliação auditada, não edição manual do Firestore."
      }
    ],
    "decision": {
      "question": "Bens foram fisicamente entregues?",
      "yes": "Confirma e movimenta stock.",
      "no": "Mantém reserva pendente ou cancela para libertar stock."
    },
    "tip": "Confirmar e cancelar são estados com consequências no inventário.",
    "warning": "Edição posterior de entregas pendentes está proposta na PR #161; não está na main validada."
  },
  {
    "id": "documentos",
    "group": "Documentos",
    "title": "Equipas, pastas, documentos e versões",
    "summary": "Criar área de equipa, guardar documentos e controlar partilha/versões.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Módulo Documentos operacionalmente ativo",
      "Storage privado e permissões por equipa realmente verificados"
    ],
    "steps": [
      {
        "title": "Abrir biblioteca",
        "action": "Expande Documentos → Biblioteca documental e identifica a equipa.",
        "expected": "Só surgem equipas e conteúdos que tens direito a consultar.",
        "ifFail": "Se não tiveres acesso, não partilhes links diretos ou tokens antigos."
      },
      {
        "title": "Criar equipa",
        "action": "Se autorizado, cria a equipa e seleciona os membros existentes na plataforma.",
        "expected": "A equipa passa a definir o âmbito de documentos.",
        "ifFail": "Evita introduzir UIDs manualmente; usa seleção de utilizadores."
      },
      {
        "title": "Criar pasta",
        "action": "Usa Nova pasta; associa à equipa ou pasta superior.",
        "expected": "A estrutura de pastas fica organizada por finalidade.",
        "ifFail": "Uma subpasta não deve pertencer a equipa diferente da pasta pai."
      },
      {
        "title": "Adicionar documento",
        "action": "Usa Adicionar documento, seleciona equipa/pasta, classificação e ficheiro.",
        "expected": "O ficheiro é guardado na área privada com versão inicial.",
        "ifFail": "Não coloques documentos de menores em pasta pública."
      },
      {
        "title": "Rever versão",
        "action": "Consulta histórico de versões e, quando permitido, carrega uma versão seguinte.",
        "expected": "A versão anterior permanece imutável e rastreável.",
        "ifFail": "Nunca sobreponhas manualmente objetos no Storage."
      },
      {
        "title": "Partilhar e descarregar",
        "action": "Partilha apenas dentro da equipa e segundo classificação; usa download autorizado.",
        "expected": "A aplicação verifica acesso antes de permitir descarregar.",
        "ifFail": "Se um URL permitir descarregar sem autenticação, interrompe o uso e reporta."
      }
    ],
    "decision": {
      "question": "Documento contém dados de menores ou confidenciais?",
      "yes": "Classifica como restrito e partilha apenas com membros expressamente autorizados.",
      "no": "Mantém a classificação mínima necessária e o âmbito da equipa."
    },
    "tip": "A existência do botão de upload não prova segurança efetiva do bucket.",
    "warning": "Nunca publiques links de download privados em conversas ou relatórios."
  },
  {
    "id": "utilizadores",
    "group": "Administração",
    "title": "Utilizadores e perfis RBAC/ABAC",
    "summary": "Conceder exatamente os módulos, ações e escolas de que uma pessoa necessita.",
    "roles": [
      "admin"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Permissão de administrador",
      "Identidade e vínculo do utilizador verificados"
    ],
    "steps": [
      {
        "title": "Localizar conta",
        "action": "Expande Administração → Utilizadores e pesquisa por nome ou email.",
        "expected": "A conta e o estado atual são apresentados.",
        "ifFail": "Não cries várias contas para representar um único utilizador."
      },
      {
        "title": "Registar ou associar",
        "action": "Associa o utilizador ao sócio adequado, quando exigido pelo fluxo.",
        "expected": "Identidade e registo institucional ficam ligados.",
        "ifFail": "Confirma correspondência de emails antes da associação."
      },
      {
        "title": "Atribuir perfil",
        "action": "No editor define perfis adequados às funções da pessoa.",
        "expected": "A plataforma deriva permissões efetivas a partir do perfil.",
        "ifFail": "Não atribuas administrador para resolver uma falta pontual de acesso."
      },
      {
        "title": "Definir módulos e ações",
        "action": "Define Estado, Ler, Criar, Editar, Aprovar, Apagar e Partilhar quando aplicáveis.",
        "expected": "Cada ação tem autorização independente no backend.",
        "ifFail": "Uma permissão Editar não deve implicitamente permitir Apagar ou Aprovar."
      },
      {
        "title": "Restringir escolas",
        "action": "Seleciona explicitamente as escolas permitidas e guarda.",
        "expected": "Os acessos escolares ficam limitados ao âmbito definido.",
        "ifFail": "Uma escola de outro âmbito deve continuar inacessível pela API."
      },
      {
        "title": "Validar e revogar",
        "action": "Testa com a conta restrita, revoga o acesso e volta a tentar a operação.",
        "expected": "Após revogação, o utilizador perde os privilégios correspondentes.",
        "ifFail": "Se um token continuar a funcionar, regista falha P0 de autorização."
      }
    ],
    "decision": {
      "question": "A pessoa precisa de administrar toda a Fundação?",
      "yes": "Atribui papel administrativo apenas com aprovação expressa.",
      "no": "Usa perfil mínimo e âmbito de escolas explícito."
    },
    "tip": "Menu oculto não é controlo de segurança: as APIs devem negar por omissão.",
    "warning": "Nunca uses contas reais para testes de escalada de privilégios."
  },
  {
    "id": "auditoria",
    "group": "Administração",
    "title": "Auditoria de operações e evidências",
    "summary": "Encontrar quem alterou o quê, quando e em que registo.",
    "roles": [
      "admin"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Perfil administrador com acesso à Auditoria",
      "Registos operacionais existentes"
    ],
    "steps": [
      {
        "title": "Abrir Auditoria",
        "action": "Seleciona Administração → Auditoria e limita o período ou o módulo.",
        "expected": "A lista mostra eventos recentes e o autor identificado.",
        "ifFail": "Se o nome faltar, usa o UID e o detalhe como referência."
      },
      {
        "title": "Localizar ação",
        "action": "Pesquisa registo, operação, data ou utilizador.",
        "expected": "Encontras criação, edição e transições de estado relevantes.",
        "ifFail": "A lista pode ser paginada/limitada; ausência da página não prova inexistência do evento."
      },
      {
        "title": "Consultar detalhe",
        "action": "Abre o evento para ver módulo, entidade, data, campos alterados e fonte.",
        "expected": "Os metadados de auditoria permitem reconstituir o processo.",
        "ifFail": "Não publiques snapshots privados."
      },
      {
        "title": "Correlacionar",
        "action": "Compara a alteração com o histórico da escola, aluno, donativo ou documento.",
        "expected": "A ação tem autor e momento coerentes com a operação.",
        "ifFail": "Se faltar um evento, assinala cobertura de auditoria incompleta."
      },
      {
        "title": "Registar evidência",
        "action": "Na validação de release associa teste, SHA, ambiente, executor e resultado.",
        "expected": "A evidência passa a ser reproduzível e auditável.",
        "ifFail": "Não classifiques como aprovado sem revisão independente."
      }
    ],
    "decision": {
      "question": "Existe evento correspondente à operação?",
      "yes": "Valida a correspondência e arquiva a evidência sanitizada.",
      "no": "Abre incidente de rastreabilidade e investiga antes de concluir."
    },
    "tip": "O histórico de auditoria não substitui backup nem controlo de acesso.",
    "warning": "Não alteres manualmente registos append-only."
  },
  {
    "id": "configuracao",
    "group": "Administração",
    "title": "Configuração e ativação de módulos",
    "summary": "Ativar Escolas, Alunos, Doações materiais, Entregas e Documentos.",
    "roles": [
      "admin"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Administrador autenticado",
      "Regras Firestore/Storage, chaves e dependências verificadas"
    ],
    "steps": [
      {
        "title": "Abrir Configuração",
        "action": "Em Administração → Configuração consulta módulos, estados e bloqueios.",
        "expected": "Cada módulo apresenta se está ativado, operacional e quais pré-requisitos faltam.",
        "ifFail": "Uma flag Vercel ativa não prova que o módulo esteja funcional."
      },
      {
        "title": "Validar dependências",
        "action": "Confirma Escolas antes de Alunos, e Doações materiais antes de Entregas.",
        "expected": "As dependências seguem a sequência prevista.",
        "ifFail": "Não forces um módulo dependente que apresenta bloqueio."
      },
      {
        "title": "Validar documentos",
        "action": "Confirma Storage privado, IAM, URLs antigos e equipa com permissões.",
        "expected": "A Biblioteca documental pode operar sem exposição pública.",
        "ifFail": "A pasta private/documents não é segura apenas por ter esse nome."
      },
      {
        "title": "Ativar um módulo",
        "action": "Usa a ação de ativação e guarda a revisão esperada.",
        "expected": "A operação é auditada e o estado passa a ativo se todos os requisitos estiverem satisfeitos.",
        "ifFail": "Resposta 409 indica conflito ou bloqueador técnico; não contornes."
      },
      {
        "title": "Executar smoke",
        "action": "Entra com conta de perfil mínimo e valida leitura, escrita autorizada e recusa não autorizada.",
        "expected": "O módulo apenas expõe a informação permitida.",
        "ifFail": "Se houver exposição, desativa o módulo e comunica P0."
      },
      {
        "title": "Registar decisão",
        "action": "Guarda resultado do teste, SHA, revisor e data antes de considerar o módulo aceite.",
        "expected": "O estado operacional e o aceite de release permanecem decisões distintas.",
        "ifFail": "Não confundir READY da Vercel com GO do produto."
      }
    ],
    "decision": {
      "question": "Todos os pré-requisitos e testes do módulo passaram?",
      "yes": "Ativa auditadamente e valida a experiência da função.",
      "no": "Mantém OFF, resolve o bloqueio e repete a verificação."
    },
    "tip": "Ativar cinco módulos não ativa automaticamente funcionalidades ainda não implementadas.",
    "warning": "Nunca marque uma atestação de segurança como true sem evidência real."
  },
  {
    "id": "indicadores",
    "group": "Educação e apoio",
    "title": "Impacto social, indicadores e relatórios",
    "summary": "Consolidar números de escolas, alunos, avaliações e entregas.",
    "roles": [
      "admin",
      "operational"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Permissão de leitura de relatórios",
      "Alunos e Entregas ativos com dados consistentes"
    ],
    "steps": [
      {
        "title": "Abrir Impacto social",
        "action": "Na secção Educação e apoio seleciona Impacto social.",
        "expected": "O painel apresenta totais agregados dos módulos.",
        "ifFail": "Se alunos ou entregas estiverem desativados, o relatório pode ficar indisponível."
      },
      {
        "title": "Rever os totais",
        "action": "Compara escolas, alunos, famílias, avaliações, lotes e entregas.",
        "expected": "Os indicadores refletem o universo registado.",
        "ifFail": "Não interpretes um contador como prova de assistência efetiva."
      },
      {
        "title": "Rever estados",
        "action": "Consulta entregas recentes pendentes, entregues e canceladas.",
        "expected": "Percebes a execução logística e não apenas o planeamento.",
        "ifFail": "Uma entrega pendente não é impacto concretizado."
      },
      {
        "title": "Conferir fonte",
        "action": "Seleciona amostra de registos e compara os totais com as listas operacionais.",
        "expected": "Identificas divergências de agregação e amostras limitadas.",
        "ifFail": "Os resultados podem ter limites de amostra; não infiras totalidade."
      },
      {
        "title": "Comunicar resultados",
        "action": "Prepara a síntese com período, origem, limitações e contexto.",
        "expected": "O relatório fica interpretável e verificável.",
        "ifFail": "Agrega dados de menores: nunca exposes identificações desnecessárias."
      }
    ],
    "decision": {
      "question": "Os registos estão conciliados e o período está definido?",
      "yes": "Publica apenas indicadores agregados verificados.",
      "no": "Corrige a fonte ou identifica o indicador como provisório."
    },
    "tip": "O módulo atual não substitui uma análise longitudinal de impacto.",
    "warning": "Não disponibilizes dados pessoais em relatórios públicos."
  },
  {
    "id": "website",
    "group": "Website institucional",
    "title": "Notícias, membros, parceiros e galeria",
    "summary": "Criar conteúdo, publicar e confirmar o resultado no site público.",
    "roles": [
      "admin"
    ],
    "location": "/platform/admin",
    "prerequisites": [
      "Acesso ao painel Administração do site",
      "Conteúdo, fotografias e autorizações editoriais validados"
    ],
    "steps": [
      {
        "title": "Abrir administração",
        "action": "Em /platform seleciona Administração do site.",
        "expected": "A página apresenta notícias, membros, parceiros e carrossel.",
        "ifFail": "Se a área não carregar, confirma sessão e acesso às coleções."
      },
      {
        "title": "Selecionar conteúdo",
        "action": "Escolhe a categoria e usa o formulário Novo correspondente.",
        "expected": "Os campos respeitam o tipo de conteúdo.",
        "ifFail": "Evita publicar textos e imagens ainda não aprovados."
      },
      {
        "title": "Preencher e guardar",
        "action": "Regista título, descrição e imagens autorizadas nos campos disponíveis.",
        "expected": "O registo fica persistido no Firebase.",
        "ifFail": "Se o upload falhar, não presumas que o conteúdo foi guardado."
      },
      {
        "title": "Editar ou remover",
        "action": "Abre o item, atualiza informação ou usa eliminação confirmada quando aplicável.",
        "expected": "A lista reflete a ação.",
        "ifFail": "A eliminação é destrutiva; confirma a referência antes de agir."
      },
      {
        "title": "Validar público",
        "action": "Volta à homepage e verifica secção, imagem, navegação, desktop e mobile.",
        "expected": "O conteúdo aparece corretamente; secções vazias não surgem.",
        "ifFail": "Se uma regra Storage bloquear a imagem, investiga permissões em vez de abrir o bucket."
      },
      {
        "title": "Registar a alteração",
        "action": "Anota o conteúdo alterado e as evidências de visualização.",
        "expected": "A publicação tem validação funcional e editorial.",
        "ifFail": "Não exponhas imagens de pessoas sem as autorizações necessárias."
      }
    ],
    "decision": {
      "question": "O conteúdo e as imagens têm aprovação?",
      "yes": "Publica e confirma visualmente no site.",
      "no": "Mantém em preparação e solicita validação institucional."
    },
    "tip": "O upload do site pode depender de regras Firebase específicas; testa antes de uso real.",
    "warning": "A gestão pública e os documentos privados têm políticas de Storage distintas."
  },
  {
    "id": "perfil",
    "group": "Início e conta",
    "title": "O meu perfil, sessão e segurança",
    "summary": "Consultar ou alterar o nome e terminar a sessão em segurança.",
    "roles": [
      "admin",
      "operational",
      "socio"
    ],
    "location": "/platform/area",
    "prerequisites": [
      "Conta autenticada",
      "Acesso ao próprio perfil"
    ],
    "steps": [
      {
        "title": "Abrir Perfil",
        "action": "Seleciona Início e conta → O meu perfil.",
        "expected": "Vês a identificação da tua conta.",
        "ifFail": "Nunca edites o perfil de outra pessoa por este percurso."
      },
      {
        "title": "Rever dados",
        "action": "Confirma email e nome apresentados.",
        "expected": "Os dados correspondem à conta que iniciou sessão.",
        "ifFail": "Se o email for inesperado, termina sessão imediatamente."
      },
      {
        "title": "Alterar nome",
        "action": "Edita apenas o nome apresentado e guarda.",
        "expected": "O Firebase Auth atualiza o display name e regista auditoria.",
        "ifFail": "Se faltar confirmação, recarrega e verifica antes de repetir."
      },
      {
        "title": "Terminar sessão",
        "action": "Seleciona Sair na barra superior.",
        "expected": "A aplicação volta ao login e a sessão fica encerrada.",
        "ifFail": "Em computadores partilhados, termina também a sessão do navegador."
      },
      {
        "title": "Pedir revogação",
        "action": "Se perderes acesso ao dispositivo, contacta o administrador para desativar a conta.",
        "expected": "Novos acessos devem ser recusados.",
        "ifFail": "Não partilhes códigos temporários ou palavras-passe."
      }
    ],
    "decision": {
      "question": "Suspeitas de acesso indevido?",
      "yes": "Termina a sessão e solicita revogação imediata.",
      "no": "Mantém credenciais pessoais e encerra ao terminar."
    },
    "tip": "A alteração de nome não altera o papel nem permissões.",
    "warning": "Ninguém precisa da tua palavra-passe para dar suporte à plataforma."
  }
];
