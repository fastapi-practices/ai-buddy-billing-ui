import type { AIBuddyBillingDecimal } from '../api';

const EMPTY_VALUE = '-';
const AMOUNT_LOCALE = 'en-US';
const AMOUNT_MIN_DIGITS = 2;
const AMOUNT_MAX_DIGITS = 4;

/**
 * 格式化计费金额，后端 Decimal 可能以字符串返回
 *
 * @param value 金额
 * @param maxDigits 小数位上限
 * @returns 格式化文本
 */
export function formatBillingAmount(
  value?: AIBuddyBillingDecimal | null,
  maxDigits: number = AMOUNT_MAX_DIGITS,
): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY_VALUE;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return EMPTY_VALUE;
  }

  return amount.toLocaleString(AMOUNT_LOCALE, {
    minimumFractionDigits: AMOUNT_MIN_DIGITS,
    maximumFractionDigits: Math.max(AMOUNT_MIN_DIGITS, maxDigits),
  });
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
