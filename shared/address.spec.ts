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
