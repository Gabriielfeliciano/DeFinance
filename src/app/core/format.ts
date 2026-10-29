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

/** `0xd8dA…6045` (EVM: prefixo, 4 caracteres e os 4 últimos) ou `86xC…2MMY` (Solana). */
export function shortAddress(address: string): string {
  if (!address.startsWith('0x')) return `${address.slice(0, 4)}…${address.slice(-4)}`;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
