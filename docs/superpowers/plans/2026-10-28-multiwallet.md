# Multi-carteira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user add up to 3 EVM wallets, see their holdings summed into one portfolio, and switch each wallet on or off.

**Architecture:** `WalletService` becomes a list of per-wallet states, each with its own `/api/tokens` request. Computed signals merge the wallets that are switched on into the same `status`/`tokens`/`totalValueUsd`/`failedChains` the dashboard already reads. Pure helpers (`mergeTokens`, `portfolioStatus`) do the merging. A new presentational `WalletCardsComponent` shows one card per wallet. The server does not change.

**Tech Stack:** Angular 22 standalone + Signals (`computed`, `linkedSignal`), RxJS, Vitest through `@angular/build:unit-test`.

**Spec:** `docs/superpowers/specs/2026-10-28-multiwallet-design.md`

## Global Constraints

- Max 3 wallets (`MAX_WALLETS = 3`). EVM only, validated with `isValidEvmAddress` from `shared/address.ts`.
- Nothing is persisted: no localStorage or sessionStorage for wallets.
- `/api/tokens` and everything under `server/` and `api/` stay unchanged.
- Duplicate detection compares addresses in lowercase. Copy: `Essa carteira já foi adicionada.`
- Short address format: `0x` + next 4 chars + `…` + last 4 → `0xd8dA…6045`.
- Per-request timeout stays `REQUEST_TIMEOUT_MS = 15_000`. Removing or retrying a wallet cancels only that wallet's request.
- Merged token rows are keyed by `TokenItem.id`, with `balance` and `valueUsd` summed, sorted by `valueUsd` descending.
- UI copy is pt-BR. Code and comments follow the existing style: English identifiers, short pt-BR doc comments.
- Never stage `angular.json`: it has an unrelated local change. Use explicit `git add <files>`.
- Test command: `npx ng test --watch=false` (one file: add `--include <path>`).

## Review Focus

1. **Same address in a different case** (`0xD8DA…` after `0xd8da…`) → refused as a duplicate. Tests: Task 2 (`add` returns `'duplicate'`) and Task 3 (error shown).
2. **Wallet removed while its request is in flight** → the late response is ignored, and nothing comes back. Test: Task 2 (`cancels the request of a removed wallet`).
3. **Same address removed and then added again** → loads fresh and works normally. Test: Task 2.
4. **A token held in a wallet that is switched off** → left out of the merged row and the total. Test: Task 2 (`merges only enabled wallets`).
5. **Selected chain filter loses all its tokens after a toggle** → filter falls back to "Todas". Test: Task 5.

---

### Task 1: Pure helpers — short address, token merge, portfolio status

**Files:**
- Modify: `src/app/core/format.ts`, `src/app/core/format.spec.ts`
- Create: `src/app/core/portfolio.ts`, `src/app/core/portfolio.spec.ts`
- Also commit: `.gitignore` (already has `.superpowers/`), the spec, and this plan

**Interfaces:**
- Produces:
  - `shortAddress(address: string): string` in `format.ts`
  - In `portfolio.ts`:
    ```ts
    export type WalletLoadStatus = 'loading' | 'success' | 'empty' | 'error';
    export type PortfolioStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
    export interface WalletState {
      address: string;          // as typed by the user
      enabled: boolean;
      status: WalletLoadStatus;
      tokens: TokenItem[];
      totalValueUsd: number;
      failedChains: ChainId[];
    }
    export function mergeTokens(lists: TokenItem[][]): TokenItem[];
    export function portfolioStatus(enabled: WalletState[], walletCount: number): PortfolioStatus;
    ```

- [ ] **Step 1: Write failing tests**

`format.spec.ts`: `shortAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')` → `'0xd8dA…6045'`.

`portfolio.spec.ts`:
- `mergeTokens` sums the same id: two `ethereum:native` items (balance 0.2/value 920 and balance 0.3/value 1380) → one item with balance 0.5, valueUsd 2300, and the priceUsd/symbol/logo of the first.
- `mergeTokens` keeps different chains apart (`ethereum:native` and `base:native` → 2 rows).
- `mergeTokens` sorts by valueUsd descending, and `mergeTokens([])` → `[]`.
- `portfolioStatus([], 0)` → `'idle'`.
- Any `success` → `'success'`, even while another is `loading` or `error`.
- No success and one `loading` → `'loading'`.
- `error` + `empty` with none loading → `'error'` (error wins over empty).
- All `empty` → `'empty'`.

- [ ] **Step 2: Run, expect FAIL**

Run: `npx ng test --watch=false --include src/app/core/portfolio.spec.ts --include src/app/core/format.spec.ts`
Expected: FAIL (module/function not found).

- [ ] **Step 3: Implement**

`mergeTokens` uses a `Map<string, TokenItem>`, copying the first item and adding up `balance`/`valueUsd`. `portfolioStatus` returns `'idle'` when `walletCount === 0`, then checks success → loading → error → empty, in that order.

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add .gitignore docs/superpowers/specs/2026-10-28-multiwallet-design.md docs/superpowers/plans/2026-10-28-multiwallet.md src/app/core/format.ts src/app/core/format.spec.ts src/app/core/portfolio.ts src/app/core/portfolio.spec.ts
git commit -m "feat: add portfolio merge helpers for multi-wallet"
```

---

### Task 2: `WalletService` holds up to 3 wallets

**Files:**
- Modify: `src/app/core/wallet.service.ts` (rewrite), `src/app/core/wallet.service.spec.ts` (rewrite)

**Interfaces:**
- Consumes: Task 1 `WalletState`, `PortfolioStatus`, `mergeTokens`, `portfolioStatus`.
- Produces (public API of `WalletService`):
  ```ts
  export const MAX_WALLETS = 3;
  export type AddResult = 'added' | 'duplicate' | 'full';
  readonly wallets: Signal<WalletState[]>;        // in order added
  readonly status: Signal<PortfolioStatus>;       // over enabled wallets
  readonly tokens: Signal<TokenItem[]>;           // merged, enabled + success only
  readonly totalValueUsd: Signal<number>;         // sum of those wallets' totalValueUsd
  readonly failedChains: Signal<ChainId[]>;       // union, enabled + success, CHAINS order
  readonly failedWallets: Signal<WalletState[]>;  // enabled with status 'error'
  readonly loadedCount: Signal<number>;           // enabled with status success|empty
  add(address: string): AddResult;
  remove(address: string): void;
  toggle(address: string): void;
  retry(address: string): void;
  retryFailed(): void;                            // enabled wallets with error or failedChains
  ```
  `WalletStatus` is removed. Re-export `PortfolioStatus` from `wallet.service.ts` as `WalletStatus` so the dashboard spec import keeps compiling: `export type { PortfolioStatus as WalletStatus } from './portfolio';`.

- [ ] **Step 1: Write failing tests** (keep the `HttpTestingController` setup and `expectTokensRequest` helper)

- `starts with no wallets and idle status`.
- `add requests the proxy and marks the wallet loading`: `add(A)` → `'added'`, `wallets()[0]` is `{address: A, enabled: true, status: 'loading'}`, status `'loading'`.
- `exposes a wallet's tokens and total on success`, and `empty` for `tokens: []`.
- `rejects a duplicate address in any case`: `add(A)` then `add(A.toUpperCase().replace('0X','0x'))` → `'duplicate'`, a single request.
- `refuses a fourth wallet`: three adds, then the fourth returns `'full'` with no request.
- `merges only enabled wallets`: A and B both have ETH (920 and 1380) → `tokens()` is one ETH row worth 2300, total 2300. `toggle(B)` → 920, and no new request.
- `does not disable the last enabled wallet`: only A, `toggle(A)` → still enabled.
- `removing the last enabled wallet enables the first remaining one`: A, B, C. Toggle A and B off, remove C → A enabled.
- `cancels the request of a removed wallet`: `add(A)`, `remove(A)` → `expectTokensRequest(A)` is cancelled (`req.cancelled === true`), and `wallets()` is `[]`.
- `re-adding a removed address loads it again`.
- `keeps other wallets when one fails`: A succeeds, B errors → status `'success'`, `failedWallets()` is [B], `loadedCount()` is 1.
- `unions failed chains of enabled wallets`: A `['linea']`, B `['linea','scroll']` → `['linea','scroll']`.
- `retry reloads only that wallet` and `retryFailed reloads errored and partial enabled wallets` (one new request each, nothing for healthy wallets).
- `times out after REQUEST_TIMEOUT_MS` → that wallet `'error'` (port the existing fake-timer test).

- [ ] **Step 2: Run, expect FAIL**

Run: `npx ng test --watch=false --include src/app/core/wallet.service.spec.ts`

- [ ] **Step 3: Implement**

Keep `private readonly _wallets = signal<WalletState[]>([])` and a `Map<string, Subscription>` keyed by lowercase address. A private `fetch(address)` cancels any existing subscription for that key, sets the wallet to `loading` with cleared data, and on response patches only that wallet, found by lowercase address. If the wallet is gone, there is nothing to patch. The aggregate signals are `computed` from `_wallets` filtered to `enabled`.

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit** — `feat: track up to three wallets in WalletService`

---

### Task 3: `WalletInputComponent` adds wallets

**Files:**
- Modify: `src/app/features/wallet-input/wallet-input.component.{ts,html}`, `wallet-input.component.spec.ts`

**Interfaces:**
- New inputs: `addresses = input<string[]>([])` and `max = input(3)`. Keep `disabled` and `addressSubmit` as they are.
- Behavior:
  - When `addresses().length >= max()`, the field and button are disabled.
  - Placeholder:
    - `0x…` when there are no wallets
    - `Adicionar carteira (N de 3)` when 1–2 have been added
    - `3 de 3 carteiras` when full
  - Button label: `Ver carteira` with no wallets, `Adicionar` otherwise.
  - A duplicate (lowercase compare) shows `Essa carteira já foi adicionada.` and does not emit.
  - After a valid emit, the field clears.

- [ ] **Step 1: Failing tests**

- `refuses an address already added, in any case`
- `clears the field after a valid submit`
- `disables the field when the limit is reached` (3 addresses → `input.disabled === true`)
- `shows the wallet count in the placeholder` (1 address → `'Adicionar carteira (1 de 3)'`)
- Keep the existing tests passing.

- [ ] **Step 2: Run, expect FAIL** — `npx ng test --watch=false --include src/app/features/wallet-input/wallet-input.component.spec.ts`
- [ ] **Step 3: Implement** — add `computed` placeholder, label and `full`. On success, `value.set('')`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `feat: let the address input add multiple wallets`

---

### Task 4: `WalletCardsComponent`

**Files:**
- Create: `src/app/features/wallet-cards/wallet-cards.component.{ts,html,scss,spec.ts}`

**Interfaces:**
- Consumes: `WalletState` (Task 1), `shortAddress` and `formatUsd` (`format.ts`).
- Produces: selector `app-wallet-cards`
  - Input: `wallets = input.required<WalletState[]>()`
  - Outputs: `toggle = output<string>()`, `remove = output<string>()`, `retry = output<string>()`. Each emits the address.
- Each card (`data-testid="wallet-card"`) contains:
  - A checkbox labeled with the short address (`aria-label="Incluir 0xd8dA…6045 no total"`). It is disabled when this is the only enabled wallet.
  - A ✕ button (`aria-label="Remover 0xd8dA…6045"`).
  - A body that depends on the wallet's status:
    - `loading`: skeleton (`data-testid="wallet-card-loading"`)
    - `error`: `Não foi possível carregar` plus a `Tentar novamente` button
    - otherwise: `formatUsd(totalValueUsd)` (`data-testid="wallet-card-total"`)
  - Disabled cards get the class `wallet-card--off` (opacity ~0.45).
- Layout: flex row with `flex-wrap`, cards `flex: 1 1 180px`. Reuse the tokens from `dashboard.component.scss` (`--surface`, `--border`, `--accent`, the `.skeleton` look) so mobile stacks without horizontal scroll.

- [ ] **Step 1: Failing tests**
  - Renders one card per wallet with the short address and `$920.00`.
  - Checkbox click emits `toggle` with the address, and ✕ emits `remove`.
  - The only enabled wallet's checkbox is disabled.
  - Loading and error states render, and `Tentar novamente` emits `retry`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `feat: add wallet cards with per-wallet totals`

---

### Task 5: Dashboard wiring

**Files:**
- Modify: `src/app/features/dashboard/dashboard.component.{ts,html}`, `dashboard.component.spec.ts`

**Interfaces:**
- Consumes: the Task 2 service API, Task 3 inputs, and the Task 4 component.

**Changes:**
- **Input:** `<app-wallet-input [addresses]="addresses()" (addressSubmit)="onAddress($event)" />`. `addresses = computed(() => wallet.wallets().map(w => w.address))`. Drop the `disabled` binding.
- **Cards:** render `<app-wallet-cards>` under the hero whenever `wallet.wallets().length > 0`. Wire `toggle` → `wallet.toggle`, `remove` → `onRemove` (`wallet.remove` + filter reset), `retry` → `wallet.retry`.
- **`onAddress`:** `selectedChain.set('all')`, then `wallet.add(address)`.
- **`selectedChain`:** becomes `linkedSignal<Partial<Record<ChainId, number>>, ChainSelection>({ source: this.chainCounts, computation: (counts, prev) => prev && prev.value !== 'all' && counts[prev.value] ? prev.value : 'all' })`. When the selected chain disappears, it falls back to `'all'`.
- **Failed-wallet banner:** when `wallet.status() === 'success' && wallet.failedWallets().length > 0`, show `<div class="banner banner--warning" role="status" data-testid="failed-wallets">` with `Não foi possível carregar {{ failedWalletNames() }}. O total pode estar incompleto.` and `Tentar novamente` → `wallet.retryFailed()`. `failedWalletNames` = `LIST_FORMAT.format(failedWallets().map(w => shortAddress(w.address)))`.
- **Retry buttons:** the existing partial-chain banner and the error banner switch from `wallet.retry()` to `wallet.retryFailed()`.
- **`summaryCaption`:** when `wallet.wallets().length > 1`, prefix it with `${loadedCount} de ${wallets.length} carteiras · `.
  - Example: `2 de 3 carteiras · Ativos em 4 redes`.
  - With one wallet, keep today's text.
- **Tagline:** mention up to 3 wallets, e.g. `Cole até 3 endereços públicos para ver seus ativos somados em {{ chainCount }} redes EVM…`.
- **Test fake:** update `FakeWalletService` to match the Task 2 API (`wallets`, `failedWallets`, `loadedCount` signals, plus `add`/`remove`/`toggle`/`retry`/`retryFailed` as `vi.fn`).

- [ ] **Step 1: Failing tests**
  - `adds the wallet when a valid address is submitted` → `wallet.add` is called with the address.
  - `renders a card per wallet`.
  - `shows the failed-wallet banner naming the short address` → text contains `0x1a2B…9f3c`, and the button calls `retryFailed`.
  - `prefixes the caption with the wallet count when there are several wallets` → `'2 de 3 carteiras · Ativos em 1 rede'`.
  - `falls back to all chains when the selected chain loses its tokens`: set tokens to ETH + a Base token, click `chip-base`, then set tokens to ETH only → the `chip-all` button has `aria-pressed="true"`.
  - Update the existing tests that called `load`/`retry`.
- [ ] **Step 2: Run, expect FAIL** — `npx ng test --watch=false --include src/app/features/dashboard/dashboard.component.spec.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run the full suite, expect PASS** — `npx ng test --watch=false`
- [ ] **Step 5: Commit** — `feat: show summed multi-wallet portfolio on the dashboard`

---

### Task 6: Mock second wallet, docs, final check

**Files:**
- Modify: `src/app/mock/mock-portfolio.ts`, `src/app/mock/mock-tokens.interceptor.ts`, `src/app/mock/mock-tokens.interceptor.spec.ts`, `README.md`, `docs/backlog.md`

**Changes:**
- **Second mock portfolio:** `export const MOCK_SECOND_PORTFOLIO: TokensResponse`, built with the same `token()` helper. It holds `ethereum:native` ETH 0.8, `ethereum` USDC (same contract) 1500, `base:native` ETH 0.1, and `optimism` OP 300. That gives tokens in common with `MOCK_PORTFOLIO`.
- **Interceptor:** `export const MOCK_SECOND_ADDRESS = '0x00000000000000000000000000000000000000b2';` returns that portfolio.
- **Interceptor test:** `serves the second portfolio for MOCK_SECOND_ADDRESS`.
- **README:** add a "Multi-carteira" feature bullet: up to 3 carteiras, total somado, cartões com valor de cada uma e liga/desliga, sem salvar nada.
- **`docs/backlog.md`:** remove the "Multi-carteira" item and add "Salvar carteiras por usuário (depende de login)".

- [ ] **Step 1: Failing interceptor test**, then run it and expect FAIL
- [ ] **Step 2: Implement the mock**, then run the suite and expect PASS: `npx ng test --watch=false`
- [ ] **Step 3: Build** — `npx ng build` succeeds with no new warnings
- [ ] **Step 4: Manual check** — `npm run start:mock`. Add any address plus `MOCK_SECOND_ADDRESS` plus `MOCK_ERROR_ADDRESS`. Confirm:
  - ETH rows are summed.
  - The failed-wallet banner appears.
  - Toggling recalculates the total.
  - At 320px width there is no horizontal scroll.
- [ ] **Step 5: Commit** — `docs: document multi-wallet and add second mock wallet`
