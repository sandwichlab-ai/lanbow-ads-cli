import { getCurrencyExponent, pow10 } from '../types/currency.js';

export function centsToAmount(cents: string | number, currency: string): string {
  const value = typeof cents === 'string' ? parseInt(cents, 10) : cents;

  if (Number.isNaN(value)) {
    return '0';
  }

  const exponent = getCurrencyExponent(currency);
  const divisor = pow10(exponent);

  return (value / divisor).toLocaleString(undefined, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
}

export function formatMoney(cents: string | number, currency: string): string {
  const amount = centsToAmount(cents, currency);
  return `${amount} ${currency}`;
}
