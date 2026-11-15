import type {
  AIBuddyBillingDecimal,
  AIBuddyBillingPriceParams,
  AIBuddyBillingPriceResult,
  AIBuddyBillingPriceTier,
  AIBuddyBillingPriceUpdateParams,
  AIBuddyBillingPriceWindow,
} from '../api';

/** 峰谷时段表单值，单价留空表示沿用基础价 */
export interface AIBuddyBillingPriceWindowFormValues {
  name?: null | string;
  days?: null | number[];
  start?: null | string;
  end?: null | string;
  multiplier?: AIBuddyBillingDecimal | null;
  input_price?: AIBuddyBillingDecimal | null;
  output_price?: AIBuddyBillingDecimal | null;
  cache_read_price?: AIBuddyBillingDecimal | null;
  cache_write_price?: AIBuddyBillingDecimal | null;
}

/** 上下文阶梯价表单值，单价留空表示沿用基础价 */
export interface AIBuddyBillingPriceTierFormValues {
  threshold?: AIBuddyBillingDecimal | null;
  input_price?: AIBuddyBillingDecimal | null;
  output_price?: AIBuddyBillingDecimal | null;
  cache_read_price?: AIBuddyBillingDecimal | null;
  cache_write_price?: AIBuddyBillingDecimal | null;
}

export interface AIBuddyBillingPriceFormValues {
  provider_id?: null | number;
  model_id?: null | string;
  input_price?: AIBuddyBillingDecimal | null;
  output_price?: AIBuddyBillingDecimal | null;
  cache_read_price?: AIBuddyBillingDecimal | null;
  cache_write_price?: AIBuddyBillingDecimal | null;
  input_audio_price?: AIBuddyBillingDecimal | null;
  output_audio_price?: AIBuddyBillingDecimal | null;
  cache_audio_read_price?: AIBuddyBillingDecimal | null;
  image_price?: AIBuddyBillingDecimal | null;
  time_windows?: AIBuddyBillingPriceWindowFormValues[] | null;
  context_tiers?: AIBuddyBillingPriceTierFormValues[] | null;
  effective_from: string;
  effective_to?: null | string;
}

/**
 * 将单价规范为非负数值，空值和非法值按 0 处理
 *
 * @param value 表单单价
 * @returns 非负数值
 */
export function normalizePriceAmount(
  value?: AIBuddyBillingDecimal | null,
): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

/**
 * 将可选单价规范为非负数值，空值返回 null（表示沿用基础价）
 *
 * @param value 表单单价
 * @returns 非负数值或 null
 */
export function normalizeOptionalPrice(
  value?: AIBuddyBillingDecimal | null,
): null | number {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * 将倍率规范为大于 0 的数值，非法值按 1 处理
 *
 * @param value 表单倍率
 * @returns 大于 0 的数值
 */
export function normalizeMultiplier(
  value?: AIBuddyBillingDecimal | null,
): number {
  const multiplier = Number(value);
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

/**
 * 生成峰谷时段请求参数
 *
 * @param windows 表单时段
 * @returns 请求参数
 */
export function createAIBuddyBillingPriceWindowsPayload(
  windows?: AIBuddyBillingPriceWindowFormValues[] | null,
): AIBuddyBillingPriceWindow[] {
  return (windows ?? [])
    .map((window) => ({
      name: (window.name ?? '').trim(),
      days: [...new Set((window.days ?? []).map(Number))]
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
        .toSorted((left, right) => left - right),
      start: window.start ?? '00:00',
      end: window.end ?? '00:00',
      multiplier: normalizeMultiplier(window.multiplier),
      input_price: normalizeOptionalPrice(window.input_price),
      output_price: normalizeOptionalPrice(window.output_price),
      cache_read_price: normalizeOptionalPrice(window.cache_read_price),
      cache_write_price: normalizeOptionalPrice(window.cache_write_price),
    }))
    .filter((window) => window.name.length > 0);
}

/**
 * 生成上下文阶梯价请求参数，按阈值升序去重
 *
 * @param tiers 表单阶梯价
 * @returns 请求参数
 */
export function createAIBuddyBillingPriceTiersPayload(
  tiers?: AIBuddyBillingPriceTierFormValues[] | null,
): AIBuddyBillingPriceTier[] {
  const tierMap = new Map<number, AIBuddyBillingPriceTier>();

  for (const tier of tiers ?? []) {
    const threshold = Number(tier.threshold);
    if (!Number.isInteger(threshold) || threshold <= 0) {
      continue;
    }
    const payload: AIBuddyBillingPriceTier = {
      threshold,
      input_price: normalizeOptionalPrice(tier.input_price),
      output_price: normalizeOptionalPrice(tier.output_price),
      cache_read_price: normalizeOptionalPrice(tier.cache_read_price),
      cache_write_price: normalizeOptionalPrice(tier.cache_write_price),
    };
    // 至少配置一项单价，否则后端校验不通过
    if (
      payload.input_price === null &&
      payload.output_price === null &&
      payload.cache_read_price === null &&
      payload.cache_write_price === null
    ) {
      continue;
    }
    if (!tierMap.has(threshold)) {
      tierMap.set(threshold, payload);
    }
  }

  return [...tierMap.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([, tier]) => tier);
}

/**
 * 生成创建价格请求参数
 *
 * @param values 表单值
 * @returns 请求参数
 */
export function createAIBuddyBillingPricePayload(
  values: AIBuddyBillingPriceFormValues,
): AIBuddyBillingPriceParams {
  return {
    provider_id: Number(values.provider_id),
    model_id: (values.model_id ?? '').trim(),
    input_price: normalizePriceAmount(values.input_price),
    output_price: normalizePriceAmount(values.output_price),
    cache_read_price: normalizePriceAmount(values.cache_read_price),
    cache_write_price: normalizePriceAmount(values.cache_write_price),
    input_audio_price: normalizePriceAmount(values.input_audio_price),
    output_audio_price: normalizePriceAmount(values.output_audio_price),
    cache_audio_read_price: normalizePriceAmount(values.cache_audio_read_price),
    image_price: normalizePriceAmount(values.image_price),
    time_windows: createAIBuddyBillingPriceWindowsPayload(values.time_windows),
    context_tiers: createAIBuddyBillingPriceTiersPayload(values.context_tiers),
    effective_from: values.effective_from,
    effective_to: values.effective_to || null,
  };
}

export interface AIBuddyBillingPriceUpdateFormValues {
  input_price?: AIBuddyBillingDecimal | null;
  output_price?: AIBuddyBillingDecimal | null;
  cache_read_price?: AIBuddyBillingDecimal | null;
  cache_write_price?: AIBuddyBillingDecimal | null;
  input_audio_price?: AIBuddyBillingDecimal | null;
  output_audio_price?: AIBuddyBillingDecimal | null;
  cache_audio_read_price?: AIBuddyBillingDecimal | null;
  image_price?: AIBuddyBillingDecimal | null;
  time_windows?: AIBuddyBillingPriceWindowFormValues[] | null;
  context_tiers?: AIBuddyBillingPriceTierFormValues[] | null;
  effective_to?: null | string;
}

/**
 * 生成更新价格请求参数
 *
 * @param values 表单值
 * @returns 请求参数
 */
export function createAIBuddyBillingPriceUpdatePayload(
  values: AIBuddyBillingPriceUpdateFormValues,
): AIBuddyBillingPriceUpdateParams {
  return {
    input_price: normalizePriceAmount(values.input_price),
    output_price: normalizePriceAmount(values.output_price),
    cache_read_price: normalizePriceAmount(values.cache_read_price),
    cache_write_price: normalizePriceAmount(values.cache_write_price),
    input_audio_price: normalizePriceAmount(values.input_audio_price),
    output_audio_price: normalizePriceAmount(values.output_audio_price),
    cache_audio_read_price: normalizePriceAmount(values.cache_audio_read_price),
    image_price: normalizePriceAmount(values.image_price),
    time_windows: createAIBuddyBillingPriceWindowsPayload(values.time_windows),
    context_tiers: createAIBuddyBillingPriceTiersPayload(values.context_tiers),
    effective_to: values.effective_to || null,
  };
}

/**
 * 判断价格是否在指定时间生效
 *
 * @param price 价格记录
 * @param now 判定时间
 * @returns 是否生效
 */
export function isPriceActive(
  price: AIBuddyBillingPriceResult,
  now: Date = new Date(),
): boolean {
  const start = new Date(price.effective_from).getTime();
  if (!Number.isFinite(start) || start > now.getTime()) {
    return false;
  }

  if (!price.effective_to) {
    return true;
  }

  const end = new Date(price.effective_to).getTime();
  return !Number.isFinite(end) || end > now.getTime();
}
