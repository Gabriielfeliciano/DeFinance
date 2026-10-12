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
