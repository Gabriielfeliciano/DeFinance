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
