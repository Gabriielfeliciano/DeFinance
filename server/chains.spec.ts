import { describe, expect, it } from 'vitest';
import { CHAINS } from '../shared/token';
import { CHAIN_CONFIG, aaveMarketLabel, contractKey } from './chains';

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

describe('aaveMarketLabel', () => {
  it.each([
    ['ethereum', 'AaveV3Ethereum', 'Aave · Ethereum'],
    ['ethereum', 'AaveV3EthereumLido', 'Aave · Ethereum Lido'],
    ['ethereum', 'AaveV3EthereumEtherFi', 'Aave · Ethereum EtherFi'],
    ['ethereum', 'AaveV3EthereumHorizon', 'Aave · Ethereum Horizon'],
    ['bnb', 'AaveV3BNB', 'Aave · BNB Chain'],
    ['zksync', 'AaveV3ZkSync', 'Aave · zkSync'],
    ['base', 'AaveV3Other', 'Aave · Base Other'],
  ] as const)('%s %s -> %s', (chain, name, label) => {
    expect(aaveMarketLabel(chain, name)).toBe(label);
  });
});

describe('Aave chain ids', () => {
  it('gives a chainId to every chain with aaveName', () => {
    for (const chain of CHAINS) {
      const config = CHAIN_CONFIG[chain];
      if (config.aaveName) expect(config.chainId, chain).toBeTypeOf('number');
    }
  });

  it('covers the 11 verified Aave chains', () => {
    expect(CHAINS.filter((chain) => CHAIN_CONFIG[chain].aaveName)).toHaveLength(11);
  });
});
