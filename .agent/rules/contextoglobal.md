---
trigger: always_on
---

[GLOBAL CONTEXTO DO PROJETO]

- Projeto: Dashboard Meta Bihmks (op7-performance-dashboard).
- Objetivo: painel para mostrar desempenho de campanhas Meta para clientes/franqueados, com visão clara de métricas por conta, campanha, período e unidade.
- Stack principal:
  - Frontend: React 19, TypeScript, Vite, TailwindCSS, shadcn-ui, Radix UI.
  - Gráficos: Recharts.
  - Estado remoto e dados: @tanstack/react-query, @tanstack/react-table.
  - Datas: date-fns e date-fns-tz.
- Backend/Dados:
  - Banco: Supabase via SDK e via MCP (supabase-mcp) para acesso estruturado aos dados.
  - Fontes externas/contexto: Firecrawl MCP para buscar documentação e contexto atualizado quando necessário.
- Organização do código:
  - Entrypoints: index.tsx, App.tsx.
  - Estilos globais: index.css, Tailwind (tailwind.config.cjs, postcss.config.cjs).
  - Componentes: pasta /components e subpastas.
  - Lógica compartilhada, tipos e constantes: /src, types.ts, constants.ts, context/, services/, lib/.
- Importante: manter o código consistente com o setup atual de Vite e React, usando TypeScript estrito quando possível.

[RULES GLOBAIS DO AGENTE]

1. Sempre que for implementar uma feature:
   - Identificar claramente se a tarefa é de frontend, backend (lógica de dados) ou database (schema Supabase) e atuar com a skill apropriada.
   - Não quebrar a estrutura existente de App.tsx, tipos globais, constantes e contextos; estender de forma incremental.
   - Manter padrão de componentes reutilizáveis, seguindo shadcn-ui/Radix quando fizer sentido.

2. Banco de dados (skill: database + MCP Supabase):
   - Antes de alterar schema, descrever a mudança em comentários no diff (ex.: nova tabela, novas colunas, índices).
   - Manter nomes de tabelas e colunas consistentes com o padrão já usado (snake_case ou camelCase, conforme estiver no projeto).
   - Quando possível, gerar queries otimizadas pensando em performance dos dashboards (filtros por datas, contas, campanhas).

3. Integração de dados e serviços (skill: backend):
   - Centralizar chamadas de dados em services/ ou em hooks específicos, evitando lógica de fetch dentro de componentes de UI.
   - Utilizar @tanstack/react-query para lidar com cache, loading e error states.
   - Padronizar tipos no arquivo types.ts ou em /types, evitando tipos duplicados espalhados.

4. Frontend e UI (skill: frontend):
   - Criar novos componentes dentro de /components ou subpastas específicas, com nomes claros.
   - Garantir responsividade básica e legibilidade para client-facing dashboards.
   - Reaproveitar componentes e estilos existentes antes de criar algo do zero.

5. Uso de MCPs:
   - Quando precisar entender melhor a linguagem de anúncios Meta, métricas ou termos atuais, usar Firecrawl MCP para buscar contexto em fontes confiáveis.
   - Quando precisar ler/gravar dados no Supabase, usar o MCP do Supabase (quando disponível) ou o SDK já configurado no projeto.

[WORKFLOW GERAL PARA TASKS]

Quando eu (usuário) enviar uma tarefa, ela virá mais ou menos neste formato:

- Contexto de negócio: o que o cliente/franqueado precisa enxergar ou operar no dashboard.
- Tipo de tarefa: frontend, backend, database ou combinação.
- Resultado esperado: o que deve estar funcionando ao final (ex.: novo filtro, novo gráfico, novo card com métrica X).

Seu fluxo de trabalho deve ser:

1) Identificar arquivos relevantes existentes (ex.: App.tsx, components relacionados, hooks, serviços, tipos).
2) Se necessário, criar:
   - Novos componentes em /components/NOME/NomeDoComponente.tsx.
   - Novos hooks em /src/hooks/ ou serviços em /services/.
   - Novos tipos em /types ou no arquivo types.ts.
3) Fazer as alterações passo a passo, com commits lógicos e mensagens claras.
4) Garantir que a UI final:
   - Mostra corretamente os dados vindos do Supabase.
   - Aplica corretamente filtros de datas, contas, campanhas e unidades.
5) Rodar testes básicos (quando existirem) e garantir que o build do Vite não quebre.

Sempre que houver ambiguidade, priorizar decisões que:
- Mantenham o código simples de manter.
- Sigam o padrão já estabelecido no projeto.
- Deixem claro o que é específico de Meta Ads versus o que é genérico de BI.

[FIM DAS RULES INICIAIS]
