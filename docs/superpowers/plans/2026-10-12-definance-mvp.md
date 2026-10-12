# DeFinance MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard somente-leitura em que o usuário cola um endereço EVM público e vê a lista de tokens (Ethereum + Arbitrum + Base), o valor total em USD e um gráfico de pizza da distribuição — com demo pública no Vercel.

**Architecture:** SPA Angular 22 standalone e zoneless. O estado fica em um `WalletService` baseado em Signals, e um `DashboardComponent` container orquestra componentes presentacionais. Uma única Vercel Function (`GET /api/tokens`) chama a Alchemy Portfolio API em paralelo para as 3 redes, filtra spam/sem preço/poeira e devolve um JSON já consolidado. A API key vive só no servidor. A lógica do proxy fica em `server/` (fora de `api/`, porque o Vercel transforma cada arquivo de `api/` em uma função). Os tipos e a validação de endereço compartilhados entre front e proxy ficam em `shared/`.

**Tech Stack:** Angular 22.2 (standalone, zoneless, Signals, `@defer`), TypeScript 6, Vitest 5 + jsdom (via `ng test`), Vitest em Node (proxy), ng-apexcharts 3.2.0 + apexcharts 8.1.0, Vercel Functions (Node 24, assinatura Web `Request`/`Response`), Alchemy Portfolio API.

**Spec:** [`docs/design.md`](../../design.md) (backlog fora de escopo: [`docs/backlog.md`](../../backlog.md))

## Desvios do spec (revisar antes de executar)

1. **Endpoint Alchemy.** O spec cita "Token Balances + Token Metadata + Prices + Spam List". O plano usa o endpoint Portfolio **Tokens By Wallet** (`POST https://api.g.alchemy.com/data/v1/{apiKey}/assets/tokens/by-address`), que devolve saldo + metadata + preço USD + **token nativo** numa chamada só. O `alchemy_getTokenBalances` não inclui ETH nativo, e combinar 4 APIs por rede seria justamente o risco da Sessão 2. A chamada continua sendo uma por rede, em `Promise.all`, como o spec pede.
2. **Spam.** O endpoint não tem filtro de spam, e a Spam List da Alchemy é da NFT API. O spam é filtrado por heurística no proxy: sem preço USD, erro por token, metadata ausente e valor < US$ 0,01 (poeira).
3. **`TokenItem.id`** (`"<chain>:<contrato|native>"`) foi adicionado ao contrato para dar chave estável em listas (`@for track`).
4. **Gráfico:** soma o mesmo símbolo entre redes (ETH em 3 chains = 1 fatia) e agrupa o que passa de 6 fatias em "Outros". O tipo é `donut` do ApexCharts (família pizza).
5. **Cache CDN:** o proxy responde com `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` para poupar CU da Alchemy em demos repetidas.

## Global Constraints

- Angular **22.2.x**, sempre via `npx` (CLI local do projeto). O `ng` global da máquina é 20.3: **nunca use `ng` sem `npx`**.
- Node **24** local (v24.15.0) e no Vercel (`"engines": { "node": "24.x" }`).
- Componentes standalone, app zoneless (padrão do CLI 22), estado com Angular Signals, **sem lib de estado**.
- Produto 100% somente-leitura: nunca pedir chave privada, nunca conectar wallet.
- Redes: `ethereum`, `arbitrum`, `base` → slugs Alchemy `eth-mainnet`, `arb-mainnet`, `base-mainnet`.
- `ALCHEMY_API_KEY` existe **só** como env var do servidor: nunca em `src/`, nunca em corpo de resposta, nunca em log, nunca commitada (`.env*.local` no `.gitignore` e no `.vercelignore`).
- Regex de endereço, exata: `^0x[a-fA-F0-9]{40}$`.
- Moeda: só USD, formatada com `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- Copy da UI em português (pt-BR), `<html lang="pt-BR">`.
- Gráfico: `ng-apexcharts@3.2.0` + `apexcharts@8.1.0` (versões exatas).
- Nomes de classe conforme o spec: `WalletInputComponent`, `DashboardComponent`, `PortfolioSummaryComponent`, `TokenListComponent`, `PortfolioChartComponent`, `WalletService`. Arquivos em `kebab-case.component.ts`.
- `WalletStatus` é exatamente `'idle' | 'loading' | 'success' | 'empty' | 'error'`.
- Comandos deste plano são **bash** (Git Bash no Windows).
- Testes do front: `npx ng test --watch=false [--include <arquivo>]`. Testes do proxy/shared: `npm run test:node [-- <arquivo>]`.
- Toda mensagem de commit termina com o trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Corte de escopo (spec §8): se a Sessão 2 estourar o tempo, o primeiro corte é a Task 12 (polish visual). **Nunca** corte a Task 13 (estados e robustez).

## Review Focus

1. **Endereço colado com espaço ou quebra de linha** (copiado de explorer/wallet): deve ser aceito depois do `trim`, nunca mostrar "inválido". → testes na Task 3 (input) e na Task 7 (proxy).
2. **Falha parcial da Alchemy** (HTTP 200 com `error.partialErrors`, ou 429 em uma das 3 redes): o proxy responde 502 e o front mostra erro + retry. Nunca um total silenciosamente incompleto. → testes nas Tasks 6 e 7.
3. **Usuário envia outro endereço antes do anterior responder:** só o último resultado aparece e a requisição antiga é cancelada. → teste na Task 8.
4. **Logo ausente ou URL de logo quebrada:** aparecem as iniciais do símbolo, nunca o ícone de imagem quebrada. → testes na Task 9.
5. **Token de preço minúsculo** (memecoin a US$ 0,00001234): o preço aparece com dígitos significativos, nunca "$0.00". → teste na Task 9.

---

## Mapa de arquivos

```
api/
  tokens.ts                         # Entrada Vercel: export GET → handleTokensRequest (fino, sem lógica)
server/
  alchemy-types.ts                  # Tipos do payload da Alchemy Portfolio API
  alchemy-client.ts                 # fetchChainTokens(): HTTP, paginação, dedupe, erro parcial
  alchemy-client.spec.ts
  token-mapper.ts                   # toTokenItems(), buildPortfolio(), toDecimal(): filtros e conversão
  token-mapper.spec.ts
  tokens-handler.ts                 # handleTokensRequest(request, deps): validação, Promise.all, status HTTP
  tokens-handler.spec.ts
  __fixtures__/alchemy-tokens.ts    # Payloads de exemplo da Alchemy para testes
shared/
  address.ts                        # isValidEvmAddress(), usado pelo front e pelo proxy
  address.spec.ts
  token.ts                          # ChainId, CHAINS, CHAIN_LABELS, TokenItem, TokensResponse
src/
  index.html
  styles.scss                       # Tokens de tema, .card, .sr-only, .skeleton
  app/
    app.ts / app.html / app.scss / app.spec.ts     # Shell: <main> + <app-dashboard>
    app.config.ts                                  # provideHttpClient(withFetch())
    core/
      wallet.service.ts / .spec.ts                 # Signals: status, tokens, totalValueUsd; load(), retry()
      format.ts / .spec.ts                         # formatUsd, formatPrice, formatAmount
    testing/
      submit-address.ts                            # Helper de teste: digita e envia o formulário
    features/
      dashboard/dashboard.component.{ts,html,scss,spec.ts}
      wallet-input/wallet-input.component.{ts,html,scss,spec.ts}
      portfolio-summary/portfolio-summary.component.{ts,scss,spec.ts}
      token-list/token-list.component.{ts,html,scss,spec.ts}
      portfolio-chart/chart-data.ts / chart-data.spec.ts
      portfolio-chart/portfolio-chart.component.{ts,html,scss,spec.ts}
vercel.json
.vercelignore
vitest.node.config.ts
tsconfig.server.json
README.md
```

Mapeamento para as sessões do spec: **Sessão 1** = Tasks 1–4 · **Sessão 2** = Tasks 5–9 · **Sessão 3** = Tasks 10–12 · **Sessão 4** = Tasks 13–14.

---

# Sessão 1 — Setup + input + 1º deploy

### Task 1: Scaffold do Angular 22 + shell

**Files:**
- Create (via CLI): `angular.json`, `package.json`, `tsconfig*.json`, `src/**`, `public/favicon.ico`, `.editorconfig`, `.prettierrc`, `.vscode/*`, `README.md`
- Modify: `src/index.html`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`, `src/app/app.spec.ts`, `.gitignore`

**Interfaces:**
- Consumes: nada
- Produces: componente raiz `App` (`selector: 'app-root'`) que renderiza `<main class="app-shell">`. Build em `dist/definance/browser`.

- [ ] **Step 1: Gerar o workspace na raiz do repo (já existe `docs/`, o CLI preserva)**

```bash
npx -y @angular/cli@22.2.2 new definance --directory . --skip-git --style=scss --ssr=false --routing=false --zoneless --ai-config=none --defaults
```

Expected: `CREATE ...` para cada arquivo, depois `✔ Packages installed successfully.` A pasta `docs/` continua intacta.

- [ ] **Step 2: Instalar a lib de gráfico (versões exatas)**

```bash
npm i -E ng-apexcharts@3.2.0 apexcharts@8.1.0
```

Expected: `package.json` com `"ng-apexcharts": "3.2.0"` e `"apexcharts": "8.1.0"`.

- [ ] **Step 3: Ignorar env local e pasta do Vercel no git**

Acrescente ao final de `.gitignore`:

```gitignore

# Local env / Vercel
.env*.local
.vercel
```

- [ ] **Step 4: Escrever o teste do shell (substitui o spec gerado)**

`src/app/app.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the DeFinance shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main.app-shell h1')?.textContent).toContain('DeFinance');
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/app.spec.ts`
Expected: FAIL. O `app.html` gerado é o placeholder do CLI e não tem `main.app-shell`.

- [ ] **Step 6: Implementar o shell**

`src/app/app.ts`:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

`src/app/app.html` (substitui o placeholder inteiro):

```html
<main class="app-shell">
  <h1>DeFinance</h1>
</main>
```

`src/app/app.scss`:

```scss
.app-shell {
  max-width: 1040px;
  margin: 0 auto;
  padding: 56px 16px 72px;
}
```

`src/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>DeFinance</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Veja tokens, valor total e distribuição de qualquer carteira EVM em Ethereum, Arbitrum e Base.">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 7: Rodar testes e build**

Run: `npx ng test --watch=false && npx ng build`
Expected: `Tests  1 passed (1)`, depois `Application bundle generation complete` e o arquivo `dist/definance/browser/index.html` existindo.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Angular 22 app shell with ApexCharts deps" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Validação de endereço compartilhada + infra de testes Node

**Files:**
- Create: `shared/address.ts`, `shared/address.spec.ts`, `vitest.node.config.ts`, `tsconfig.server.json`
- Modify: `package.json` (scripts + devDependency `@types/node`)

**Interfaces:**
- Consumes: nada
- Produces: `isValidEvmAddress(value: string): boolean` em `shared/address.ts`. É estrito: **não** faz trim, e quem chama faz. Scripts `npm run test:node` e `npm run typecheck:server`.

- [ ] **Step 1: Instalar tipos do Node e criar scripts**

```bash
npm i -D @types/node@24
npm pkg set scripts.test:node="vitest run --config vitest.node.config.ts"
npm pkg set scripts.typecheck:server="tsc -p tsconfig.server.json"
```

- [ ] **Step 2: Config do Vitest para código Node (fora de `src/`)**

`vitest.node.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.spec.ts', 'server/**/*.spec.ts'],
  },
});
```

`tsconfig.server.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["api/**/*.ts", "server/**/*.ts", "shared/**/*.ts"]
}
```

- [ ] **Step 3: Escrever o teste que falha**

`shared/address.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isValidEvmAddress } from './address';

describe('isValidEvmAddress', () => {
  it.each([
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    '0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045',
  ])('accepts %s', (address) => {
    expect(isValidEvmAddress(address)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['missing 0x prefix', 'd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['uppercase 0X prefix', '0Xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['39 hex chars', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604'],
    ['41 hex chars', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA960451'],
    ['non-hex char', '0xg8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['surrounding whitespace (callers trim)', ' 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 '],
    ['ENS name', 'vitalik.eth'],
  ])('rejects %s', (_label, address) => {
    expect(isValidEvmAddress(address)).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm run test:node -- shared/address.spec.ts`
Expected: FAIL, porque não resolve `./address`.

- [ ] **Step 5: Implementar**

`shared/address.ts`:

```ts
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/** Valida o formato de um endereço EVM. Estrito: quem chama é responsável pelo trim. */
export function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}
```

- [ ] **Step 6: Rodar testes e typecheck**

Run: `npm run test:node && npm run typecheck:server`
Expected: `Tests  11 passed (11)` e `tsc` sem saída (exit 0).

- [ ] **Step 7: Commit**

```bash
git add shared vitest.node.config.ts tsconfig.server.json package.json package-lock.json
git commit -m "feat: add shared EVM address validation and node test setup" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `WalletInputComponent`

**Files:**
- Create: `src/app/features/wallet-input/wallet-input.component.ts`, `.html`, `.scss`, `.spec.ts`, `src/app/testing/submit-address.ts`

**Interfaces:**
- Consumes: `isValidEvmAddress(value: string): boolean` de `shared/address.ts`
- Produces:
  - `WalletInputComponent` (`selector: 'app-wallet-input'`), com input `disabled: InputSignal<boolean>` (default `false`) e output `addressSubmit: OutputEmitterRef<string>`, que emite o endereço **já com trim** e só se for válido.
  - O DOM tem `<form>`, `<input id="wallet-address">`, `<button type="submit">` e `[data-testid="address-error"]`.
  - Helper de teste `submitAddress(fixture: ComponentFixture<unknown>, text: string): Promise<void>`.

- [ ] **Step 1: Criar o helper de teste**

`src/app/testing/submit-address.ts`:

```ts
import type { ComponentFixture } from '@angular/core/testing';

/** Digita `text` no campo de endereço e envia o formulário. */
export async function submitAddress(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('input#wallet-address')!;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  el.querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}
```

- [ ] **Step 2: Escrever os testes que falham**

`src/app/features/wallet-input/wallet-input.component.spec.ts`:

```ts
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { submitAddress } from '../../testing/submit-address';
import { WalletInputComponent } from './wallet-input.component';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('WalletInputComponent', () => {
  let fixture: ComponentFixture<WalletInputComponent>;
  let emitted: string[];

  const el = () => fixture.nativeElement as HTMLElement;
  const errorText = () =>
    el().querySelector('[data-testid="address-error"]')?.textContent?.trim() ?? null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WalletInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(WalletInputComponent);
    emitted = [];
    fixture.componentInstance.addressSubmit.subscribe((address) => emitted.push(address));
    await fixture.whenStable();
  });

  it('emits a valid address', async () => {
    await submitAddress(fixture, ADDRESS);
    expect(emitted).toEqual([ADDRESS]);
    expect(errorText()).toBeNull();
  });

  it('trims whitespace and line breaks from pasted addresses', async () => {
    await submitAddress(fixture, `  ${ADDRESS}\n`);
    expect(emitted).toEqual([ADDRESS]);
  });

  it('shows an inline error and does not emit for a malformed address', async () => {
    await submitAddress(fixture, '0x123');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.');
    expect(el().querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('asks for an address when submitted empty', async () => {
    await submitAddress(fixture, '   ');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Cole um endereço de carteira.');
  });

  it('explains that ENS names are not supported', async () => {
    await submitAddress(fixture, 'vitalik.eth');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Nomes ENS ainda não são suportados. Cole o endereço 0x.');
  });

  it('clears the error as soon as the user edits the field', async () => {
    await submitAddress(fixture, '0x123');
    const input = el().querySelector('input')!;
    input.value = '0x1234';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(errorText()).toBeNull();
  });

  it('disables the field and the button when disabled', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(el().querySelector('input')!.disabled).toBe(true);
    expect(el().querySelector('button')!.disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/features/wallet-input/wallet-input.component.spec.ts`
Expected: FAIL com erro de build, porque não resolve `./wallet-input.component`.

- [ ] **Step 4: Implementar**

`src/app/features/wallet-input/wallet-input.component.ts`:

```ts
import { Component, input, output, signal } from '@angular/core';
import { isValidEvmAddress } from '../../../../shared/address';

@Component({
  selector: 'app-wallet-input',
  templateUrl: './wallet-input.component.html',
  styleUrl: './wallet-input.component.scss',
})
export class WalletInputComponent {
  readonly disabled = input(false);
  readonly addressSubmit = output<string>();

  protected readonly value = signal('');
  protected readonly error = signal<string | null>(null);

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const address = this.value().trim();

    if (isValidEvmAddress(address)) {
      this.addressSubmit.emit(address);
      return;
    }

    if (address === '') {
      this.error.set('Cole um endereço de carteira.');
    } else if (/\.eth$/i.test(address)) {
      this.error.set('Nomes ENS ainda não são suportados. Cole o endereço 0x.');
    } else {
      this.error.set('Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.');
    }
  }
}
```

`src/app/features/wallet-input/wallet-input.component.html`:

```html
<form class="wallet-form" (submit)="submit($event)" novalidate>
  <label class="sr-only" for="wallet-address">Endereço da carteira</label>
  <input
    id="wallet-address"
    class="address-input"
    type="text"
    name="address"
    placeholder="0x…"
    autocomplete="off"
    spellcheck="false"
    [value]="value()"
    [disabled]="disabled()"
    [attr.aria-invalid]="error() ? true : null"
    [attr.aria-describedby]="error() ? 'wallet-address-error' : null"
    (input)="onInput($event)"
  />
  <button type="submit" class="submit" [disabled]="disabled()">Ver carteira</button>
</form>
@if (error(); as message) {
  <p id="wallet-address-error" class="error" role="alert" data-testid="address-error">{{ message }}</p>
}
```

`src/app/features/wallet-input/wallet-input.component.scss` (estilo mínimo; o polish vem na Task 12):

```scss
:host {
  display: block;
}

.wallet-form {
  display: flex;
  gap: 8px;
}

.address-input {
  flex: 1;
  min-width: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx ng test --watch=false --include src/app/features/wallet-input/wallet-input.component.spec.ts`
Expected: `Tests  7 passed (7)`

- [ ] **Step 6: Commit**

```bash
git add src/app/features/wallet-input src/app/testing
git commit -m "feat: add wallet address input with inline validation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `DashboardComponent` (shell) + primeiro deploy no Vercel

**Files:**
- Create: `src/app/features/dashboard/dashboard.component.ts`, `.html`, `.scss`, `.spec.ts`, `vercel.json`, `.vercelignore`
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts`, `package.json` (engines + devDependency `vercel`)

**Interfaces:**
- Consumes: `WalletInputComponent` (`addressSubmit` output) da Task 3
- Produces: `DashboardComponent` (`selector: 'app-dashboard'`). Nesta task ele só confirma o endereço recebido; na Task 9 passa a consumir o `WalletService`. A URL pública de produção fica registrada para o README (Task 14).

- [ ] **Step 1: Escrever os testes que falham**

`src/app/features/dashboard/dashboard.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DashboardComponent] }).compileComponents();
  });

  it('shows the brand heading and the address input', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('DeFinance');
    expect(el.querySelector('app-wallet-input')).not.toBeNull();
  });

  it('confirms a valid submitted address', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    await submitAddress(fixture, ADDRESS);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="pending-address"]')?.textContent).toContain(ADDRESS);
  });
});
```

Substitua `src/app/app.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the dashboard inside the shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main.app-shell app-dashboard')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false`
Expected: FAIL, porque não resolve `./dashboard.component`.

- [ ] **Step 3: Implementar**

`src/app/features/dashboard/dashboard.component.ts`:

```ts
import { Component, signal } from '@angular/core';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

@Component({
  selector: 'app-dashboard',
  imports: [WalletInputComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly address = signal<string | null>(null);

  protected onAddress(address: string): void {
    this.address.set(address);
  }
}
```

`src/app/features/dashboard/dashboard.component.html`:

```html
<header class="hero">
  <h1 class="brand">DeFinance</h1>
  <p class="tagline">Cole o endereço público de uma carteira para ver seus ativos em Ethereum, Arbitrum e Base.</p>
  <app-wallet-input (addressSubmit)="onAddress($event)" />
</header>

@if (address(); as addr) {
  <p class="hint" data-testid="pending-address">Carteira {{ addr }} pronta para consulta.</p>
}
```

`src/app/features/dashboard/dashboard.component.scss`:

```scss
:host {
  display: block;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
}
```

`src/app/app.ts`:

```ts
import { Component } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

`src/app/app.html`:

```html
<main class="app-shell">
  <app-dashboard />
</main>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx ng test --watch=false`
Expected: todos passam (`App` 1, `WalletInputComponent` 7, `DashboardComponent` 2).

- [ ] **Step 5: Config do Vercel**

```bash
npm i -D -E vercel@63.1.2
npm pkg set engines.node="24.x"
```

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "angular",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/definance/browser"
}
```

`.vercelignore` (garante que a key local nunca sobe junto com o código):

```gitignore
.env*.local
.angular
dist
node_modules
```

- [ ] **Step 6: Login e link (interativo, quem roda é o usuário)**

Peça ao usuário para rodar no prompt:

```
! npx vercel login
```

Depois, rode:

```bash
npx vercel link --yes
```

Expected: `Linked to <conta>/definance`, com a pasta `.vercel/` criada (já ignorada no git).

- [ ] **Step 7: Deploy de produção e verificação**

```bash
npx vercel deploy --prod
```

Expected: o comando imprime a URL de produção (ex.: `https://definance-<hash>.vercel.app`) e o alias `https://definance.vercel.app` ou similar. **Anote a URL de produção** (usada na Task 14).

Verifique:

```bash
curl -s https://<URL-de-produção> | grep -o '<title>DeFinance</title>'
```

Expected: `<title>DeFinance</title>`. Abra a URL no navegador e confirme: o input aparece, `0x123` mostra o erro inline e o endereço válido mostra "pronta para consulta".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard shell and deploy to Vercel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Sessão 2 — Proxy + dados reais

### Task 5: Contrato de dados + mapper Alchemy → `TokenItem`

**Files:**
- Create: `shared/token.ts`, `server/alchemy-types.ts`, `server/__fixtures__/alchemy-tokens.ts`, `server/token-mapper.ts`, `server/token-mapper.spec.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces:
  - `shared/token.ts`: `type ChainId = 'ethereum' | 'arbitrum' | 'base'`, `CHAINS: readonly ChainId[]`, `CHAIN_LABELS: Record<ChainId, string>`, `interface TokenItem { id; chain; symbol; name; logoUrl?; balance; priceUsd; valueUsd }`, `interface TokensResponse { tokens: TokenItem[]; totalValueUsd: number }`
  - `server/alchemy-types.ts`: `AlchemyTokenPrice`, `AlchemyTokenMetadata`, `AlchemyToken`, `AlchemyTokensPage`
  - `server/token-mapper.ts`: `MIN_VALUE_USD = 0.01`, `toTokenItems(raw: AlchemyToken[], chain: ChainId): TokenItem[]`, `buildPortfolio(tokens: TokenItem[]): TokensResponse`, `toDecimal(rawBalance: string, decimals: number): number`
  - Fixtures: `ETH_NATIVE`, `USDC`, `SPAM_NO_PRICE`, `PRICE_WITH_ERROR`, `DUST`, `ZERO_BALANCE`, `NO_METADATA`, `alchemyPage(tokens, pageKey?)`

- [ ] **Step 1: Criar a key da Alchemy (interativo, quem faz é o usuário)**

Peça ao usuário:
1. Em https://dashboard.alchemy.com, criar uma app "DeFinance" com as redes **Ethereum Mainnet**, **Arbitrum Mainnet** e **Base Mainnet** habilitadas.
2. Criar o arquivo `.env.local` na raiz do repo (já ignorado no git e no Vercel) com uma linha: `ALCHEMY_API_KEY=<a key>`.

- [ ] **Step 2: Conferir o shape real da resposta antes de codar (risco nº 1 do spec)**

```bash
set -a; source .env.local; set +a
curl -s -X POST "https://api.g.alchemy.com/data/v1/$ALCHEMY_API_KEY/assets/tokens/by-address" \
  -H 'content-type: application/json' \
  -d '{"addresses":[{"address":"0xd8da6bf26964af9d7eed9e03e53415d37aa96045","networks":["base-mainnet"]}],"withMetadata":true,"withPrices":true,"includeNativeTokens":true,"includeErc20Tokens":true}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('top keys:',Object.keys(j));console.log('data keys:',Object.keys(j.data??{}));console.log('pageKey:',j.data?.pageKey);console.log('count:',j.data?.tokens?.length);console.log(JSON.stringify(j.data?.tokens?.slice(0,2),null,2))})"
```

Expected: `data.tokens[]` com `tokenAddress` (null no nativo), `tokenBalance` (string hex), `tokenMetadata.{decimals,logo,name,symbol}`, `tokenPrices[].{currency,value,lastUpdatedAt}`, `error`, e `data.pageKey`.
**Se algum campo divergir**, ajuste `server/alchemy-types.ts` e os fixtures do Step 3 ao shape real antes de seguir. Nunca imprima a key no terminal.

- [ ] **Step 3: Tipos, contrato e fixtures**

`shared/token.ts`:

```ts
export type ChainId = 'ethereum' | 'arbitrum' | 'base';

export const CHAINS: readonly ChainId[] = ['ethereum', 'arbitrum', 'base'];

export const CHAIN_LABELS: Record<ChainId, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  base: 'Base',
};

export interface TokenItem {
  /** Chave estável: `<chain>:<contrato em minúsculas | native>`. */
  id: string;
  chain: ChainId;
  symbol: string;
  name: string;
  logoUrl?: string;
  /** Já convertido de decimals. */
  balance: number;
  priceUsd: number;
  /** balance * priceUsd */
  valueUsd: number;
}

export interface TokensResponse {
  tokens: TokenItem[];
  totalValueUsd: number;
}
```

`server/alchemy-types.ts`:

```ts
export interface AlchemyTokenPrice {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}

export interface AlchemyTokenMetadata {
  decimals: number | null;
  logo: string | null;
  name: string | null;
  symbol: string | null;
}

export interface AlchemyToken {
  address: string;
  network: string;
  /** `null` para o token nativo da rede. */
  tokenAddress: string | null;
  /** Inteiro em string (hex `0x…` nos exemplos da Alchemy). */
  tokenBalance: string;
  tokenMetadata?: AlchemyTokenMetadata | null;
  tokenPrices?: AlchemyTokenPrice[] | null;
  error?: string | null;
}

export interface AlchemyTokensPage {
  data?: { tokens: AlchemyToken[]; pageKey?: string | null };
  /** Presente só em falha parcial (HTTP 200). */
  error?: { message: string; partialErrors?: { network: string; message: string }[] };
}
```

`server/__fixtures__/alchemy-tokens.ts`:

```ts
import type { AlchemyToken, AlchemyTokensPage } from '../alchemy-types';

const WALLET = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const PRICED_AT = '2025-08-26T20:17:27Z';

/** 0.2 ETH a US$ 4608.2208671202 */
export const ETH_NATIVE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: null,
  tokenBalance: '0x02c68af0bb140000',
  tokenMetadata: {
    decimals: 18,
    logo: 'https://static.alchemyapi.io/images/assets/1027.png',
    name: 'Ethereum',
    symbol: 'ETH',
  },
  tokenPrices: [{ currency: 'usd', value: '4608.2208671202', lastUpdatedAt: PRICED_AT }],
  error: null,
};

/** 100 USDC (6 decimals) a US$ 0.9998, sem logo */
export const USDC: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenBalance: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
  tokenMetadata: { decimals: 6, logo: null, name: 'USD Coin', symbol: 'USDC' },
  tokenPrices: [{ currency: 'usd', value: '0.9998', lastUpdatedAt: PRICED_AT }],
  error: null,
};

export const SPAM_NO_PRICE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x1111111111111111111111111111111111111111',
  tokenBalance: '0x3635c9adc5dea00000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Claim Free Airdrop', symbol: 'FREE-CLAIM' },
  tokenPrices: [],
  error: null,
};

export const PRICE_WITH_ERROR: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x2222222222222222222222222222222222222222',
  tokenBalance: '0x0de0b6b3a7640000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Broken Token', symbol: 'BRKN' },
  tokenPrices: [{ currency: 'usd', value: '1.00', lastUpdatedAt: PRICED_AT }],
  error: 'Token metadata unavailable',
};

/** 1 wei a US$ 1 → poeira */
export const DUST: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x3333333333333333333333333333333333333333',
  tokenBalance: '0x1',
  tokenMetadata: { decimals: 18, logo: null, name: 'Dust Token', symbol: 'DUST' },
  tokenPrices: [{ currency: 'usd', value: '1.00', lastUpdatedAt: PRICED_AT }],
  error: null,
};

export const ZERO_BALANCE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x4444444444444444444444444444444444444444',
  tokenBalance: '0x0',
  tokenMetadata: { decimals: 18, logo: null, name: 'Empty Token', symbol: 'EMPTY' },
  tokenPrices: [{ currency: 'usd', value: '25.00', lastUpdatedAt: PRICED_AT }],
  error: null,
};

export const NO_METADATA: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x5555555555555555555555555555555555555555',
  tokenBalance: '0x0de0b6b3a7640000',
  tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
  tokenPrices: [{ currency: 'usd', value: '3.00', lastUpdatedAt: PRICED_AT }],
  error: null,
};

export function alchemyPage(tokens: AlchemyToken[], pageKey?: string): AlchemyTokensPage {
  return { data: { tokens, pageKey: pageKey ?? null } };
}
```

- [ ] **Step 4: Escrever os testes que falham**

`server/token-mapper.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TokenItem } from '../shared/token';
import {
  DUST,
  ETH_NATIVE,
  NO_METADATA,
  PRICE_WITH_ERROR,
  SPAM_NO_PRICE,
  USDC,
  ZERO_BALANCE,
} from './__fixtures__/alchemy-tokens';
import { buildPortfolio, toDecimal, toTokenItems } from './token-mapper';

describe('toTokenItems', () => {
  it('maps the native token', () => {
    const [eth] = toTokenItems([ETH_NATIVE], 'ethereum');
    expect(eth).toMatchObject({
      id: 'ethereum:native',
      chain: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      logoUrl: 'https://static.alchemyapi.io/images/assets/1027.png',
      balance: 0.2,
      priceUsd: 4608.2208671202,
    });
    expect(eth.valueUsd).toBeCloseTo(921.644, 3);
  });

  it('maps an ERC-20 token with a lowercased contract id and no logo', () => {
    const [usdc] = toTokenItems([USDC], 'ethereum');
    expect(usdc.id).toBe('ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(usdc.balance).toBe(100);
    expect(usdc.valueUsd).toBeCloseTo(99.98, 2);
    expect(usdc.logoUrl).toBeUndefined();
  });

  it('uses the given chain for id and chain field', () => {
    const [eth] = toTokenItems([{ ...ETH_NATIVE, network: 'base-mainnet' }], 'base');
    expect(eth.id).toBe('base:native');
    expect(eth.chain).toBe('base');
  });

  it('drops spam, errored, dust, zero-balance and metadata-less tokens', () => {
    expect(
      toTokenItems([SPAM_NO_PRICE, PRICE_WITH_ERROR, DUST, ZERO_BALANCE, NO_METADATA], 'ethereum'),
    ).toEqual([]);
  });

  it('keeps valid tokens when mixed with junk', () => {
    const symbols = toTokenItems([SPAM_NO_PRICE, ETH_NATIVE, DUST, USDC], 'ethereum').map((t) => t.symbol);
    expect(symbols).toEqual(['ETH', 'USDC']);
  });
});

describe('toDecimal', () => {
  it('converts hex and decimal integer strings', () => {
    expect(toDecimal('0x5f5e100', 6)).toBe(100);
    expect(toDecimal('1500000', 6)).toBe(1.5);
  });

  it('returns 0 for unparseable balances', () => {
    expect(toDecimal('not-a-number', 18)).toBe(0);
  });
});

describe('buildPortfolio', () => {
  it('sums valueUsd into totalValueUsd', () => {
    const tokens = [...toTokenItems([ETH_NATIVE, USDC], 'ethereum')];
    const portfolio = buildPortfolio(tokens);
    expect(portfolio.tokens).toBe(tokens);
    expect(portfolio.totalValueUsd).toBeCloseTo(921.644 + 99.98, 2);
  });

  it('returns zero for an empty wallet', () => {
    expect(buildPortfolio([] as TokenItem[])).toEqual({ tokens: [], totalValueUsd: 0 });
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm run test:node -- server/token-mapper.spec.ts`
Expected: FAIL, porque não resolve `./token-mapper`.

- [ ] **Step 6: Implementar**

`server/token-mapper.ts`:

```ts
import type { ChainId, TokenItem, TokensResponse } from '../shared/token';
import type { AlchemyToken } from './alchemy-types';

/** Abaixo disso o token é poeira: some da lista e do gráfico. */
export const MIN_VALUE_USD = 0.01;

export function toTokenItems(raw: AlchemyToken[], chain: ChainId): TokenItem[] {
  return raw
    .map((token) => toTokenItem(token, chain))
    .filter((item): item is TokenItem => item !== null);
}

export function buildPortfolio(tokens: TokenItem[]): TokensResponse {
  return { tokens, totalValueUsd: tokens.reduce((sum, token) => sum + token.valueUsd, 0) };
}

/** Converte um saldo inteiro (hex `0x…` ou decimal) para unidades do token. */
export function toDecimal(rawBalance: string, decimals: number): number {
  try {
    return Number(BigInt(rawBalance)) / 10 ** decimals;
  } catch {
    return 0;
  }
}

function toTokenItem(token: AlchemyToken, chain: ChainId): TokenItem | null {
  const meta = token.tokenMetadata;
  if (token.error || !meta?.symbol || meta.decimals == null) return null;

  const usd = token.tokenPrices?.find((price) => price.currency.toLowerCase() === 'usd');
  const priceUsd = Number(usd?.value);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  const balance = toDecimal(token.tokenBalance, meta.decimals);
  const valueUsd = balance * priceUsd;
  if (!(valueUsd >= MIN_VALUE_USD)) return null;

  return {
    id: `${chain}:${token.tokenAddress?.toLowerCase() ?? 'native'}`,
    chain,
    symbol: meta.symbol,
    name: meta.name ?? meta.symbol,
    logoUrl: meta.logo ?? undefined,
    balance,
    priceUsd,
    valueUsd,
  };
}
```

- [ ] **Step 7: Rodar testes e typecheck**

Run: `npm run test:node && npm run typecheck:server`
Expected: todos passam (address 11 + mapper 9) e `tsc` sem erros.

- [ ] **Step 8: Commit**

```bash
git add shared/token.ts server
git commit -m "feat: add token contract and Alchemy-to-TokenItem mapper with spam filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cliente Alchemy por rede (paginação + erros)

**Files:**
- Create: `server/alchemy-client.ts`, `server/alchemy-client.spec.ts`

**Interfaces:**
- Consumes: `ChainId` (`shared/token.ts`), `AlchemyToken`, `AlchemyTokensPage` (`server/alchemy-types.ts`), fixtures `ETH_NATIVE`, `USDC`, `alchemyPage` (Task 5)
- Produces: `ALCHEMY_NETWORKS: Record<ChainId, string>`, `MAX_PAGES = 5`, `class AlchemyError extends Error`, `fetchChainTokens(address: string, chain: ChainId, apiKey: string, fetchFn?: typeof fetch): Promise<AlchemyToken[]>`. Lança `AlchemyError` em HTTP não-2xx, em `error` no corpo (falha parcial) ou em `data` ausente.

- [ ] **Step 1: Escrever os testes que falham**

`server/alchemy-client.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ETH_NATIVE, USDC, alchemyPage } from './__fixtures__/alchemy-tokens';
import { AlchemyError, MAX_PAGES, fetchChainTokens } from './alchemy-client';

const ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const API_KEY = 'secret-key';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function requestBody(fetchFn: ReturnType<typeof vi.fn<typeof fetch>>, call: number) {
  return JSON.parse(fetchFn.mock.calls[call][1]!.body as string);
}

describe('fetchChainTokens', () => {
  it('POSTs the wallet and network to the Tokens By Wallet endpoint', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(alchemyPage([ETH_NATIVE])));

    const tokens = await fetchChainTokens(ADDRESS, 'arbitrum', API_KEY, fetchFn);

    expect(tokens).toEqual([ETH_NATIVE]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens/by-address`);
    expect(init?.method).toBe('POST');
    expect(requestBody(fetchFn, 0)).toEqual({
      addresses: [{ address: ADDRESS, networks: ['arb-mainnet'] }],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
      includeErc20Tokens: true,
    });
  });

  it('follows pageKey until the last page', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(alchemyPage([ETH_NATIVE], 'page-2')))
      .mockResolvedValueOnce(jsonResponse(alchemyPage([USDC])));

    const tokens = await fetchChainTokens(ADDRESS, 'ethereum', API_KEY, fetchFn);

    expect(tokens).toEqual([ETH_NATIVE, USDC]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchFn, 1).pageKey).toBe('page-2');
  });

  it(`stops after ${MAX_PAGES} pages and ignores tokens repeated across pages`, async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(alchemyPage([ETH_NATIVE], 'again')));

    const tokens = await fetchChainTokens(ADDRESS, 'ethereum', API_KEY, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(MAX_PAGES);
    expect(tokens).toEqual([ETH_NATIVE]);
  });

  it('throws AlchemyError on a non-2xx response such as a rate limit', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({ message: 'Too Many Requests' }, 429));

    await expect(fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn)).rejects.toThrow(AlchemyError);
  });

  it('throws AlchemyError on a partial failure reported with HTTP 200', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        data: { tokens: [ETH_NATIVE], pageKey: null },
        error: { message: 'Partial failure', partialErrors: [{ network: 'base-mainnet', message: 'timeout' }] },
      }),
    );

    await expect(fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn)).rejects.toThrow(AlchemyError);
  });

  it('never puts the API key in error messages', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({}, 500));

    const error = await fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AlchemyError);
    expect((error as Error).message).not.toContain(API_KEY);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:node -- server/alchemy-client.spec.ts`
Expected: FAIL, porque não resolve `./alchemy-client`.

- [ ] **Step 3: Implementar**

`server/alchemy-client.ts`:

```ts
import type { ChainId } from '../shared/token';
import type { AlchemyToken, AlchemyTokensPage } from './alchemy-types';

export const ALCHEMY_NETWORKS: Record<ChainId, string> = {
  ethereum: 'eth-mainnet',
  arbitrum: 'arb-mainnet',
  base: 'base-mainnet',
};

/** Limite de páginas por rede: protege CU e tempo de resposta em carteiras gigantes. */
export const MAX_PAGES = 5;

export class AlchemyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlchemyError';
  }
}

/** Busca todos os tokens (nativo + ERC-20, com metadata e preço) de uma carteira em uma rede. */
export async function fetchChainTokens(
  address: string,
  chain: ChainId,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<AlchemyToken[]> {
  const url = `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`;
  const network = ALCHEMY_NETWORKS[chain];
  const byToken = new Map<string, AlchemyToken>();
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address, networks: [network] }],
        withMetadata: true,
        withPrices: true,
        includeNativeTokens: true,
        includeErc20Tokens: true,
        ...(pageKey ? { pageKey } : {}),
      }),
    });
    if (!response.ok) {
      throw new AlchemyError(`${network} respondeu HTTP ${response.status}`);
    }

    const body = (await response.json()) as AlchemyTokensPage;
    if (body.error || !body.data) {
      throw new AlchemyError(`${network} falhou: ${body.error?.message ?? 'resposta sem data'}`);
    }

    for (const token of body.data.tokens) {
      byToken.set(token.tokenAddress?.toLowerCase() ?? 'native', token);
    }
    pageKey = body.data.pageKey ?? undefined;
    if (!pageKey) break;
  }

  return [...byToken.values()];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:node && npm run typecheck:server`
Expected: todos passam (incluindo os 6 novos) e `tsc` sem erros.

- [ ] **Step 5: Conferir a paginação na API real**

Carteira grande na Ethereum, para ver se `pageKey` aparece e se mandá-lo no corpo traz a página seguinte:

```bash
set -a; source .env.local; set +a
BODY='{"addresses":[{"address":"0xd8da6bf26964af9d7eed9e03e53415d37aa96045","networks":["eth-mainnet"]}]}'
curl -s -X POST "https://api.g.alchemy.com/data/v1/$ALCHEMY_API_KEY/assets/tokens/by-address" -H 'content-type: application/json' -d "$BODY" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('count:',j.data.tokens.length,'pageKey:',j.data.pageKey,'first:',j.data.tokens[0]?.tokenAddress)})"
```

Se `pageKey` vier preenchido, repita adicionando `,"pageKey":"<valor>"` ao `BODY`. Expected: o primeiro `tokenAddress` muda entre as páginas.
**Se a segunda página for idêntica à primeira**, a API não aceita `pageKey` no corpo. O dedupe + `MAX_PAGES` já impede contagem dupla e loop infinito, mas registre isso como limitação no README (Task 14).

- [ ] **Step 6: Commit**

```bash
git add server/alchemy-client.ts server/alchemy-client.spec.ts
git commit -m "feat: add per-chain Alchemy client with pagination and partial-failure detection" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Handler `/api/tokens` + função Vercel

**Files:**
- Create: `server/tokens-handler.ts`, `server/tokens-handler.spec.ts`, `api/tokens.ts`

**Interfaces:**
- Consumes: `isValidEvmAddress` (Task 2), `CHAINS`, `TokensResponse` (Task 5), `toTokenItems`, `buildPortfolio` (Task 5), `fetchChainTokens` (Task 6)
- Produces:
  - `interface TokensHandlerDeps { apiKey: string | undefined; fetchFn?: typeof fetch }`, `CACHE_CONTROL`, `handleTokensRequest(request: Request, deps: TokensHandlerDeps): Promise<Response>`
  - HTTP: `GET /api/tokens?address=0x…` → `200 TokensResponse` com `cache-control`, ou `400 { error }` para endereço inválido, `500 { error }` se faltar a key, `502 { error }` se qualquer rede falhar.

- [ ] **Step 1: Escrever os testes que falham**

`server/tokens-handler.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AlchemyTokensPage } from './alchemy-types';
import { ETH_NATIVE, USDC, alchemyPage } from './__fixtures__/alchemy-tokens';
import { CACHE_CONTROL, handleTokensRequest } from './tokens-handler';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const API_KEY = 'secret-key';

function request(query: string): Request {
  return new Request(`https://definance.test/api/tokens${query}`);
}

/** Fake da Alchemy que responde por rede; número = status HTTP de erro. */
function fakeAlchemy(byNetwork: Record<string, AlchemyTokensPage | number>) {
  return vi.fn<typeof fetch>(async (_url, init) => {
    const network: string = JSON.parse(init!.body as string).addresses[0].networks[0];
    const reply = byNetwork[network] ?? alchemyPage([]);
    if (typeof reply === 'number') return new Response('upstream error', { status: reply });
    return Response.json(reply);
  });
}

describe('handleTokensRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects an invalid address with 400 without calling Alchemy', async () => {
    const fetchFn = fakeAlchemy({});
    const response = await handleTokensRequest(request('?address=0x123'), { apiKey: API_KEY, fetchFn });
    expect(response.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects a missing address with 400', async () => {
    const response = await handleTokensRequest(request(''), { apiKey: API_KEY, fetchFn: fakeAlchemy({}) });
    expect(response.status).toBe(400);
  });

  it('answers 500 when the API key is not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: undefined,
      fetchFn: fakeAlchemy({}),
    });
    expect(response.status).toBe(500);
  });

  it('aggregates the three chains into one cached response', async () => {
    const fetchFn = fakeAlchemy({
      'eth-mainnet': alchemyPage([ETH_NATIVE, USDC]),
      'base-mainnet': alchemyPage([{ ...ETH_NATIVE, network: 'base-mainnet' }]),
      'arb-mainnet': alchemyPage([]),
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL);
    const body = await response.json();
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(body.tokens.map((t: { id: string }) => t.id).sort()).toEqual([
      'base:native',
      'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'ethereum:native',
    ]);
    expect(body.totalValueUsd).toBeCloseTo(921.644 * 2 + 99.98, 2);
  });

  it('trims and lowercases the address before calling Alchemy', async () => {
    const fetchFn = fakeAlchemy({});
    const response = await handleTokensRequest(request(`?address=%20%20${ADDRESS}%0A`), {
      apiKey: API_KEY,
      fetchFn,
    });
    expect(response.status).toBe(200);
    const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
    expect(sent.addresses[0].address).toBe(ADDRESS.toLowerCase());
  });

  it('answers 502 when any chain fails, never a partial total', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = fakeAlchemy({ 'eth-mainnet': alchemyPage([ETH_NATIVE]), 'arb-mainnet': 429 });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(API_KEY);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(API_KEY);
  });

  it('redacts the API key if a network error message contains the upstream URL', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError(`connect ECONNREFUSED https://api.g.alchemy.com/data/v1/${API_KEY}/assets`);
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });

    expect(response.status).toBe(502);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(API_KEY);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:node -- server/tokens-handler.spec.ts`
Expected: FAIL, porque não resolve `./tokens-handler`.

- [ ] **Step 3: Implementar o handler**

`server/tokens-handler.ts`:

```ts
import { isValidEvmAddress } from '../shared/address';
import { CHAINS, type TokensResponse } from '../shared/token';
import { fetchChainTokens } from './alchemy-client';
import { buildPortfolio, toTokenItems } from './token-mapper';

export interface TokensHandlerDeps {
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
}

/** Cache na CDN do Vercel por endereço: poupa CU da Alchemy em demos repetidas. */
export const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

export async function handleTokensRequest(request: Request, deps: TokensHandlerDeps): Promise<Response> {
  const address = (new URL(request.url).searchParams.get('address') ?? '').trim();
  if (!isValidEvmAddress(address)) {
    return Response.json({ error: 'Endereço inválido' }, { status: 400 });
  }

  const apiKey = deps.apiKey;
  if (!apiKey) {
    console.error('ALCHEMY_API_KEY não configurada');
    return Response.json({ error: 'Serviço indisponível' }, { status: 500 });
  }

  try {
    const perChain = await Promise.all(
      CHAINS.map(async (chain) =>
        toTokenItems(await fetchChainTokens(address.toLowerCase(), chain, apiKey, deps.fetchFn), chain),
      ),
    );
    const body: TokensResponse = buildPortfolio(perChain.flat());
    return Response.json(body, { headers: { 'cache-control': CACHE_CONTROL } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Falha ao consultar a Alchemy:', message.replaceAll(apiKey, '***'));
    return Response.json({ error: 'Falha ao consultar saldos' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:node -- server/tokens-handler.spec.ts`
Expected: `Tests  7 passed (7)`

- [ ] **Step 5: Entrada da função Vercel (fina, sem lógica)**

`api/tokens.ts`:

```ts
import { handleTokensRequest } from '../server/tokens-handler';

export function GET(request: Request): Promise<Response> {
  return handleTokensRequest(request, { apiKey: process.env['ALCHEMY_API_KEY'] });
}
```

Run: `npm run test:node && npm run typecheck:server`
Expected: todos passam e `tsc` sem erros.

- [ ] **Step 6: Configurar a key no Vercel (interativo, quem roda é o usuário)**

Peça ao usuário para rodar, colando a key quando o CLI pedir:

```
! npx vercel env add ALCHEMY_API_KEY production
! npx vercel env add ALCHEMY_API_KEY preview
! npx vercel env add ALCHEMY_API_KEY development
```

Depois, rode:

```bash
npx vercel env pull .env.local --yes
```

Expected: `.env.local` reescrito, contendo `ALCHEMY_API_KEY`.

- [ ] **Step 7: Smoke test local com `vercel dev`**

Suba em background: `npx vercel dev --listen 3000` (`run_in_background: true`). Espere aparecer `Ready! Available at http://localhost:3000`.

```bash
curl -s "http://localhost:3000/api/tokens?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('tokens:',j.tokens.length,'total:',j.totalValueUsd);console.log('chains:',[...new Set(j.tokens.map(t=>t.chain))]);console.log(j.tokens.slice(0,3))})"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/tokens?address=0x123"
```

Expected: `tokens: <n > 0>`, `total` > 0, chains incluindo `ethereum` (e normalmente `base` e `arbitrum`). Depois, `400`.
Se vier `500`, a key não foi carregada: confira `.env.local` e reinicie o `vercel dev`. Pare o `vercel dev` no fim.

- [ ] **Step 8: Conferir que o Vercel compila a função**

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
ls .vercel/output/functions/api
```

Expected: build sem erro e `tokens.func` listado.
**Se o build falhar compilando `api/tokens.ts`** (erro de `module`/`moduleResolution` do TypeScript), pare e trate com superpowers:systematic-debugging, mostrando a saída exata. Não altere o `tsconfig.json` raiz do Angular às cegas.

- [ ] **Step 9: Commit**

```bash
git add server/tokens-handler.ts server/tokens-handler.spec.ts api/tokens.ts
git commit -m "feat: add /api/tokens proxy aggregating three chains via Alchemy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `WalletService` com Signals

**Files:**
- Create: `src/app/core/wallet.service.ts`, `src/app/core/wallet.service.spec.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes: `TokenItem`, `TokensResponse` (`shared/token.ts`), contrato HTTP de `/api/tokens` (Task 7)
- Produces: `type WalletStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'`, `REQUEST_TIMEOUT_MS = 15000` e `WalletService` (`providedIn: 'root'`), com:
  - `status: Signal<WalletStatus>`, `tokens: Signal<TokenItem[]>`, `totalValueUsd: Signal<number>`
  - `load(address: string): void`, que cancela a requisição anterior
  - `retry(): void`, que repete o último endereço (no-op se nunca houve load)

- [ ] **Step 1: Escrever os testes que falham**

`src/app/core/wallet.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TokenItem, TokensResponse } from '../../../shared/token';
import { REQUEST_TIMEOUT_MS, WalletService } from './wallet.service';

const ADDRESS_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ADDRESS_B = '0x1111111111111111111111111111111111111111';

const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};

describe('WalletService', () => {
  let service: WalletService;
  let http: HttpTestingController;

  const expectTokensRequest = (address: string) =>
    http.expectOne((req) => req.url === '/api/tokens' && req.params.get('address') === address);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WalletService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('starts idle and empty', () => {
    expect(service.status()).toBe('idle');
    expect(service.tokens()).toEqual([]);
    expect(service.totalValueUsd()).toBe(0);
  });

  it('goes to loading and requests the proxy with the address', () => {
    service.load(ADDRESS_A);
    expect(service.status()).toBe('loading');
    expectTokensRequest(ADDRESS_A);
  });

  it('exposes tokens and total on success', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
    expect(service.tokens()).toEqual([ETH]);
    expect(service.totalValueUsd()).toBe(920);
  });

  it('reports empty when the wallet has no priced tokens', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ tokens: [], totalValueUsd: 0 } satisfies TokensResponse);
    expect(service.status()).toBe('empty');
  });

  it('reports error and clears data when the proxy fails', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ error: 'Falha' }, { status: 502, statusText: 'Bad Gateway' });
    expect(service.status()).toBe('error');
    expect(service.tokens()).toEqual([]);
    expect(service.totalValueUsd()).toBe(0);
  });

  it('retries the last address', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ error: 'Falha' }, { status: 502, statusText: 'Bad Gateway' });
    service.retry();
    expect(service.status()).toBe('loading');
    expectTokensRequest(ADDRESS_A).flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
  });

  it('does nothing on retry before any load', () => {
    service.retry();
    expect(service.status()).toBe('idle');
  });

  it('cancels the previous request when a new address is submitted', () => {
    service.load(ADDRESS_A);
    const first = expectTokensRequest(ADDRESS_A);
    service.load(ADDRESS_B);
    const second = expectTokensRequest(ADDRESS_B);

    expect(first.cancelled).toBe(true);
    second.flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
    expect(service.tokens()).toEqual([ETH]);
  });

  it('fails with error when the proxy does not answer in time', () => {
    vi.useFakeTimers();
    service.load(ADDRESS_A);
    const req = expectTokensRequest(ADDRESS_A);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    expect(service.status()).toBe('error');
    expect(req.cancelled).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/wallet.service.spec.ts`
Expected: FAIL, porque não resolve `./wallet.service`.

- [ ] **Step 3: Implementar**

`src/app/core/wallet.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import type { TokenItem, TokensResponse } from '../../../shared/token';

export type WalletStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export const REQUEST_TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private lastAddress: string | null = null;

  private readonly _status = signal<WalletStatus>('idle');
  private readonly _tokens = signal<TokenItem[]>([]);
  private readonly _totalValueUsd = signal(0);

  readonly status = this._status.asReadonly();
  readonly tokens = this._tokens.asReadonly();
  readonly totalValueUsd = this._totalValueUsd.asReadonly();

  load(address: string): void {
    this.lastAddress = address;
    this.request?.unsubscribe();
    this.setData([], 0);
    this._status.set('loading');

    this.request = this.http
      .get<TokensResponse>('/api/tokens', { params: { address } })
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          this.setData(response.tokens, response.totalValueUsd);
          this._status.set(response.tokens.length > 0 ? 'success' : 'empty');
        },
        error: () => {
          this.setData([], 0);
          this._status.set('error');
        },
      });
  }

  retry(): void {
    if (this.lastAddress) this.load(this.lastAddress);
  }

  private setData(tokens: TokenItem[], totalValueUsd: number): void {
    this._tokens.set(tokens);
    this._totalValueUsd.set(totalValueUsd);
  }
}
```

`src/app/app.config.ts`:

```ts
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withFetch())],
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx ng test --watch=false --include src/app/core/wallet.service.spec.ts`
Expected: `Tests  9 passed (9)`

- [ ] **Step 5: Commit**

```bash
git add src/app/core src/app/app.config.ts
git commit -m "feat: add signal-based WalletService with cancellation, retry and timeout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Formatação + `TokenListComponent` + Dashboard com dados reais + deploy

**Files:**
- Create: `src/app/core/format.ts`, `src/app/core/format.spec.ts`, `src/app/features/token-list/token-list.component.ts`, `.html`, `.scss`, `.spec.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`, `.html`, `.spec.ts` (reescrito), `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `WalletService`, `WalletStatus` (Task 8), `TokenItem`, `CHAIN_LABELS` (Task 5), `WalletInputComponent`, `submitAddress` (Task 3)
- Produces:
  - `formatUsd(value: number): string`, `formatPrice(value: number): string`, `formatAmount(value: number): string`
  - `TokenListComponent` (`selector: 'app-token-list'`) com `tokens = input.required<TokenItem[]>()`. O DOM tem `[data-testid="token-row"]` com `symbol`, `amount`, `price`, `value`, `chain` e `logo-fallback`.
  - O `DashboardComponent` passa a injetar `WalletService` (com `protected readonly wallet`) e chama `wallet.load(address)` no submit. Estados com `data-testid`: `loading`, `error`, `empty`; no sucesso, `<section class="results">`.

- [ ] **Step 1: Testes de formatação que falham**

`src/app/core/format.spec.ts`:

```ts
import { formatAmount, formatPrice, formatUsd } from './format';

describe('formatUsd', () => {
  it('formats totals as USD with cents', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(1234567.891)).toBe('$1,234,567.89');
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatPrice', () => {
  it('uses cents for prices of at least one dollar', () => {
    expect(formatPrice(4608.2208)).toBe('$4,608.22');
  });

  it('keeps significant digits for tiny prices instead of showing $0.00', () => {
    expect(formatPrice(0.00001234)).toBe('$0.00001234');
    expect(formatPrice(0.5)).toBe('$0.50');
  });
});

describe('formatAmount', () => {
  it('caps large amounts at four decimals', () => {
    expect(formatAmount(1234.56789)).toBe('1,234.5679');
    expect(formatAmount(2)).toBe('2');
  });

  it('keeps significant digits for small amounts', () => {
    expect(formatAmount(0.00001234)).toBe('0.00001234');
  });
});
```

Run: `npx ng test --watch=false --include src/app/core/format.spec.ts`
Expected: FAIL, porque não resolve `./format`.

- [ ] **Step 2: Implementar a formatação**

`src/app/core/format.ts`:

```ts
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD_SMALL = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumSignificantDigits: 2,
  maximumSignificantDigits: 4,
});
const AMOUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const AMOUNT_SMALL = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });

export function formatUsd(value: number): string {
  return USD.format(value);
}

/** Preço unitário: abaixo de US$ 1 usa dígitos significativos (memecoins não viram "$0.00"). */
export function formatPrice(value: number): string {
  return value >= 1 ? USD.format(value) : USD_SMALL.format(value);
}

export function formatAmount(value: number): string {
  return value >= 1 ? AMOUNT.format(value) : AMOUNT_SMALL.format(value);
}
```

Run: `npx ng test --watch=false --include src/app/core/format.spec.ts`
Expected: `Tests  5 passed (5)`

- [ ] **Step 3: Testes da lista que falham**

`src/app/features/token-list/token-list.component.spec.ts`:

```ts
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TokenItem } from '../../../../shared/token';
import { TokenListComponent } from './token-list.component';

const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  logoUrl: 'https://static.alchemyapi.io/images/assets/1027.png',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};
const USDC: TokenItem = {
  id: 'base:0xusdc',
  chain: 'base',
  symbol: 'USDC',
  name: 'USD Coin',
  balance: 100,
  priceUsd: 0.9998,
  valueUsd: 99.98,
};
const PEPE: TokenItem = {
  id: 'arbitrum:0xpepe',
  chain: 'arbitrum',
  symbol: 'PEPE',
  name: 'Pepe',
  balance: 1_000_000,
  priceUsd: 0.00001234,
  valueUsd: 12.34,
};

describe('TokenListComponent', () => {
  let fixture: ComponentFixture<TokenListComponent>;

  const rows = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-testid="token-row"]'));
  const cell = (row: HTMLElement, id: string) => row.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

  async function render(tokens: TokenItem[]) {
    fixture = TestBed.createComponent(TokenListComponent);
    fixture.componentRef.setInput('tokens', tokens);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TokenListComponent] }).compileComponents();
  });

  it('sorts tokens by USD value, highest first', async () => {
    await render([USDC, PEPE, ETH]);
    expect(rows().map((row) => cell(row, 'symbol'))).toEqual(['ETH', 'USDC', 'PEPE']);
  });

  it('shows chain, amount, unit price and value', async () => {
    await render([ETH]);
    const [row] = rows();
    expect(cell(row, 'chain')).toBe('Ethereum');
    expect(cell(row, 'amount')).toBe('0.2');
    expect(cell(row, 'price')).toBe('$4,600.00');
    expect(cell(row, 'value')).toBe('$920.00');
  });

  it('shows tiny prices with significant digits', async () => {
    await render([PEPE]);
    const [row] = rows();
    expect(cell(row, 'price')).toBe('$0.00001234');
    expect(cell(row, 'amount')).toBe('1,000,000');
  });

  it('shows initials when the token has no logo', async () => {
    await render([USDC]);
    const [row] = rows();
    expect(row.querySelector('img')).toBeNull();
    expect(cell(row, 'logo-fallback')).toBe('US');
  });

  it('falls back to initials when the logo fails to load', async () => {
    await render([ETH]);
    const [row] = rows();
    row.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    const [updated] = rows();
    expect(updated.querySelector('img')).toBeNull();
    expect(cell(updated, 'logo-fallback')).toBe('ET');
  });
});
```

Run: `npx ng test --watch=false --include src/app/features/token-list/token-list.component.spec.ts`
Expected: FAIL, porque não resolve `./token-list.component`.

- [ ] **Step 4: Implementar a lista**

`src/app/features/token-list/token-list.component.ts`:

```ts
import { Component, computed, input, signal } from '@angular/core';
import { CHAIN_LABELS, type TokenItem } from '../../../../shared/token';
import { formatAmount, formatPrice, formatUsd } from '../../core/format';

@Component({
  selector: 'app-token-list',
  templateUrl: './token-list.component.html',
  styleUrl: './token-list.component.scss',
})
export class TokenListComponent {
  readonly tokens = input.required<TokenItem[]>();

  protected readonly sortedTokens = computed(() =>
    [...this.tokens()].sort((a, b) => b.valueUsd - a.valueUsd),
  );
  protected readonly chainLabels = CHAIN_LABELS;
  protected readonly formatAmount = formatAmount;
  protected readonly formatPrice = formatPrice;
  protected readonly formatUsd = formatUsd;

  private readonly brokenLogos = signal<ReadonlySet<string>>(new Set());

  protected showLogo(token: TokenItem): boolean {
    return !!token.logoUrl && !this.brokenLogos().has(token.id);
  }

  protected onLogoError(tokenId: string): void {
    this.brokenLogos.update((ids) => new Set(ids).add(tokenId));
  }
}
```

`src/app/features/token-list/token-list.component.html`:

```html
<h2 class="title">Tokens</h2>
<div class="token-header" aria-hidden="true">
  <span>Ativo</span>
  <span class="col-amount">Quantidade</span>
  <span class="col-price">Preço</span>
  <span class="col-value">Valor</span>
</div>
<ul class="token-list" aria-label="Tokens da carteira">
  @for (token of sortedTokens(); track token.id) {
    <li class="token-row" data-testid="token-row">
      @if (showLogo(token)) {
        <img
          class="logo"
          [src]="token.logoUrl"
          [alt]="token.symbol"
          width="32"
          height="32"
          loading="lazy"
          (error)="onLogoError(token.id)"
        />
      } @else {
        <span class="logo logo--fallback" aria-hidden="true" data-testid="logo-fallback">{{ token.symbol.slice(0, 2) }}</span>
      }
      <div class="identity">
        <span class="symbol" data-testid="symbol">{{ token.symbol }}</span>
        <span class="meta">
          <span class="chain chain--{{ token.chain }}" data-testid="chain">{{ chainLabels[token.chain] }}</span>
          <span class="name">{{ token.name }}</span>
        </span>
      </div>
      <span class="amount" data-testid="amount">{{ formatAmount(token.balance) }}</span>
      <span class="price" data-testid="price">{{ formatPrice(token.priceUsd) }}</span>
      <span class="value" data-testid="value">{{ formatUsd(token.valueUsd) }}</span>
    </li>
  }
</ul>
```

`src/app/features/token-list/token-list.component.scss` (estilo mínimo; o polish vem na Task 12):

```scss
:host {
  display: block;
}

.token-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.token-header,
.token-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.amount,
.price,
.value {
  text-align: right;
}
```

Run: `npx ng test --watch=false --include src/app/features/token-list/token-list.component.spec.ts`
Expected: `Tests  5 passed (5)`

- [ ] **Step 5: Reescrever o spec do Dashboard para o `WalletService` (falha)**

`src/app/features/dashboard/dashboard.component.spec.ts` (substitui o da Task 4 inteiro):

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TokenItem } from '../../../../shared/token';
import { WalletService, type WalletStatus } from '../../core/wallet.service';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

class FakeWalletService {
  readonly status = signal<WalletStatus>('idle');
  readonly tokens = signal<TokenItem[]>([]);
  readonly totalValueUsd = signal(0);
  readonly load = vi.fn<(address: string) => void>();
  readonly retry = vi.fn<() => void>();
}

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};

describe('DashboardComponent', () => {
  let wallet: FakeWalletService;

  async function render() {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: WalletService, useClass: FakeWalletService }],
    }).compileComponents();
    wallet = TestBed.inject(WalletService) as unknown as FakeWalletService;
  });

  it('shows the brand heading and the address input', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('DeFinance');
    expect(el.querySelector('app-wallet-input')).not.toBeNull();
  });

  it('loads the wallet when a valid address is submitted', async () => {
    const { fixture } = await render();
    await submitAddress(fixture, ADDRESS);
    expect(wallet.load).toHaveBeenCalledWith(ADDRESS);
  });

  it('renders the token list on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelectorAll('[data-testid="token-row"]').length).toBe(1);
  });
});
```

Run: `npx ng test --watch=false --include src/app/features/dashboard/dashboard.component.spec.ts`
Expected: FAIL. O dashboard ainda não chama `wallet.load` nem renderiza a lista.

- [ ] **Step 6: Ligar o Dashboard ao `WalletService`**

`src/app/features/dashboard/dashboard.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { WalletService } from '../../core/wallet.service';
import { TokenListComponent } from '../token-list/token-list.component';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

@Component({
  selector: 'app-dashboard',
  imports: [WalletInputComponent, TokenListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly wallet = inject(WalletService);

  protected onAddress(address: string): void {
    this.wallet.load(address);
  }
}
```

`src/app/features/dashboard/dashboard.component.html`:

```html
<header class="hero">
  <h1 class="brand">DeFinance</h1>
  <p class="tagline">Cole o endereço público de uma carteira para ver seus ativos em Ethereum, Arbitrum e Base.</p>
  <app-wallet-input (addressSubmit)="onAddress($event)" />
</header>

@switch (wallet.status()) {
  @case ('loading') {
    <p class="hint" data-testid="loading">Carregando carteira…</p>
  }
  @case ('error') {
    <p class="hint" data-testid="error">Não foi possível carregar a carteira.</p>
  }
  @case ('empty') {
    <p class="hint" data-testid="empty">Nenhum ativo com valor de mercado encontrado.</p>
  }
  @case ('success') {
    <section class="results">
      <app-token-list [tokens]="wallet.tokens()" />
    </section>
  }
}
```

Como o `App` agora renderiza um `DashboardComponent` que injeta `HttpClient`, atualize o `beforeEach` de `src/app/app.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the dashboard inside the shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main.app-shell app-dashboard')).not.toBeNull();
  });
});
```

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npx ng test --watch=false && npm run test:node`
Expected: tudo verde.

- [ ] **Step 8: Verificar ponta a ponta localmente**

Suba `npx vercel dev --listen 3000` em background, abra http://localhost:3000 e cole `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`.
Expected: "Carregando carteira…" e depois a lista real de tokens, com rede, quantidade, preço e valor, ordenada por valor. Pare o `vercel dev`.

- [ ] **Step 9: Commit e deploy de fim de sessão**

```bash
git add src
git commit -m "feat: show real wallet tokens from the proxy in the dashboard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
npx vercel deploy --prod
```

Expected: na URL de produção, colar o endereço acima mostra a lista real.

---

# Sessão 3 — Total + gráfico + polish essencial

### Task 10: `PortfolioSummaryComponent`

**Files:**
- Create: `src/app/features/portfolio-summary/portfolio-summary.component.ts`, `.scss`, `.spec.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`, `.html`, `.spec.ts`

**Interfaces:**
- Consumes: `formatUsd` (Task 9), `WalletService.totalValueUsd` (Task 8)
- Produces: `PortfolioSummaryComponent` (`selector: 'app-portfolio-summary'`), com `totalValueUsd = input.required<number>()` e DOM `[data-testid="total"]`. No sucesso, o Dashboard renderiza `<div class="overview">` contendo o summary.

- [ ] **Step 1: Escrever os testes que falham**

`src/app/features/portfolio-summary/portfolio-summary.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { PortfolioSummaryComponent } from './portfolio-summary.component';

describe('PortfolioSummaryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PortfolioSummaryComponent] }).compileComponents();
  });

  it('shows the total formatted as USD and updates with the input', async () => {
    const fixture = TestBed.createComponent(PortfolioSummaryComponent);
    const total = () =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="total"]')?.textContent?.trim();

    fixture.componentRef.setInput('totalValueUsd', 1234.5);
    await fixture.whenStable();
    expect(total()).toBe('$1,234.50');

    fixture.componentRef.setInput('totalValueUsd', 1234567.891);
    await fixture.whenStable();
    expect(total()).toBe('$1,234,567.89');
  });
});
```

Acrescente ao `describe` de `src/app/features/dashboard/dashboard.component.spec.ts`:

```ts
  it('renders the portfolio total on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    wallet.totalValueUsd.set(920);
    const { el } = await render();
    expect(el.querySelector('[data-testid="total"]')?.textContent?.trim()).toBe('$920.00');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false`
Expected: FAIL, porque não resolve `./portfolio-summary.component` e o total ainda não é renderizado no dashboard.

- [ ] **Step 3: Implementar**

`src/app/features/portfolio-summary/portfolio-summary.component.ts`:

```ts
import { Component, computed, input } from '@angular/core';
import { formatUsd } from '../../core/format';

@Component({
  selector: 'app-portfolio-summary',
  template: `
    <span class="label">Valor total</span>
    <strong class="total" data-testid="total">{{ formattedTotal() }}</strong>
    <span class="networks">Ethereum · Arbitrum · Base</span>
  `,
  styleUrl: './portfolio-summary.component.scss',
})
export class PortfolioSummaryComponent {
  readonly totalValueUsd = input.required<number>();

  protected readonly formattedTotal = computed(() => formatUsd(this.totalValueUsd()));
}
```

`src/app/features/portfolio-summary/portfolio-summary.component.scss`:

```scss
:host {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
```

Em `src/app/features/dashboard/dashboard.component.ts`, acrescente o import e o componente em `imports`:

```ts
import { PortfolioSummaryComponent } from '../portfolio-summary/portfolio-summary.component';
// ...
  imports: [WalletInputComponent, PortfolioSummaryComponent, TokenListComponent],
```

Em `src/app/features/dashboard/dashboard.component.html`, troque o bloco `@case ('success')` por:

```html
  @case ('success') {
    <section class="results">
      <div class="overview">
        <app-portfolio-summary class="card" [totalValueUsd]="wallet.totalValueUsd()" />
      </div>
      <app-token-list class="card" [tokens]="wallet.tokens()" />
    </section>
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx ng test --watch=false`
Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add src/app/features
git commit -m "feat: add portfolio total summary" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Gráfico de distribuição (`PortfolioChartComponent`)

**Files:**
- Create: `src/app/features/portfolio-chart/chart-data.ts`, `chart-data.spec.ts`, `portfolio-chart.component.ts`, `.html`, `.scss`, `.spec.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`, `.html`, `.spec.ts`

**Interfaces:**
- Consumes: `TokenItem`, `ChainId` (Task 5), `formatUsd` (Task 9), `ChartComponent` e tipos `Apex*` de `ng-apexcharts`
- Produces:
  - `MAX_SLICES = 7`, `OTHERS_LABEL = 'Outros'`, `interface ChartData { labels: string[]; values: number[]; percents: number[] }`, `toChartData(tokens: TokenItem[]): ChartData`
  - `PortfolioChartComponent` (`selector: 'app-portfolio-chart'`) com `tokens = input.required<TokenItem[]>()` e `CHART_COLORS`
  - O Dashboard carrega o gráfico com `@defer (on idle)` e placeholder `[data-testid="chart-placeholder"]`, o que deixa o ApexCharts fora do bundle inicial.

- [ ] **Step 1: Testes da transformação de dados que falham**

`src/app/features/portfolio-chart/chart-data.spec.ts`:

```ts
import type { ChainId, TokenItem } from '../../../../shared/token';
import { MAX_SLICES, OTHERS_LABEL, toChartData } from './chart-data';

function token(symbol: string, valueUsd: number, chain: ChainId = 'ethereum'): TokenItem {
  return { id: `${chain}:${symbol}`, chain, symbol, name: symbol, balance: 1, priceUsd: valueUsd, valueUsd };
}

describe('toChartData', () => {
  it('merges the same symbol across chains into one slice', () => {
    const data = toChartData([token('ETH', 600, 'ethereum'), token('eth', 400, 'base'), token('USDC', 500)]);
    expect(data.labels).toEqual(['ETH', 'USDC']);
    expect(data.values).toEqual([1000, 500]);
  });

  it('sorts slices by value, largest first', () => {
    const data = toChartData([token('A', 1), token('B', 3), token('C', 2)]);
    expect(data.labels).toEqual(['B', 'C', 'A']);
  });

  it(`groups everything beyond ${MAX_SLICES - 1} assets into "${OTHERS_LABEL}"`, () => {
    const tokens = [9, 8, 7, 6, 5, 4, 3, 2, 1].map((v) => token(`T${v}`, v));
    const data = toChartData(tokens);
    expect(data.labels).toEqual(['T9', 'T8', 'T7', 'T6', 'T5', 'T4', OTHERS_LABEL]);
    expect(data.values.at(-1)).toBe(3 + 2 + 1);
  });

  it(`does not group when there are exactly ${MAX_SLICES} assets`, () => {
    const tokens = [7, 6, 5, 4, 3, 2, 1].map((v) => token(`T${v}`, v));
    expect(toChartData(tokens).labels).not.toContain(OTHERS_LABEL);
  });

  it('computes percentages with one decimal', () => {
    const data = toChartData([token('ETH', 1000), token('USDC', 500)]);
    expect(data.percents).toEqual([66.7, 33.3]);
  });

  it('returns empty arrays for no tokens', () => {
    expect(toChartData([])).toEqual({ labels: [], values: [], percents: [] });
  });
});
```

Run: `npx ng test --watch=false --include src/app/features/portfolio-chart/chart-data.spec.ts`
Expected: FAIL, porque não resolve `./chart-data`.

- [ ] **Step 2: Implementar a transformação**

`src/app/features/portfolio-chart/chart-data.ts`:

```ts
import type { TokenItem } from '../../../../shared/token';

/** Máximo de fatias; acima disso as menores viram "Outros". */
export const MAX_SLICES = 7;
export const OTHERS_LABEL = 'Outros';

export interface ChartData {
  labels: string[];
  values: number[];
  /** Participação de cada fatia em %, uma casa decimal. */
  percents: number[];
}

export function toChartData(tokens: TokenItem[]): ChartData {
  const bySymbol = new Map<string, number>();
  for (const token of tokens) {
    const symbol = token.symbol.toUpperCase();
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + token.valueUsd);
  }

  let slices = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]);
  if (slices.length > MAX_SLICES) {
    const head = slices.slice(0, MAX_SLICES - 1);
    const others = slices.slice(MAX_SLICES - 1).reduce((sum, [, value]) => sum + value, 0);
    slices = [...head, [OTHERS_LABEL, others]];
  }

  const total = slices.reduce((sum, [, value]) => sum + value, 0);
  return {
    labels: slices.map(([label]) => label),
    values: slices.map(([, value]) => value),
    percents: slices.map(([, value]) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)),
  };
}
```

Run: `npx ng test --watch=false --include src/app/features/portfolio-chart/chart-data.spec.ts`
Expected: `Tests  6 passed (6)`

- [ ] **Step 3: Teste do componente com stub do `apx-chart` (falha)**

O ApexCharts real não renderiza em jsdom (sem layout SVG), então o teste troca o `apx-chart` por um stub e verifica o que o componente passa para ele.

`src/app/features/portfolio-chart/portfolio-chart.component.spec.ts`:

```ts
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { ApexLegend } from 'ng-apexcharts';
import type { TokenItem } from '../../../../shared/token';
import { PortfolioChartComponent } from './portfolio-chart.component';

@Component({ selector: 'apx-chart', template: '' })
class ApxChartStub {
  readonly series = input<number[]>();
  readonly labels = input<string[]>();
  readonly chart = input<unknown>();
  readonly colors = input<unknown>();
  readonly legend = input<ApexLegend>();
  readonly dataLabels = input<unknown>();
  readonly stroke = input<unknown>();
  readonly plotOptions = input<unknown>();
  readonly tooltip = input<unknown>();
}

function token(symbol: string, valueUsd: number, id: string): TokenItem {
  return { id, chain: 'ethereum', symbol, name: symbol, balance: 1, priceUsd: valueUsd, valueUsd };
}

describe('PortfolioChartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PortfolioChartComponent] })
      .overrideComponent(PortfolioChartComponent, { set: { imports: [ApxChartStub] } })
      .compileComponents();
  });

  it('feeds merged slices and percentage legend to the chart', async () => {
    const fixture = TestBed.createComponent(PortfolioChartComponent);
    fixture.componentRef.setInput('tokens', [
      token('ETH', 600, 'ethereum:native'),
      token('ETH', 400, 'base:native'),
      token('USDC', 500, 'ethereum:0xusdc'),
    ]);
    await fixture.whenStable();

    const chart = fixture.debugElement.query(By.directive(ApxChartStub)).componentInstance as ApxChartStub;
    expect(chart.labels()).toEqual(['ETH', 'USDC']);
    expect(chart.series()).toEqual([1000, 500]);
    expect(chart.legend()?.formatter?.('ETH', { seriesIndex: 0 })).toBe('ETH · 66.7%');
  });
});
```

Run: `npx ng test --watch=false --include src/app/features/portfolio-chart/portfolio-chart.component.spec.ts`
Expected: FAIL, porque não resolve `./portfolio-chart.component`.

- [ ] **Step 4: Implementar o componente**

`src/app/features/portfolio-chart/portfolio-chart.component.ts`:

```ts
import { Component, computed, input } from '@angular/core';
import {
  ChartComponent,
  type ApexChart,
  type ApexDataLabels,
  type ApexLegend,
  type ApexPlotOptions,
  type ApexStroke,
  type ApexTooltip,
} from 'ng-apexcharts';
import type { TokenItem } from '../../../../shared/token';
import { formatUsd } from '../../core/format';
import { toChartData } from './chart-data';

/** Última cor (cinza) fica para "Outros" quando há 7 fatias. */
export const CHART_COLORS = ['#7c5cff', '#2dd4bf', '#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#64748b'];

@Component({
  selector: 'app-portfolio-chart',
  imports: [ChartComponent],
  templateUrl: './portfolio-chart.component.html',
  styleUrl: './portfolio-chart.component.scss',
})
export class PortfolioChartComponent {
  readonly tokens = input.required<TokenItem[]>();

  protected readonly data = computed(() => toChartData(this.tokens()));

  protected readonly legend = computed<ApexLegend>(() => {
    const percents = this.data().percents;
    return {
      position: 'bottom',
      labels: { colors: '#8b93a7' },
      formatter: (label: string, opts?: { seriesIndex: number }) =>
        `${label} · ${percents[opts?.seriesIndex ?? 0]}%`,
    };
  });

  protected readonly chart: ApexChart = {
    type: 'donut',
    height: 320,
    background: 'transparent',
    fontFamily: 'inherit',
  };
  protected readonly colors = CHART_COLORS;
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly stroke: ApexStroke = { width: 2, colors: ['#121722'] };
  protected readonly plotOptions: ApexPlotOptions = { pie: { donut: { size: '68%' } } };
  protected readonly tooltip: ApexTooltip = {
    theme: 'dark',
    y: { formatter: (value: number) => formatUsd(value) },
  };
}
```

`src/app/features/portfolio-chart/portfolio-chart.component.html`:

```html
<h2 class="title">Distribuição</h2>
<apx-chart
  [series]="data().values"
  [labels]="data().labels"
  [chart]="chart"
  [colors]="colors"
  [legend]="legend()"
  [dataLabels]="dataLabels"
  [stroke]="stroke"
  [plotOptions]="plotOptions"
  [tooltip]="tooltip"
/>
```

`src/app/features/portfolio-chart/portfolio-chart.component.scss`:

```scss
:host {
  display: block;
}

apx-chart {
  display: block;
}
```

Run: `npx ng test --watch=false --include src/app/features/portfolio-chart`
Expected: `Tests  7 passed (7)`

- [ ] **Step 5: Ligar no Dashboard com `@defer` (teste primeiro)**

Em `src/app/features/dashboard/dashboard.component.spec.ts`, troque o import de `TestBed` por:

```ts
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
```

troque o `beforeEach` por:

```ts
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: WalletService, useClass: FakeWalletService }],
      // O gráfico fica no placeholder: o ApexCharts real não roda em jsdom.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();
    wallet = TestBed.inject(WalletService) as unknown as FakeWalletService;
  });
```

e acrescente ao `describe`:

```ts
  it('reserves the chart slot on success while the chart chunk loads', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelector('[data-testid="chart-placeholder"]')).not.toBeNull();
  });
```

Run: `npx ng test --watch=false --include src/app/features/dashboard/dashboard.component.spec.ts`
Expected: FAIL. O placeholder ainda não existe.

Em `src/app/features/dashboard/dashboard.component.ts`, acrescente:

```ts
import { PortfolioChartComponent } from '../portfolio-chart/portfolio-chart.component';
// ...
  imports: [WalletInputComponent, PortfolioSummaryComponent, PortfolioChartComponent, TokenListComponent],
```

Em `src/app/features/dashboard/dashboard.component.html`, troque o bloco `@case ('success')` por:

```html
  @case ('success') {
    <section class="results">
      <div class="overview">
        <app-portfolio-summary class="card" [totalValueUsd]="wallet.totalValueUsd()" />
        <div class="card chart-card">
          @defer (on idle) {
            <app-portfolio-chart [tokens]="wallet.tokens()" />
          } @placeholder {
            <div class="chart-placeholder" data-testid="chart-placeholder"></div>
          }
        </div>
      </div>
      <app-token-list class="card" [tokens]="wallet.tokens()" />
    </section>
  }
```

- [ ] **Step 6: Suíte inteira + build (conferir o lazy chunk)**

Run: `npx ng test --watch=false && npx ng build`
Expected: tudo verde. A saída do build mostra uma seção **"Lazy chunk files"** com o chunk do `portfolio-chart`/apexcharts, e o "Initial total" fica abaixo do budget de 500 kB, sem warning de budget.

- [ ] **Step 7: Verificação visual**

Com `npx vercel dev --listen 3000` em background, abra http://localhost:3000 e cole o endereço de teste.
Expected: donut com até 7 fatias, legenda "SÍMBOLO · xx.x%" e tooltip em USD. ETH de várias redes aparece numa fatia só. Pare o `vercel dev`.

- [ ] **Step 8: Commit**

```bash
git add src/app/features
git commit -m "feat: add lazy-loaded portfolio distribution donut chart" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Passada de estilo (cor, espaçamento, fonte) + deploy

> **Corte de escopo:** esta é a task que o spec manda cortar primeiro se a Sessão 2 estourar. Sem ela o app continua funcional (limpo, mas cru).

**Files:**
- Modify: `src/index.html`, `src/styles.scss`, `src/app/features/dashboard/dashboard.component.scss`, `src/app/features/wallet-input/wallet-input.component.scss`, `src/app/features/portfolio-summary/portfolio-summary.component.scss`, `src/app/features/token-list/token-list.component.scss`, `src/app/features/portfolio-chart/portfolio-chart.component.scss`

**Interfaces:**
- Consumes: classes já presentes nos templates (`hero`, `brand`, `tagline`, `hint`, `results`, `overview`, `card`, `chart-card`, `chart-placeholder`, `wallet-form`, `address-input`, `submit`, `error`, `sr-only`, `title`, `token-header`, `col-*`, `token-list`, `token-row`, `logo`, `logo--fallback`, `identity`, `symbol`, `meta`, `chain`, `chain--<id>`, `name`, `amount`, `price`, `value`, `label`, `total`, `networks`)
- Produces: tokens de tema em `:root` (`--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-strong`, `--danger`, `--radius`, `--font`) e as classes globais `.card` e `.sr-only`, usadas pela Task 13.

- [ ] **Step 1: Fonte Inter**

Em `src/index.html`, logo após `<link rel="icon" ...>`:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Tema global**

`src/styles.scss` (substitui o conteúdo):

```scss
:root {
  --bg: #0b0e14;
  --surface: #121722;
  --surface-raised: #1a2130;
  --border: #232b3b;
  --text: #e6e9ef;
  --text-muted: #8b93a7;
  --accent: #7c5cff;
  --accent-strong: #6a46ff;
  --danger: #f87171;
  --radius: 16px;
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color-scheme: dark;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
}

body {
  min-height: 100vh;
  background:
    radial-gradient(900px 480px at 15% -10%, rgb(124 92 255 / 0.18), transparent 60%),
    radial-gradient(700px 420px at 100% 0%, rgb(45 212 191 / 0.08), transparent 60%),
    var(--bg);
  color: var(--text);
  font-family: var(--font);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button,
input {
  font: inherit;
  color: inherit;
}

/* Sem `display` de propósito: cada host de componente define o seu. */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

- [ ] **Step 3: Estilos dos componentes**

`src/app/features/dashboard/dashboard.component.scss`:

```scss
:host {
  display: block;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
}

.brand {
  margin: 0 0 8px;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  background: linear-gradient(90deg, var(--text), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.tagline {
  margin: 0 auto 24px;
  max-width: 520px;
  color: var(--text-muted);
}

.hint {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.results,
.overview {
  display: grid;
  gap: 16px;
}

@media (min-width: 768px) {
  .overview {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }
}

.chart-placeholder {
  min-height: 320px;
}
```

`src/app/features/wallet-input/wallet-input.component.scss` (sem `.sr-only`, que agora é global):

```scss
:host {
  display: block;
  max-width: 640px;
  margin: 0 auto;
}

.wallet-form {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: var(--accent);
  }
}

.address-input {
  flex: 1;
  min-width: 0;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.95rem;
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }

  &[aria-invalid='true'] {
    color: var(--danger);
  }
}

.submit {
  padding: 10px 20px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--accent-strong);
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
}

.error {
  margin: 8px 0 0;
  padding-left: 16px;
  color: var(--danger);
  font-size: 0.875rem;
  text-align: left;
}

@media (max-width: 480px) {
  .wallet-form {
    flex-direction: column;
    border-radius: var(--radius);
  }
}
```

`src/app/features/portfolio-summary/portfolio-summary.component.scss`:

```scss
:host {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.label {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.total {
  font-size: clamp(2rem, 6vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.networks {
  color: var(--text-muted);
  font-size: 0.85rem;
}
```

`src/app/features/token-list/token-list.component.scss`:

```scss
:host {
  display: block;
}

.title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
}

.token-header,
.token-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 12px;
}

.token-header {
  padding: 0 12px 8px;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  span:first-child {
    grid-column: 1 / 3;
  }
}

.token-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.token-row {
  padding: 12px;
  border-radius: 12px;

  &:hover {
    background: var(--surface-raised);
  }
}

.logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.logo--fallback {
  display: grid;
  place-items: center;
  background: var(--surface-raised);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.symbol {
  font-weight: 600;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chain {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface-raised);
  font-size: 0.7rem;
  font-weight: 600;
}

.chain--ethereum {
  color: #a5b4fc;
}

.chain--arbitrum {
  color: #7dd3fc;
}

.chain--base {
  color: #93c5fd;
}

.col-amount,
.col-price,
.col-value,
.amount,
.price,
.value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.value {
  font-weight: 600;
}

@media (max-width: 600px) {
  .token-header,
  .token-row {
    grid-template-columns: 32px minmax(0, 1fr) auto auto;
  }

  .col-price,
  .price {
    display: none;
  }
}
```

`src/app/features/portfolio-chart/portfolio-chart.component.scss`:

```scss
:host {
  display: block;
}

.title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
}

apx-chart {
  display: block;
}
```

- [ ] **Step 4: Build sem estourar budget e testes intactos**

Run: `npx ng build && npx ng test --watch=false`
Expected: build sem **erro** de budget (`anyComponentStyle` tem erro em 8 kB; todos os arquivos acima ficam bem abaixo) e todos os testes passando.

- [ ] **Step 5: Verificação visual (desktop e mobile)**

Com `npx vercel dev --listen 3000` em background, abra http://localhost:3000, cole o endereço de teste e confira:
1. Fundo escuro, fonte Inter, input em pílula com foco roxo.
2. Total e donut lado a lado ≥ 768px; empilhados abaixo disso.
3. Em largura de ~375px (DevTools → modo responsivo), a coluna Preço some e nada estoura horizontalmente.

Pare o `vercel dev`.

- [ ] **Step 6: Commit e deploy de fim de sessão**

```bash
git add src
git commit -m "style: apply dark fintech theme and responsive layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
npx vercel deploy --prod
```

---

# Sessão 4 — Erros + robustez + polish final

### Task 13: Estados idle / loading (skeleton) / error (retry) / empty

**Files:**
- Modify: `src/app/features/dashboard/dashboard.component.ts`, `.html`, `.scss`, `.spec.ts`, `src/styles.scss`

**Interfaces:**
- Consumes: `WalletService.status`, `WalletService.retry()` (Task 8), `WalletInputComponent.disabled` (Task 3), tokens de tema (Task 12)
- Produces: estados finais do Dashboard com `data-testid`:
  - `idle`: nota de somente-leitura
  - `loading`: skeleton com `aria-busy="true"` e input desabilitado
  - `error`: banner com `role="alert"` e botão "Tentar novamente" que chama `wallet.retry()`
  - `empty`: mensagem amigável
  - Classe global `.skeleton`

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao `describe` de `src/app/features/dashboard/dashboard.component.spec.ts`:

```ts
  it('explains the read-only promise while idle', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="idle"]')?.textContent).toContain('Somente leitura');
  });

  it('shows a skeleton and locks the input while loading', async () => {
    wallet.status.set('loading');
    const { el } = await render();
    const loading = el.querySelector('[data-testid="loading"]');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(el.querySelector<HTMLInputElement>('input#wallet-address')!.disabled).toBe(true);
  });

  it('shows an error banner whose button retries', async () => {
    wallet.status.set('error');
    const { el } = await render();
    const banner = el.querySelector('[data-testid="error"]');
    expect(banner?.getAttribute('role')).toBe('alert');
    banner!.querySelector<HTMLButtonElement>('button')!.click();
    expect(wallet.retry).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly message for a wallet without priced tokens', async () => {
    wallet.status.set('empty');
    const { el } = await render();
    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain(
      'Nenhum ativo com valor de mercado encontrado',
    );
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/features/dashboard/dashboard.component.spec.ts`
Expected: FAIL em `idle` (não existe), em `loading` (sem `aria-busy`/skeleton, input habilitado) e em `error` (sem `role`/botão). O `empty` já passa desde a Task 9.

- [ ] **Step 3: Implementar**

Em `src/app/features/dashboard/dashboard.component.ts`, acrescente à classe:

```ts
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
```

`src/app/features/dashboard/dashboard.component.html` (versão final completa):

```html
<header class="hero">
  <h1 class="brand">DeFinance</h1>
  <p class="tagline">Cole o endereço público de uma carteira para ver seus ativos em Ethereum, Arbitrum e Base.</p>
  <app-wallet-input [disabled]="wallet.status() === 'loading'" (addressSubmit)="onAddress($event)" />
</header>

@switch (wallet.status()) {
  @case ('idle') {
    <p class="hint" data-testid="idle">Somente leitura: nunca pedimos chave privada nem conexão de carteira.</p>
  }
  @case ('loading') {
    <section class="results" aria-busy="true" aria-label="Carregando carteira" data-testid="loading">
      <div class="overview">
        <div class="card skeleton skeleton--summary"></div>
        <div class="card skeleton skeleton--chart"></div>
      </div>
      <div class="card skeleton-list">
        @for (row of skeletonRows; track row) {
          <div class="skeleton skeleton--row"></div>
        }
      </div>
    </section>
  }
  @case ('error') {
    <div class="banner" role="alert" data-testid="error">
      <span>Não foi possível carregar a carteira. Verifique sua conexão e tente de novo.</span>
      <button type="button" class="retry" (click)="wallet.retry()">Tentar novamente</button>
    </div>
  }
  @case ('empty') {
    <div class="card empty" data-testid="empty">
      <p class="empty-title">Nenhum ativo com valor de mercado encontrado</p>
      <p class="empty-text">Esta carteira não tem tokens com preço em Ethereum, Arbitrum ou Base.</p>
    </div>
  }
  @case ('success') {
    <section class="results">
      <div class="overview">
        <app-portfolio-summary class="card" [totalValueUsd]="wallet.totalValueUsd()" />
        <div class="card chart-card">
          @defer (on idle) {
            <app-portfolio-chart [tokens]="wallet.tokens()" />
          } @placeholder {
            <div class="chart-placeholder" data-testid="chart-placeholder"></div>
          }
        </div>
      </div>
      <app-token-list class="card" [tokens]="wallet.tokens()" />
    </section>
  }
}
```

Acrescente ao final de `src/styles.scss`:

```scss
.skeleton {
  background: linear-gradient(90deg, var(--surface) 0%, var(--surface-raised) 50%, var(--surface) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius);
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
```

Acrescente ao final de `src/app/features/dashboard/dashboard.component.scss`:

```scss
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid rgb(248 113 113 / 0.4);
  border-radius: var(--radius);
  background: rgb(248 113 113 / 0.08);
  color: var(--danger);
}

.retry {
  padding: 8px 16px;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: rgb(248 113 113 / 0.12);
  }
}

.empty {
  padding: 40px 20px;
  text-align: center;
}

.empty-title {
  margin: 0 0 4px;
  font-weight: 600;
}

.empty-text {
  margin: 0;
  color: var(--text-muted);
}

.skeleton--summary {
  min-height: 140px;
}

.skeleton--chart {
  min-height: 320px;
}

.skeleton-list {
  display: grid;
  gap: 12px;
}

.skeleton--row {
  height: 48px;
  border-radius: 10px;
}
```

- [ ] **Step 4: Rodar a suíte inteira e o build**

Run: `npx ng test --watch=false && npm run test:node && npx ng build`
Expected: tudo verde e build sem erro de budget.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add idle, loading skeleton, error retry and empty states" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Edge cases na demo real + README + deploy final

**Files:**
- Modify: `README.md` (substitui o gerado pelo CLI)

**Interfaces:**
- Consumes: app completo (Tasks 1–13) e URL de produção (Task 4)
- Produces: demo pública validada e README pronto para mostrar a cliente.

- [ ] **Step 1: Deploy de preview para testar**

```bash
npx vercel deploy
```

Expected: imprime uma URL de **preview**. Use-a nos passos seguintes.

- [ ] **Step 2: Roteiro de edge cases (no navegador, na URL de preview)**

Gere uma carteira garantidamente vazia:

```bash
node -e "console.log('0x' + require('crypto').randomBytes(20).toString('hex'))"
```

Confira cada item e anote o resultado:

| # | Entrada / ação | Esperado |
|---|---|---|
| 1 | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` | skeleton → total + donut + lista |
| 2 | o mesmo endereço com espaços e quebra de linha em volta (colado) | mesmo resultado do #1 |
| 3 | `0x123` | erro inline "Endereço inválido…", nenhuma chamada em DevTools → Network |
| 4 | `vitalik.eth` | erro inline sobre ENS |
| 5 | endereço aleatório gerado acima | mensagem "Nenhum ativo com valor de mercado encontrado" |
| 6 | DevTools → Network → Offline, enviar #1 | banner de erro; voltar Online → "Tentar novamente" carrega |
| 7 | enviar #1 e, durante o skeleton, recarregar com #5 | input desabilitado durante o loading; só o resultado final aparece |
| 8 | largura de ~375px | layout empilhado, sem scroll horizontal |

Se algum item falhar, pare e trate com superpowers:systematic-debugging antes de seguir.

- [ ] **Step 3: README**

`README.md` (substitui o conteúdo; use a URL de produção da Task 4):

```markdown
# DeFinance

Dashboard **somente leitura** de carteiras EVM: cole um endereço público e veja os tokens, o valor total em USD e a distribuição por ativo em **Ethereum, Arbitrum e Base**. Nunca pede chave privada nem conexão de carteira.

**Demo:** https://definance.vercel.app

## Como funciona

- **Front:** Angular 22 (standalone, zoneless, Signals) + ApexCharts carregado sob demanda com `@defer`.
- **Proxy:** uma Vercel Function (`GET /api/tokens?address=0x…`) consulta a Alchemy Portfolio API nas 3 redes em paralelo, filtra spam/sem preço/poeira e devolve um JSON consolidado. A API key fica só no servidor.
- **Estados:** idle, loading (skeleton), sucesso, carteira vazia e erro com "tentar novamente".

## Rodando localmente

1. `npm install`
2. Crie uma app em https://dashboard.alchemy.com com Ethereum, Arbitrum e Base habilitadas.
3. `npx vercel link`, depois `npx vercel env add ALCHEMY_API_KEY` (production, preview e development) e `npx vercel env pull .env.local`
4. `npx vercel dev` → http://localhost:3000

## Testes

- `npx ng test --watch=false`: componentes e serviço (Vitest + jsdom)
- `npm run test:node`: proxy e validação (Vitest em Node)
- `npm run typecheck:server`: tipos do proxy

## Limitações conhecidas

- Spam é filtrado por heurística (sem preço em USD, metadata ausente, valor < US$ 0,01). Tokens de spam que tenham preço de mercado podem aparecer.
- Carteiras muito grandes: até 5 páginas por rede.
- Somente USD. Posições DeFi, histórico e multi-carteira estão no [backlog](docs/backlog.md).
```

Troque `https://definance.vercel.app` pela URL de produção real anotada na Task 4, caso seja diferente. Se a Task 6 Step 5 mostrou que a paginação não avança, acrescente em "Limitações conhecidas" a linha exata:

```markdown
- A Alchemy não avança a paginação via `pageKey`: carteiras grandes mostram só a primeira página de tokens por rede.
```

- [ ] **Step 4: Verificação final completa**

Run: `npx ng test --watch=false && npm run test:node && npm run typecheck:server && npx ng build`
Expected: tudo verde e build sem erro.

- [ ] **Step 5: Commit e deploy final de produção**

```bash
git add README.md
git commit -m "docs: add project README with demo link and limitations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
npx vercel deploy --prod
```

Expected: repetir na URL de **produção** os itens 1, 3 e 5 da tabela do Step 2, com o mesmo resultado.
