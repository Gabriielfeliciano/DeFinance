import { describe, expect, it } from 'vitest';
import { addressKey, addressKind, isValidEvmAddress, isValidSolanaAddress } from './address';

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

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const EVM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('isValidSolanaAddress', () => {
  it.each([
    '11111111111111111111111111111111',
    TOKEN_PROGRAM,
    '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY',
  ])('accepts %s', (address) => {
    expect(isValidSolanaAddress(address)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['31 chars', '1111111111111111111111111111111'],
    ['45 chars', `${TOKEN_PROGRAM}1`],
    ['char 0', `0${TOKEN_PROGRAM.slice(1)}`],
    ['char O', `O${TOKEN_PROGRAM.slice(1)}`],
    ['char I', `I${TOKEN_PROGRAM.slice(1)}`],
    ['char l', `l${TOKEN_PROGRAM.slice(1)}`],
    ['44 z (decodes to 33 bytes)', 'z'.repeat(44)],
    ['hex without 0x', 'd8dA6BF26964aF9D7eEd9e93E53415D37aA9614f'],
    ['surrounding whitespace (callers trim)', ` ${TOKEN_PROGRAM} `],
    ['EVM address', EVM],
  ])('rejects %s', (_label, address) => {
    expect(isValidSolanaAddress(address)).toBe(false);
  });
});

describe('addressKind', () => {
  it('classifies EVM, Solana and anything else', () => {
    expect(addressKind(EVM)).toBe('evm');
    expect(addressKind(TOKEN_PROGRAM)).toBe('solana');
    expect(addressKind('vitalik.eth')).toBeNull();
  });
});

describe('addressKey', () => {
  it('lowercases EVM addresses', () => {
    expect(addressKey('0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045')).toBe(
      addressKey('0xd8da6bf26964af9d7eed9e03e53415d37aa96045'),
    );
  });

  it('keeps Solana addresses unchanged', () => {
    expect(addressKey(TOKEN_PROGRAM)).toBe(TOKEN_PROGRAM);
  });
});
