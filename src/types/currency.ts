const DEFAULT_CURRENCY_EXPONENT = 2;

// ISO 4217 currency exponent map.
// exponent=2 => minor unit = major unit * 100
// exponent=0 => no minor unit
// exponent=3 => minor unit = major unit * 1000
export const CURRENCY_EXPONENT: Record<string, number> = {
  AED: 2,
  AFN: 2,
  ALL: 2,
  AMD: 2,
  AOA: 2,
  ARS: 2,
  AUD: 2,
  AZN: 2,

  BAM: 2,
  BBD: 2,
  BDT: 2,
  BGN: 2,
  BHD: 3,
  BIF: 0,
  BMD: 2,
  BND: 2,
  BOB: 2,
  BRL: 2,
  BSD: 2,
  BTN: 2,
  BWP: 2,
  BYN: 2,
  BZD: 2,

  CAD: 2,
  CDF: 2,
  CHF: 2,
  CLP: 0,
  CNY: 2,
  COP: 2,
  CRC: 2,
  CUP: 2,
  CZK: 2,

  DJF: 0,
  DKK: 2,
  DOP: 2,
  DZD: 2,

  EGP: 2,
  ERN: 2,
  ETB: 2,
  EUR: 2,

  FJD: 2,

  GBP: 2,
  GEL: 2,
  GHS: 2,
  GTQ: 2,
  GYD: 2,

  HKD: 2,
  HNL: 2,
  HRK: 2,
  HTG: 2,
  HUF: 2,

  IDR: 0,
  ILS: 2,
  INR: 2,
  IQD: 3,
  IRR: 2,
  ISK: 0,

  JMD: 2,
  JOD: 3,
  JPY: 0,

  KES: 2,
  KGS: 2,
  KHR: 2,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  KZT: 2,

  LAK: 2,
  LBP: 2,
  LKR: 2,
  LSL: 2,
  LYD: 3,

  MAD: 2,
  MDL: 2,
  MGA: 2,
  MKD: 2,
  MMK: 2,
  MNT: 2,
  MOP: 2,
  MRU: 2,
  MUR: 2,
  MVR: 2,
  MWK: 2,
  MXN: 2,
  MYR: 2,
  MZN: 2,

  NAD: 2,
  NGN: 2,
  NIO: 2,
  NOK: 2,
  NPR: 2,
  NZD: 2,

  OMR: 3,

  PAB: 2,
  PEN: 2,
  PGK: 2,
  PHP: 2,
  PKR: 2,
  PLN: 2,
  PYG: 0,

  QAR: 2,

  RON: 2,
  RSD: 2,
  RUB: 2,
  RWF: 0,

  SAR: 2,
  SBD: 2,
  SCR: 2,
  SDG: 2,
  SEK: 2,
  SGD: 2,
  SLL: 2,
  SOS: 2,
  SRD: 2,
  SSP: 2,
  STN: 2,
  SVC: 2,
  SYP: 2,
  SZL: 2,

  THB: 2,
  TJS: 2,
  TMT: 2,
  TND: 3,
  TOP: 2,
  TRY: 2,
  TTD: 2,
  TWD: 2,
  TZS: 0,

  UAH: 2,
  UGX: 0,
  USD: 2,
  UYU: 2,
  UZS: 2,

  VES: 2,
  VND: 0,
  VUV: 0,

  WST: 2,

  XAF: 0,
  XCD: 2,
  XOF: 0,
  XPF: 0,

  YER: 2,

  ZAR: 2,
  ZMW: 2,
  ZWL: 2,
};

export function getCurrencyExponent(currency: string): number {
  return CURRENCY_EXPONENT[currency.toUpperCase()] ?? DEFAULT_CURRENCY_EXPONENT;
}

export function pow10(n: number): number {
  let result = 1;
  for (let i = 0; i < n; i += 1) {
    result *= 10;
  }
  return result;
}
