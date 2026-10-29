const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/** Valida o formato de um endereço EVM. Estrito: quem chama é responsável pelo trim. */
export function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_ADDRESS_BYTES = 32;

export type AddressKind = 'evm' | 'solana';

/** Tamanho em bytes de uma string base58 (cada "1" à esquerda vale um byte zero). */
function base58DecodedLength(value: string): number {
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === '1') leadingZeros++;
  let n = 0n;
  for (const char of value) n = n * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
  return leadingZeros + (n === 0n ? 0 : Math.ceil(n.toString(16).length / 2));
}

/** Valida o formato de um endereço Solana (base58, 32 bytes). Estrito: quem chama é responsável pelo trim. */
export function isValidSolanaAddress(value: string): boolean {
  return SOLANA_ADDRESS.test(value) && base58DecodedLength(value) === SOLANA_ADDRESS_BYTES;
}

/** Identifica o tipo do endereço, ou null se não for EVM nem Solana. */
export function addressKind(value: string): AddressKind | null {
  if (isValidEvmAddress(value)) return 'evm';
  if (isValidSolanaAddress(value)) return 'solana';
  return null;
}

/** Chave canônica para detectar duplicados: minúscula só para EVM; Solana diferencia maiúsculas. */
export function addressKey(address: string): string {
  return isValidEvmAddress(address) ? address.toLowerCase() : address;
}
