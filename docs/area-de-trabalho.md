# Área de trabalho da Fundação Tony Bana

`/area` reúne a gestão de sócios, contas de acesso, quotas e doações. A equipa pública do website continua a ser gerida em `/admin/dashboard`; esses registos não são a base de sócios. Administradores gerem todos os registos; cada conta de sócio autenticada vê apenas o perfil, quotas e recebimentos ligados ao seu UID Firebase. Só administradores podem criar obrigações ou registar movimentos financeiros.

## Acesso administrativo

As rotas `/api/area/*` exigem um Firebase ID token válido e revogação verificada. Operações administrativas exigem um dos seguintes controlos no servidor:

- UID presente em `FIREBASE_AREA_ADMIN_UIDS` (lista de UIDs separada por vírgulas); ou
- custom claim Firebase `admin: true`.

Os pedidos enviados no formulário público da homepage ficam em `area_membership_intentions` e não criam sócios. Só um administrador pode revê-los. Ao aceitar um pedido, o servidor cria o registo oficial em `area_socios` e marca o pedido como aceite na mesma transação; a rejeição apenas atualiza o pedido. Os pedidos são privados e não têm rota pública de leitura.

As contas de sócios são associadas pelo administrador ao criar uma conta, selecionando um sócio ativo e usando o email registado desse sócio. A associação guarda o UID Firebase no respetivo registo. Estar autenticado, por si só, não dá acesso a `/area`.

Configurar `FIREBASE_SERVICE_ACCOUNT_JSON` como variável de ambiente privada em desenvolvimento e Vercel. O valor é o JSON completo de uma service account do projeto Firebase. Nunca usar o prefixo `NEXT_PUBLIC_`, guardar a chave no Git ou expô-la no browser. Definir pelo menos um UID autorizado em `FIREBASE_AREA_ADMIN_UIDS` antes de abrir `/area`.

## Registos financeiros

- `area_quota_obligations`: obrigação por sócio e período `YYYY-MM`, com vencimento e montante inicial em unidades menores de AOA.
- `area_financial_transactions`: movimentos de quota e doação. Um pagamento de quota referencia uma obrigação; o sistema calcula o estado e saldo a partir do histórico de recebimentos.
- Doações são recebimentos separados e podem ser identificadas ou anónimas. Não são associadas a uma quota.
- Os movimentos não têm edição nem eliminação na interface. Um processo de estorno/correção deve ser definido antes de operar com dados financeiros reais. O fluxo atual não processa pagamentos online; regista pagamentos recebidos manualmente.

O modelo adapta o conceito de obrigações, recebimentos e reconciliação existente na documentação de Naraiana. O projeto de referência não contém lógica própria de quotas de associação ou doações. Valores, períodos, regras de cobrança e necessidades de relatórios ainda requerem validação pela Fundação.

## Configuração do Firestore

Os dados da área são acedidos apenas pelas rotas autenticadas no servidor. Antes de produção, rever as Security Rules do Firebase para negar acesso direto do SDK do browser às coleções `area_socios`, `area_quota_obligations`, `area_financial_transactions` e `area_membership_intentions`; estas regras não estão versionadas neste repositório.
