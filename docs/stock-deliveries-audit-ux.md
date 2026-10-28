# FTB — Entrega escolar, análise de stock e identificação nominal na auditoria

## Entregas de bens
- Em Nova entrega de bens, se Destino = Escola, apresentar o dropdown de escolas ativas devolvido pela API administrativa /api/area/schools.
- Guardar escolaCodigo como referência da escola; apresentar destinoNome canónico vindo da base de dados, sem aceitar nomes livres enviados pelo cliente.
- Se o destino for Outra entidade, manter o nome de entidade editável.
- Backend bloqueia escolas inexistentes/inativas e valida novamente no momento da confirmação; as saídas de stock continuam transacionais e auditadas.

## Stock disponível
- Novo tab Stock disponível na barra de Gestão da Fundação, condicionado ao módulo de Doações materiais.
- Tabela central com filtro disponíveis/esgotados/categoria, pesquisa, ordenação e paginação; detalhes do lote e histórico de movimentos no painel lateral.
- Mostrar saldo confirmado (recebido - entregue), não reservar quantidades para guias pendentes; quantidades são agrupadas por unidade, nunca somadas entre kg e unidades.
- API administrativa /api/area/material-stock e /api/area/material-stock/[id]/movements, respostas no-store, acesso exclusivo ao administrador.
- Limite atual da consulta: primeiros 500 lotes. Quando exceder, assinalar que totais são parciais até implementação de paginação paginada de servidor.

## Auditoria
- A coluna Por e os detalhes mostram o nome atual da conta Firebase Authentication (displayName), ou email caso não haja nome.
- O UID técnico continua nos detalhes para rastreabilidade histórica. Autores de contas apagadas aparecem como Utilizador não identificado; eventos públicos anónimos surgem como Anónimo.
- O mapeamento de UID para nome ocorre apenas na resposta da API administrativa, sem reescrever eventos imutáveis nem criar índices de nomes pessoais na coleção de auditoria.

## Testes
- Ficha familiar: validação dos campos do questionário, dados cifrados por documento, revisões imutáveis, conflitos por expectedRevision e auditoria.
- Entrega escolar: seleção de escolas ativas e uso do nome canónico.
- Stock: quantidades por unidade; integridade das transações existentes no Firestore Emulator.
- Auditoria: resolução dos nomes com fallback, sem perder UID.

**Estado de rollout:** este PR não ativa automaticamente a nova flag de avaliação familiar (FTB_FAMILY_ASSESSMENTS_ENABLED), dada a presença de dados especiais sobre saúde e menores; requer validação jurídica e de proteção de dados antes de usar dados reais.