import type {
  AIBuddyBillingCurrencyResult,
  AIBuddyBillingDecimal,
} from '../api';

import { getAIBuddyBillingCurrencyApi } from '../api';

/**
 * 展示币种兜底值
 *
 * 后端所有金额都以结算币种（USD）存储，接口只返回展示配置，
 * 进入页面拿到配置前按 1:1 展示，避免金额闪烁成空
 */
const DEFAULT_CURRENCY: AIBuddyBillingCurrencyResult = {
  code: 'USD',
  decimals: 2,
  rate: 1,
  settlement_currency: 'USD',
  symbol: '$',
};

let displayCurrency: AIBuddyBillingCurrencyResult = DEFAULT_CURRENCY;
let currencyRequest: null | Promise<AIBuddyBillingCurrencyResult> = null;

/**
 * 加载展示币种配置（结果会被缓存，重复调用不会重复请求）
 *
 * @returns 展示币种配置
 */
export function loadBillingCurrency(): Promise<AIBuddyBillingCurrencyResult> {
  if (currencyRequest) {
    return currencyRequest;
  }

  currencyRequest = getAIBuddyBillingCurrencyApi()
    .then((data) => {
      displayCurrency = { ...DEFAULT_CURRENCY, ...data };
      return displayCurrency;
    })
    .catch(() => {
      displayCurrency = DEFAULT_CURRENCY;
      return displayCurrency;
    });

  return currencyRequest;
}

/**
 * 获取当前展示币种配置
 *
 * @returns 展示币种配置
 */
export function getBillingCurrency(): AIBuddyBillingCurrencyResult {
  return displayCurrency;
}

/** 结算币种（金额存储与入账单位，固定为 USD） */
export function settlementCurrencyCode(): string {
  return displayCurrency.settlement_currency ?? 'USD';
}

/**
 * 把结算币种金额换算为展示币种金额
 *
 * @param value 结算币种金额
 * @returns 展示币种金额
 */
export function convertBillingAmount(
  value?: AIBuddyBillingDecimal | null,
): number {
  const amount = Number(value ?? 0);
  const rate = Number(displayCurrency.rate ?? 1);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) {
    return Number.NaN;
  }
  return amount * rate;
}
