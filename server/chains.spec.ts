import { describe, expect, it } from 'vitest';
import { CHAINS } from '../shared/token';
import { CHAIN_CONFIG, contractKey } from './chains';

describe('contractKey', () => {
  it('keeps the Solana mint case untouched', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    expect(contractKey('solana', mint)).toBe(mint);
  });

  it('lowercases EVM contracts', () => {
    expect(contractKey('base', '0xABC')).toBe('0xabc');
  });
});

describe('CHAIN_CONFIG', () => {
  it.each(CHAINS)('has an entry for %s', (chain) => {
    expect(CHAIN_CONFIG[chain]).toBeDefined();
  });

  it('configures SOL with 9 decimals', () => {
    expect(CHAIN_CONFIG.solana.native).toMatchObject({ symbol: 'SOL', decimals: 9 });
  });
});
