import { signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import type { ChainId, TokenItem } from '../../../../shared/token';
import type { WalletState } from '../../core/portfolio';
import { WalletService, type WalletLending, type WalletStatus } from '../../core/wallet.service';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

class FakeWalletService {
  readonly status = signal<WalletStatus>('idle');
  readonly tokens = signal<TokenItem[]>([]);
  readonly totalValueUsd = signal(0);
  readonly failedChains = signal<ChainId[]>([]);
  readonly wallets = signal<WalletState[]>([]);
  readonly failedWallets = signal<WalletState[]>([]);
  readonly loadedCount = signal(0);
  readonly lending = signal<WalletLending[]>([]);
  readonly lendingFailedWallets = signal<WalletState[]>([]);
  readonly add = vi.fn<(address: string) => string>(() => 'added');
  readonly remove = vi.fn<(address: string) => void>();
  readonly toggle = vi.fn<(address: string) => void>();
  readonly retry = vi.fn<(address: string) => void>();
  readonly retryFailed = vi.fn<() => void>();
}

function walletState(address: string, changes: Partial<WalletState> = {}): WalletState {
  return { address, enabled: true, status: 'success', tokens: [], totalValueUsd: 920, failedChains: [], lending: [], lendingFailed: false, ...changes };
}

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const OTHER = '0x1a2B000000000000000000000000000000009f3c';
const ANOTHER = '0x2222222222222222222222222222222222222222';
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
      // O gráfico fica no placeholder: o ApexCharts real não roda em jsdom.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();
    wallet = TestBed.inject(WalletService) as unknown as FakeWalletService;
  });

  it('shows the brand heading and the address input', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('DeFinance');
    expect(el.querySelector('app-wallet-input')).not.toBeNull();
  });

  it('mentions the 17 EVM chains and Solana in the tagline', async () => {
    const { el } = await render();
    expect(el.querySelector('.tagline')?.textContent).toContain('17 redes EVM e na Solana');
  });

  it('adds the wallet when a valid address is submitted', async () => {
    const { fixture } = await render();
    await submitAddress(fixture, ADDRESS);
    expect(wallet.add).toHaveBeenCalledWith(ADDRESS);
  });

  it('renders a card per wallet, wired to the service', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    wallet.wallets.set([walletState(ADDRESS), walletState(OTHER)]);
    const { el } = await render();
    const cards = el.querySelectorAll<HTMLElement>('[data-testid="wallet-card"]');
    expect(cards.length).toBe(2);
    cards[1].querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    cards[1].querySelector<HTMLButtonElement>('button')!.click();
    expect(wallet.toggle).toHaveBeenCalledWith(OTHER);
    expect(wallet.remove).toHaveBeenCalledWith(OTHER);
  });

  it('hides the wallet cards before any wallet is added', async () => {
    const { el } = await render();
    expect(el.querySelector('app-wallet-cards')).toBeNull();
  });

  it('shows the failed-wallet banner naming the short address', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    wallet.wallets.set([walletState(ADDRESS), walletState(OTHER, { status: 'error' })]);
    wallet.failedWallets.set([walletState(OTHER, { status: 'error' })]);
    const { el } = await render();
    const banner = el.querySelector<HTMLElement>('[data-testid="failed-wallets"]');
    expect(banner?.getAttribute('role')).toBe('status');
    expect(banner?.textContent).toContain('Não foi possível carregar 0x1a2B…9f3c. O total pode estar incompleto.');
    banner!.querySelector<HTMLButtonElement>('button')!.click();
    expect(wallet.retryFailed).toHaveBeenCalledTimes(1);
  });

  it('renders the token list on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelectorAll('[data-testid="token-row"]').length).toBe(1);
  });

  it('renders the portfolio total on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    wallet.totalValueUsd.set(920);
    const { el } = await render();
    expect(el.querySelector('[data-testid="total"]')?.textContent?.trim()).toBe('$920.00');
  });

  it('reserves the chart slot on success while the chart chunk loads', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelector('[data-testid="chart-placeholder"]')).not.toBeNull();
  });

  it('explains the read-only promise while idle', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="idle"]')?.textContent).toContain('Somente leitura');
  });

  it('shows a skeleton while loading', async () => {
    wallet.status.set('loading');
    const { el } = await render();
    const loading = el.querySelector('[data-testid="loading"]');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('shows an error banner whose button retries', async () => {
    wallet.status.set('error');
    const { el } = await render();
    const banner = el.querySelector('[data-testid="error"]');
    expect(banner?.getAttribute('role')).toBe('alert');
    banner!.querySelector<HTMLButtonElement>('button')!.click();
    expect(wallet.retryFailed).toHaveBeenCalledTimes(1);
  });

  describe('partial failure', () => {
    const warning = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-testid="partial"]');

    it('names the chains that failed over a partial wallet, with a retry', async () => {
      wallet.status.set('success');
      wallet.tokens.set([ETH]);
      wallet.failedChains.set(['linea', 'scroll']);
      const { el } = await render();
      expect(warning(el)?.getAttribute('role')).toBe('status');
      expect(warning(el)?.textContent).toContain('Linea e Scroll');
      warning(el)!.querySelector<HTMLButtonElement>('button')!.click();
      expect(wallet.retryFailed).toHaveBeenCalledTimes(1);
    });

    it('warns too when the chains that loaded came back empty', async () => {
      wallet.status.set('empty');
      wallet.failedChains.set(['arbitrum']);
      const { el } = await render();
      expect(warning(el)?.textContent).toContain('Arbitrum');
    });

    it('stays hidden when every chain loaded', async () => {
      wallet.status.set('success');
      wallet.tokens.set([ETH]);
      const { el } = await render();
      expect(warning(el)).toBeNull();
    });
  });

  it('shows a friendly message for a wallet without priced tokens', async () => {
    wallet.status.set('empty');
    const { el } = await render();
    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain(
      'Nenhum ativo com valor de mercado encontrado',
    );
  });

  describe('chain filter', () => {
    const ARB: TokenItem = { id: 'arbitrum:0xarb', chain: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', balance: 100, priceUsd: 0.5, valueUsd: 50 };
    const USDC_ARB: TokenItem = { id: 'arbitrum:0xusdc', chain: 'arbitrum', symbol: 'USDC', name: 'USD Coin', balance: 30, priceUsd: 1, valueUsd: 30 };

    async function renderWallet() {
      wallet.status.set('success');
      wallet.tokens.set([ETH, ARB, USDC_ARB]);
      wallet.totalValueUsd.set(1000);
      return render();
    }

    const text = (el: HTMLElement, testId: string) =>
      el.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
    const rowCount = (el: HTMLElement) => el.querySelectorAll('[data-testid="token-row"]').length;
    const chip = (el: HTMLElement, id: string) =>
      el.querySelector<HTMLButtonElement>(`[data-testid="chip-${id}"]`)!;

    it('shows the whole wallet by default', async () => {
      const { el } = await renderWallet();
      expect(chip(el, 'all').getAttribute('aria-pressed')).toBe('true');
      expect(rowCount(el)).toBe(3);
      expect(text(el, 'total')).toBe('$1,000.00');
      expect(text(el, 'summary-label')).toBe('Valor total');
      expect(text(el, 'summary-caption')).toBe('Ativos em 2 redes');
    });

    it('narrows total, label and list to the chosen chain', async () => {
      const { fixture, el } = await renderWallet();
      chip(el, 'arbitrum').click();
      await fixture.whenStable();
      expect(rowCount(el)).toBe(2);
      expect(text(el, 'total')).toBe('$80.00');
      expect(text(el, 'summary-label')).toBe('Valor em Arbitrum');
      expect(text(el, 'summary-caption')).toBe('2 tokens nesta rede');
    });

    it('hides chains where the wallet has nothing', async () => {
      const { el } = await renderWallet();
      expect(chip(el, 'base')).toBeNull();
    });

    it('counts tokens on every supported chain', async () => {
      const POL: TokenItem = { id: 'polygon:native', chain: 'polygon', symbol: 'POL', name: 'Polygon Ecosystem Token', balance: 100, priceUsd: 0.1, valueUsd: 10 };
      wallet.status.set('success');
      wallet.tokens.set([POL]);
      const { el } = await render();
      expect(chip(el, 'polygon')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Polygon 1');
      expect(text(el, 'summary-caption')).toBe('Ativos em 1 rede');
    });

    it('prefixes the caption with the wallet count when there are several wallets', async () => {
      wallet.wallets.set([walletState(ADDRESS), walletState(OTHER), walletState(ANOTHER, { status: 'error' })]);
      wallet.loadedCount.set(2);
      const { el } = await renderWallet();
      expect(text(el, 'summary-caption')).toBe('2 de 3 carteiras · Ativos em 2 redes');
    });

    it('falls back to all chains when the selected chain loses its tokens', async () => {
      const { fixture, el } = await renderWallet();
      chip(el, 'arbitrum').click();
      await fixture.whenStable();
      wallet.tokens.set([ETH]);
      await fixture.whenStable();
      expect(chip(el, 'all').getAttribute('aria-pressed')).toBe('true');
      expect(rowCount(el)).toBe(1);
    });

    it('keeps the chosen chain while it still has tokens', async () => {
      const { fixture, el } = await renderWallet();
      chip(el, 'arbitrum').click();
      await fixture.whenStable();
      wallet.tokens.set([ETH, ARB]);
      await fixture.whenStable();
      expect(chip(el, 'arbitrum').getAttribute('aria-pressed')).toBe('true');
    });

    it('goes back to every chain when another address is added', async () => {
      const { fixture, el } = await renderWallet();
      chip(el, 'arbitrum').click();
      await fixture.whenStable();
      await submitAddress(fixture, ADDRESS);
      expect(wallet.add).toHaveBeenCalledWith(ADDRESS);
      expect(chip(el, 'all').getAttribute('aria-pressed')).toBe('true');
      expect(rowCount(el)).toBe(3);
    });
  });

  describe('Aave', () => {
    const WBTC_WALLET: TokenItem = { id: 'ethereum:0xwbtc', chain: 'ethereum', symbol: 'WBTC', name: 'Wrapped BTC', balance: 0.001, priceUsd: 100000, valueUsd: 100 };
    const ETH_46: TokenItem = { ...ETH, valueUsd: 46 };
    const ETH_MARKET: WalletLending = {
      wallet: ADDRESS,
      id: 'ethereum:0xpool',
      chain: 'ethereum',
      label: 'Aave · Ethereum',
      supplied: [{ underlying: '0xwbtc', symbol: 'WBTC', name: 'Wrapped BTC', balance: 2, valueUsd: 200000 }],
      borrowed: [{ underlying: '0xusdc', symbol: 'USDC', name: 'USD Coin', balance: 150000, valueUsd: 150000 }],
      healthFactor: 1.38,
    };
    const BASE_MARKET: WalletLending = {
      wallet: ADDRESS,
      id: 'base:0xpool',
      chain: 'base',
      label: 'Aave · Base',
      supplied: [{ underlying: '0xusdc', symbol: 'USDC', name: 'USD Coin', balance: 45064, valueUsd: 45064 }],
      borrowed: [{ underlying: '0xweth', symbol: 'WETH', name: 'Wrapped Ether', balance: 0.2, valueUsd: 626 }],
      healthFactor: 3,
    };
    const text = (el: HTMLElement, id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

    async function renderAave() {
      wallet.status.set('success');
      wallet.tokens.set([ETH_46, WBTC_WALLET]);
      wallet.totalValueUsd.set(146 + 245064 - 150626);
      wallet.lending.set([ETH_MARKET, BASE_MARKET]);
      return render();
    }

    it('shows net worth label, net total and the breakdown', async () => {
      const { el } = await renderAave();
      expect(text(el, 'summary-label')).toBe('Patrimônio líquido');
      expect(text(el, 'total')).toBe('$94,584.00');
      expect(text(el, 'summary-breakdown')).toBe(
        'Carteira $146.00 · Aave depositado $245,064.00 · dívida −$150,626.00',
      );
      expect(el.querySelectorAll('[data-testid="lending-card"]').length).toBe(2);
    });

    it('does not show wallet addresses on the cards with a single wallet', async () => {
      const { el } = await renderAave();
      expect(el.querySelector('[data-testid="lending-wallet"]')).toBeNull();
    });

    it('shows wallet addresses on the cards with several wallets', async () => {
      wallet.wallets.set([walletState(ADDRESS), walletState(OTHER)]);
      const { el } = await renderAave();
      expect(el.querySelector('[data-testid="lending-wallet"]')).not.toBeNull();
    });

    it('keeps the chip of a chain with only an Aave market and filters to it', async () => {
      const { fixture, el } = await renderAave();
      const base = el.querySelector<HTMLButtonElement>('[data-testid="chip-base"]');
      expect(base).not.toBeNull();
      base!.click();
      await fixture.whenStable();
      expect(el.querySelectorAll('[data-testid="lending-card"]').length).toBe(1);
      expect(text(el, 'summary-label')).toBe('Patrimônio líquido em Base');
      expect(text(el, 'total')).toBe('$44,438.00');
      expect(el.querySelectorAll('[data-testid="token-row"]').length).toBe(0);
    });

    it('keeps today labels without Aave', async () => {
      wallet.status.set('success');
      wallet.tokens.set([ETH]);
      wallet.totalValueUsd.set(920);
      const { el } = await render();
      expect(text(el, 'summary-label')).toBe('Valor total');
      expect(el.querySelector('[data-testid="summary-breakdown"]')).toBeNull();
      expect(el.querySelector('app-lending-markets')).toBeNull();
    });

    it('passes wallet tokens plus supplied assets (not debts) to the chart', async () => {
      const { fixture } = await renderAave();
      const tokens = (fixture.componentInstance as unknown as { chartTokens: () => TokenItem[] }).chartTokens();
      expect(tokens.filter((t) => t.symbol === 'WBTC').length).toBe(2);
      expect(tokens.some((t) => t.symbol === 'WETH')).toBe(false);
    });

    it('shows the Aave failure banner and retries', async () => {
      wallet.status.set('success');
      wallet.tokens.set([ETH]);
      wallet.lendingFailedWallets.set([walletState(ADDRESS, { lendingFailed: true })]);
      const { el } = await render();
      const banner = el.querySelector<HTMLElement>('[data-testid="lending-failed"]');
      expect(banner?.getAttribute('role')).toBe('status');
      expect(banner?.textContent).toContain('Não foi possível carregar as posições da Aave. O total pode estar incompleto.');
      banner!.querySelector<HTMLButtonElement>('button')!.click();
      expect(wallet.retryFailed).toHaveBeenCalledTimes(1);
    });
  });
});
