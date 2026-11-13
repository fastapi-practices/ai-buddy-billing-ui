import type {
  AIBuddyBillingDecimal,
  AIBuddyBillingPriceParams,
  AIBuddyBillingPriceResult,
  AIBuddyBillingPriceUpdateParams,
} from '../api';

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
  effective_from: string;
  effective_to?: null | string;
}

/**
 * 将单价规范为非负数值，空值和非法值按 0 处理
 *
 * @param value 表单单价
 * @returns 非负数值
 */
export function normalizePriceAmount(value?: AIBuddyBillingDecimal | null): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
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
