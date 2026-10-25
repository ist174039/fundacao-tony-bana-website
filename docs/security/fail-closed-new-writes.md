# Fundação Tony Bana — fail-closed de novas escritas de dados pessoais

Data: 2026-10-25. Proposta em branch de segurança, sem ativação automática em produção.

## Decisão técnica proposta

O armazenamento legado em texto claro deve permanecer **apenas em leitura autorizada e migração controlada**, nunca como fallback para novas escritas. O requisito FTB-SEC-001 exige proteção de PII antes da persistência; este incremento impede regressão quando faltam chaves ou flags de cifragem.

Endpoints e efeitos:
- `POST /api/membership-intentions`: 503 se `FTB_ENCRYPT_MEMBERSHIP_INTENTIONS` não for `true` ou se a cifra não estiver configurada; novo pedido é sempre selado.
- `POST /api/area/socios`: exige `FTB_SECURE_MEMBER_REGISTRY=true`, índice HMAC, chave AES-GCM e `FTB_ENCRYPT_FINANCIAL_PII=true`; nunca cria novo sócio legado SHA-256(email) em claro.
- `PATCH /api/area/socios/:id`: exige modo seguro e chave AES-GCM; pode cifrar campos de documentos legados quando aprovado.
- `POST /api/area/quotas` e `POST /api/area/transactions`: 503 quando a cifragem financeira está desligada ou não configurada, sem regressar à persistência em texto claro.
- Aprovação de intenções: `reviewMembershipIntention` responde `secure-mode-required` quando a criação segura não está ativa. Rejeições e respostas administrativas permanecem possíveis.

## Não abrangido

- Não ativa quaisquer flags em Vercel.
- Não exporta, lê, modifica ou migra dados reais.
- Não comprova compliance RGPD, gestão de consentimento ou autorização escolar.
- Não altera Security Rules remotas, chaves, custos, ambientes ou contas.
- Não transforma testes unitários em evidências de produção.

## Condições antes do merge e release

1. CI com testes de segurança, Firestore Emulator e build verde no SHA do PR.
2. Verificação com dados sintéticos em TEST, incluindo POST/PATCH e recusa sem chaves/flags; garantir que o website apresenta mensagens de indisponibilidade úteis.
3. Aprovar responsabilidades legais, titularidade e custódia das chaves, política de rotação, auditoria de acessos e tratamento de PII preexistente.
4. Validar regras Firestore/Storage e autorização por perfil. Backups e rollback ensaiados.
5. Decisor humano aceita explicitamente a alteração funcional: sem configuração segura, os formulários de criação deixam de aceitar submissões em vez de guardar em claro.
6. Gate de release exige SHA, testes E2E e evidências analisadas independentemente. Não fazer deploy só por CI passar.

## Rastreabilidade

PDD secções de privacidade e readiness → FTB-SEC-001 / FTB-SEC-002 → rotas API e `lib/server/intention-review.mjs` → `tests/pii-write-guard.test.mjs` → GitHub CI → revisão independente → decisão de entrega.

Status: **proposta de correção**, sem aprovação de gate.
