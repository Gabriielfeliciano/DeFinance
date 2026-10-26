import { signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import type { ChainId, TokenItem } from '../../../../shared/token';
import { WalletService, type WalletStatus } from '../../core/wallet.service';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

class FakeWalletService {
  readonly status = signal<WalletStatus>('idle');
  readonly tokens = signal<TokenItem[]>([]);
  readonly totalValueUsd = signal(0);
  readonly failedChains = signal<ChainId[]>([]);
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
      expect(wallet.retry).toHaveBeenCalledTimes(1);
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

    it('goes back to every chain when another address is loaded', async () => {
      const { fixture, el } = await renderWallet();
      chip(el, 'arbitrum').click();
      await fixture.whenStable();
      await submitAddress(fixture, ADDRESS);
      expect(wallet.load).toHaveBeenCalledWith(ADDRESS);
      expect(chip(el, 'all').getAttribute('aria-pressed')).toBe('true');
      expect(rowCount(el)).toBe(3);
    });
  });
});
