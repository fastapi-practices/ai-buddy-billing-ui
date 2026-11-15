import type { AIBuddyBillingDecimal } from '../api';

import { convertBillingAmount, getBillingCurrency } from './currency';

const EMPTY_VALUE = '-';
const AMOUNT_LOCALE = 'en-US';
const AMOUNT_MIN_DIGITS = 2;
const UNIT_PRICE_DIGITS = 6;

/**
 * 格式化计费金额
 *
 * 金额按展示币种换算后输出，小数位默认取后端展示配置
 *
 * @param value 结算币种金额
 * @param maxDigits 小数位上限，用于单价等需要更高精度的场景
 * @returns 格式化文本
 */
export function formatBillingAmount(
  value?: AIBuddyBillingDecimal | null,
  maxDigits?: number,
): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY_VALUE;
  }

  const amount = convertBillingAmount(value);
  if (!Number.isFinite(amount)) {
    return EMPTY_VALUE;
  }

  const currency = getBillingCurrency();
  const decimals = Math.max(
    0,
    Math.trunc(maxDigits ?? currency.decimals ?? AMOUNT_MIN_DIGITS),
  );
  const text = amount.toLocaleString(AMOUNT_LOCALE, {
    minimumFractionDigits: Math.min(AMOUNT_MIN_DIGITS, decimals),
    maximumFractionDigits: decimals,
  });

  return `${currency.symbol}${text}`;
}

/**
 * 格式化单价（每百万 token / 每张图片价格）
 *
 * @param value 结算币种单价
 * @returns 格式化文本
 */
export function formatBillingUnitPrice(
  value?: AIBuddyBillingDecimal | null,
): string {
  return formatBillingAmount(value, UNIT_PRICE_DIGITS);
}

/**
 * 格式化 token 数量
 *
 * @param value token 数
 * @returns 格式化文本
 */
export function formatBillingTokens(value?: null | number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }

  return value.toLocaleString(AMOUNT_LOCALE);
}

/**
 * 格式化预算预警比例
 *
 * @param value 0 到 1 的比例
 * @returns 百分比文本
 */
export function formatBillingRatio(value?: null | number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }

  return `${Number((value * 100).toFixed(1))}%`;
}
