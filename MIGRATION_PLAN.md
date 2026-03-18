# Plano de Migração: Filtros, Grupos e Resumo Gerencial

> Migrar do projeto `dashboard_meta_google_bihmks` para `Dahboard_op7_OLD`
> Testar cada passo antes de avançar. Não avançar se houver erro.

---

## Visão Geral

### O que será migrado (em ordem)

| Passo | O que | Arquivo(s) destino |
|-------|-------|--------------------|
| 1 | Entidade Cluster + tipos | `src/entities/cluster/` |
| 2 | `useFilters` expandido (cluster + accounts[]) | `src/features/filters/model/useFilters.tsx` |
| 3 | `AccountGroupsTab` no Settings | `src/features/cluster-management/ui/AccountGroupsTab.tsx` |
| 4 | Widgets: `ClusterBreakdown` + `ClusterRanking` | `src/widgets/Cluster*/` |
| 5 | Header: dropdown de grupo + unidades | `components/DashboardHeader.tsx` |
| 6 | `SummaryView` completo com cluster | `src/pages/SummaryView.tsx` (substituir re-export) |
| 7 | App.tsx: conectar effectiveAccountIds | `App.tsx` |
| 8 | Settings: adicionar aba Grupos de Contas | `components/SettingsView.tsx` |

---

## Dependências Supabase (verificar antes de tudo)

O projeto fonte usa as mesmas tabelas. Verificar se existem no Supabase do projeto destino:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clusters', 'cluster_accounts');

-- Se não existirem, criar:
CREATE TABLE IF NOT EXISTS clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cluster_accounts (
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  PRIMARY KEY (cluster_id, account_id)
);
```

**Checklist Passo 0:**
- [ ] Tabelas `clusters` e `cluster_accounts` existem no Supabase
- [ ] RLS habilitada (pode copiar policy do projeto fonte)

---

## Passo 1 — Entidade Cluster

### Criar: `src/entities/cluster/model/types.ts`

```typescript
export interface Cluster {
    id: string;
    name: string;
    created_at: string;
    cluster_accounts?: { account_id: string }[];
}

export interface ClusterAccount {
    cluster_id: string;
    account_id: string;
}
```

### Criar: `src/entities/cluster/api/useClusters.ts`

Copiar de `dashboard_meta_google_bihmks/src/entities/cluster/api/useClusters.ts`
com ajuste no import do supabaseClient (usar o path do projeto atual).

Dependências: `@tanstack/react-query` (já instalado), `supabase` client.

### Criar: `src/entities/cluster/index.ts`

```typescript
export { useClusters, useClusterAccounts, useManageClusters } from './api/useClusters';
export type { Cluster, ClusterAccount } from './model/types';
```

**Checklist Passo 1:**
- [ ] Arquivo types.ts criado
- [ ] useClusters.ts criado + imports corrigidos
- [ ] index.ts criado
- [ ] `npm run build` sem erro de TS nos novos arquivos

---

## Passo 2 — useFilters expandido

### Arquivo: `src/features/filters/model/useFilters.tsx`

**Mudanças em relação ao atual:**
- `selectedAccount: string` → `selectedAccounts: string[]` (array, [] = todas)
- Adicionar: `selectedCluster: string` ('ALL' = nenhum grupo)
- Adicionar: `selectedPlatform: string` ('ALL' = todas)
- Persistência no localStorage (chaves existentes + novas)

**Regra de negócio:**
- Quando `selectedCluster` muda → resetar `selectedAccounts` para []
- `selectedAccounts = []` significa "todas as contas do cluster/grupo atual"

**localStorage keys:**
```
op7_account_filter   → JSON.stringify(string[])   (era string)
op7_cluster_filter   → string
op7_platform_filter  → string
op7_date_range       → JSON (sem mudança)
```

**Atenção:** Todos os lugares que usam `selectedAccount` (singular) precisam ser atualizados para `selectedAccounts`.

**Arquivos que consomem `useFilters` hoje (verificar antes de implementar):**
- `App.tsx` — usa `selectedAccount`
- `components/DashboardHeader.tsx` — passa como prop
- `src/pages/SummaryView.tsx` — (atualmente re-export, ainda não usa)
- `src/pages/ManagerialView.tsx` — (verificar)

**Checklist Passo 2:**
- [ ] useFilters.tsx atualizado
- [ ] App.tsx atualizado (selectedAccount → selectedAccounts)
- [ ] DashboardHeader.tsx props atualizadas
- [ ] Testar: trocar conta no header → estado correto no console
- [ ] Testar: localStorage salva e restaura ao recarregar

---

## Passo 3 — AccountGroupsTab no Settings

### Criar: `src/features/cluster-management/ui/AccountGroupsTab.tsx`

Copiar de `dashboard_meta_google_bihmks/src/features/cluster-management/ui/AccountGroupsTab.tsx`

**Ajustes necessários:**
- Import `useSettingsData` → verificar se o context já existe ou adaptar para usar `metaAccounts` passado como prop
- Imports de `useClusters` → usar path do Passo 1
- O campo `display_name` substituindo `nome_ajustado`/`nome_original` (as linhas 145-160 já têm fallback para ambos)

**Checklist Passo 3:**
- [ ] AccountGroupsTab.tsx criado
- [ ] Imports resolvidos sem erro
- [ ] Testar isolado: renderiza sem crash

---

## Passo 4 — Widgets Cluster

### Criar: `src/widgets/ClusterBreakdown/ui/ClusterBreakdown.tsx`
### Criar: `src/widgets/ClusterBreakdown/index.ts`
### Criar: `src/widgets/ClusterRanking/ui/ClusterRanking.tsx`
### Criar: `src/widgets/ClusterRanking/index.ts`

**O que é `useFinanceData`?**

ClusterBreakdown e ClusterRanking dependem de `useFinanceData` do projeto fonte.
Verificar se `src/entities/finance/` existe no projeto destino.
- Se existir: usar o existente
- Se não: criar também (ver `src/entities/finance/api/useFinanceData.ts` no fonte)

**ClusterBreakdown** — gráfico de barras CPL + tabela ranking lado a lado
- Usa `recharts` (verificar se já instalado: `package.json`)
- Colunas da tabela: Unidade | Investimento | Resultados | CPL

**ClusterRanking** — tabela de eficiência com posição, medalha, % vs média grupo
- Não usa charts, só Table component
- Precisa de `calculateCPL` e `calculateEfficiency` do finance/lib

**Checklist Passo 4:**
- [ ] `recharts` no package.json (ou instalar)
- [ ] ClusterBreakdown criado e importa corretamente
- [ ] ClusterRanking criado
- [ ] Testar: renderizar com dados zerados (sem crash)

---

## Passo 5 — DashboardHeader com Cluster + Unidades

### Arquivo: `components/DashboardHeader.tsx`

**Novo layout dos filtros (esquerda → direita):**
```
[Todas as Redes ▾] [Grupo/Cluster ▾] [Selecione Unidades ▾] [DatePicker]
```

**"Todas as Redes"** — dropdown simples, por enquanto só Meta (expansão futura Google)
```
options: [{ value: 'ALL', label: 'Todas as Redes' }, { value: 'META', label: 'Meta Ads' }]
```

**"Grupo/Cluster"** — dropdown com lista de clusters + "Todas as Contas"
```
options: [{ value: 'ALL', label: 'Todas as Contas' }, ...clusters.map(c => ({ value: c.id, label: c.name }))]
```
- Quando seleciona grupo → `setSelectedCluster(id)` → reseta selectedAccounts

**"Selecione Unidades"** — multi-select com:
- Opção "Todas as contas (N)" no topo (laranja quando ativo)
- Lista de contas filtradas pelo cluster selecionado (se cluster = ALL, mostra todas client_visibility===true)
- Search/busca inline
- Checkbox visual (CheckSquare / Square)

**Estilo laranja:**
```
bg-orange-500 text-white (opção selecionada "Todas as contas")
```

**Dados:**
- Clusters: via `useClusters()` hook
- Contas do cluster: via `useClusterAccounts(selectedCluster)` quando cluster !== 'ALL'
- `setSelectedAccounts`, `setSelectedCluster`, `setSelectedPlatform` do `useFilters()`

**Checklist Passo 5:**
- [ ] DashboardHeader renderiza sem crash
- [ ] Dropdown "Todas as Redes" funciona
- [ ] Dropdown Cluster lista grupos do Supabase
- [ ] Ao selecionar cluster → unidades filtradas mostram só contas do grupo
- [ ] Multi-select de unidades funciona (checkbox toggle)
- [ ] "Todas as contas" reseta selectedAccounts para []
- [ ] Busca/search dentro do dropdown funciona

---

## Passo 6 — SummaryView completo

### Arquivo: `src/pages/SummaryView.tsx`

**Substituir o re-export** pelo componente completo:

```typescript
// Remover: export { default } from '../../components/SummaryView';
// Implementar o SummaryView do projeto fonte
```

**Estrutura:**
1. Título dinâmico:
   - `selectedCluster !== 'ALL'` → "Visão Consolidada: {NomeGrupo}"
   - `selectedAccounts.length > 0` → "Visão Geral: {NomeConta}"
   - else → "Visão Global (Todas as Contas Ativas)"
2. `<KPISection accountIds={effectiveAccountIds} />`
3. Se cluster ativo → `<ClusterRanking />` + `<ClusterBreakdown />`
4. `<MainCharts accountIds={effectiveAccountIds} />`
5. Tabela de contas com colunas: Conta | Investimento | Compras | Leads | CPL | CPC | CPR | CPM | Freq | Impr | Cliques | Saldo

**`effectiveAccountIds`**: vem do App.tsx como prop (calculado lá)

**Checklist Passo 6:**
- [ ] SummaryView renderiza sem crash (dados zerados OK)
- [ ] Título muda conforme filtro selecionado
- [ ] ClusterBreakdown/Ranking aparecem quando grupo selecionado
- [ ] Tabela de contas ordena ao clicar na coluna
- [ ] Linha de totais correta

---

## Passo 7 — App.tsx: effectiveAccountIds

### Arquivo: `App.tsx`

**Adicionar lógica para calcular `effectiveAccountIds`:**

```typescript
const { selectedAccounts, selectedCluster } = useFilters();
const { data: clusterAccountsList } = useClusterAccounts(
  selectedCluster !== 'ALL' ? selectedCluster : null
);

const effectiveAccountIds = useMemo(() => {
  // 1. Se cluster selecionado e sem contas específicas → usar contas do cluster
  if (selectedCluster !== 'ALL') {
    const clusterIds = clusterAccountsList?.map(ca => ca.account_id) || [];
    if (selectedAccounts.length > 0) {
      // Intersecção: contas específicas dentro do cluster
      return selectedAccounts.filter(id => clusterIds.includes(id));
    }
    return clusterIds; // Todas as contas do cluster
  }
  // 2. Sem cluster: usar selectedAccounts ([] = todas)
  if (selectedAccounts.length > 0) return selectedAccounts;
  return availableAccounts.map(a => a.account_id); // Todas disponíveis
}, [selectedAccounts, selectedCluster, clusterAccountsList, availableAccounts]);
```

**Passar `effectiveAccountIds` para:**
- `SummaryView`
- `ManagerialView`
- demais views que filtram por conta

**Checklist Passo 7:**
- [ ] effectiveAccountIds calculado corretamente
- [ ] Selecionar grupo → SummaryView carrega dados só do grupo
- [ ] Selecionar unidade específica → filtra corretamente
- [ ] "Todas" → todas as contas visíveis aparecem

---

## Passo 8 — Settings: aba Grupos de Contas

### Arquivo: `components/SettingsView.tsx` (ou SettingsPage)

**Adicionar tab "Grupos de Contas" entre "Cadastro Categorias" e "Usuários e Acesso":**

```
Contas de Anúncio | Cadastro Categorias | [Grupos de Contas] | Usuários e Acesso
```

**Importar e renderizar `<AccountGroupsTab />`** na nova aba.

**Garantir que `AccountGroupsTab` recebe as contas disponíveis:**
- Via context `SettingsDataContext` se existir
- Ou via prop direta `accounts={metaAccounts}`

**Checklist Passo 8:**
- [ ] Aba "Grupos de Contas" aparece no Settings
- [ ] Criar grupo → aparece na lista
- [ ] Clicar no grupo → painel direito abre
- [ ] Toggle conta → salva e persiste no Supabase
- [ ] Deletar grupo → remove com confirmação

---

## Checklist Final de Integração

- [ ] Criar grupo "Teste" → selecionar 2 contas
- [ ] No header: selecionar o grupo "Teste"
- [ ] "Selecione Unidades" mostra só as 2 contas do grupo
- [ ] SummaryView título: "Visão Consolidada: Teste"
- [ ] ClusterBreakdown/Ranking aparecem com dados das 2 contas
- [ ] Selecionar "Todas as Contas" → volta para visão global
- [ ] Recarregar página → filtros restaurados do localStorage

---

## Notas Técnicas

### Componentes UI já disponíveis no destino
Verificar em `components/ui/`:
- `table.tsx` — provavelmente existe
- `skeleton.tsx` — pode não existir (criar se necessário)
- `card.tsx` — pode não existir

### Recharts
Verificar `package.json` do destino. Se não tiver:
```bash
npm install recharts
```

### @tanstack/react-query
Verificar se QueryClient está no `main.tsx`. O App.tsx já usa `useQuery` então deve estar OK.

### Supabase client path
O destino usa: `./services/supabaseClient` ou `@/services/supabaseClient`
Ajustar imports ao copiar arquivos do fonte.

---

## Status de Implementação ✅

| Passo | Status | Arquivo |
|-------|--------|---------|
| 1 | ✅ DONE | `src/entities/cluster/model/types.ts` + `api/useClusters.ts` + `index.ts` |
| 2 | ✅ DONE | `src/features/filters/model/useFilters.tsx` (selectedAccounts[], selectedCluster, selectedPlatform) |
| 3 | ✅ DONE | `src/features/cluster-management/ui/AccountGroupsTab.tsx` |
| 4 | ✅ DONE | `src/widgets/ClusterBreakdown/` + `src/widgets/ClusterRanking/` |
| 5 | ✅ DONE | `components/DashboardHeader.tsx` (dropdowns: Redes / Grupo / Unidades + orange multi-select) |
| 6 | ✅ DONE | `src/pages/SummaryView.tsx` (título dinâmico + ClusterRanking + ClusterBreakdown) |
| 7 | ✅ DONE | `App.tsx` (selectedAccounts[], effectiveAccountIds, useClusterAccounts) |
| 8 | ✅ DONE | `components/SettingsView.tsx` (aba Grupos de Contas adicionada) |

**Dev server:** `http://localhost:3001`
**TS errors nos arquivos novos:** 0

## Checklist Final de Integração (pendente teste manual)

- [ ] Criar grupo "Teste" → selecionar 2 contas
- [ ] No header: selecionar o grupo "Teste"
- [ ] "Selecione Unidades" mostra só as 2 contas do grupo
- [ ] SummaryView título: "Visão Consolidada: Teste"
- [ ] ClusterBreakdown/Ranking aparecem com dados das 2 contas
- [ ] Selecionar "Todas as Contas" → volta para visão global
- [ ] Recarregar página → filtros restaurados do localStorage
