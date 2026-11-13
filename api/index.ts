import type { PaginationResult } from '#/types';

import { requestClient } from '#/api/request';

/** 后端 Decimal 字段可能以数字或字符串返回 */
export type AIBuddyBillingDecimal = number | string;
export type AIBuddyBillingStatusType = 0 | 1;
export type AIBuddyBillingBudgetWindow =
  | 'conversation'
  | 'day'
  | 'month'
  | 'run'
  | 'total';
export type AIBuddyBillingLedgerStatus = 'billed' | 'provider_cost' | 'unpriced';
export type AIBuddyBillingTransactionType =
  | 'adjust'
  | 'consume'
  | 'recharge'
  | 'refund';

interface AIBuddyBillingPageQueryParams {
  page?: number;
  size?: number;
}

export interface AIBuddyBillingPriceQueryParams extends AIBuddyBillingPageQueryParams {
  active?: boolean | null;
  model_id?: null | string;
  provider_id?: null | number;
}

export interface AIBuddyBillingPriceParams {
  provider_id: number;
  model_id: string;
  input_price?: AIBuddyBillingDecimal;
  output_price?: AIBuddyBillingDecimal;
  cache_read_price?: AIBuddyBillingDecimal;
  cache_write_price?: AIBuddyBillingDecimal;
  input_audio_price?: AIBuddyBillingDecimal;
  output_audio_price?: AIBuddyBillingDecimal;
  cache_audio_read_price?: AIBuddyBillingDecimal;
  image_price?: AIBuddyBillingDecimal;
  effective_from: string;
  effective_to?: null | string;
}

export interface AIBuddyBillingPriceResult extends AIBuddyBillingPriceParams {
  id: number;
  created_time: string;
  updated_time?: null | string;
}

export interface AIBuddyBillingAccountQueryParams {
  user_id?: null | number;
  page?: number;
  size?: number;
}

export interface AIBuddyBillingPriceUpdateParams {
  input_price?: AIBuddyBillingDecimal;
  output_price?: AIBuddyBillingDecimal;
  cache_read_price?: AIBuddyBillingDecimal;
  cache_write_price?: AIBuddyBillingDecimal;
  input_audio_price?: AIBuddyBillingDecimal;
  output_audio_price?: AIBuddyBillingDecimal;
  cache_audio_read_price?: AIBuddyBillingDecimal;
  image_price?: AIBuddyBillingDecimal;
  effective_to?: null | string;
}

export interface AIBuddyBillingAccountResult {
  id: number;
  user_id: number;
  balance: AIBuddyBillingDecimal;
  currency: string;
  version: number;
  created_time: string;
  updated_time?: null | string;
}

export interface AIBuddyBillingTransactionQueryParams extends AIBuddyBillingPageQueryParams {
  user_id?: null | number;
  transaction_type?: AIBuddyBillingTransactionType | null;
  start_time?: null | string;
  end_time?: null | string;
}

export interface AIBuddyBillingTransactionResult {
  id: number;
  account_id: number;
  user_id: number;
  transaction_type: AIBuddyBillingTransactionType;
  amount: AIBuddyBillingDecimal;
  balance_after: AIBuddyBillingDecimal;
  currency: string;
  reference_type: string;
  reference_id: string;
  remark?: null | string;
  created_time: string;
}

export interface AIBuddyBillingRechargeParams {
  user_id: number;
  amount: AIBuddyBillingDecimal;
  remark?: null | string;
}

export interface AIBuddyBillingAdjustmentParams {
  user_id: number;
  amount: AIBuddyBillingDecimal;
  remark?: null | string;
}

export interface AIBuddyBillingBudgetQueryParams extends AIBuddyBillingPageQueryParams {
  user_id?: null | number;
  window?: AIBuddyBillingBudgetWindow | null;
  status?: AIBuddyBillingStatusType | null;
}

export interface AIBuddyBillingBudgetParams {
  user_id: number;
  window: AIBuddyBillingBudgetWindow;
  usd_limit?: AIBuddyBillingDecimal | null;
  token_limit?: null | number;
  warn_at?: null | number;
  status?: AIBuddyBillingStatusType;
}

export interface AIBuddyBillingBudgetUpdateParams {
  usd_limit?: AIBuddyBillingDecimal | null;
  token_limit?: null | number;
  warn_at?: null | number;
  status?: AIBuddyBillingStatusType;
}

export interface AIBuddyBillingBudgetResult extends AIBuddyBillingBudgetParams {
  id: number;
  warn_at: null | number;
  status: AIBuddyBillingStatusType;
  created_time: string;
  updated_time?: null | string;
}

export interface AIBuddyBillingLedgerQueryParams extends AIBuddyBillingPageQueryParams {
  user_id?: null | number;
  conversation_id?: null | string;
  provider_id?: null | number;
  model_id?: null | string;
  status?: AIBuddyBillingLedgerStatus | null;
  start_time?: null | string;
  end_time?: null | string;
}

export interface AIBuddyBillingLedgerResult {
  id: number;
  source_message_id: number;
  source_response_index: number;
  user_id: number;
  conversation_id: string;
  provider_id: number;
  model_id: string;
  run_id?: null | string;
  usage_time: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  input_audio_tokens: number;
  output_audio_tokens: number;
  cache_audio_read_tokens: number;
  generated_images: number;
  provider_cost?: AIBuddyBillingDecimal | null;
  billed_cost: AIBuddyBillingDecimal;
  price_id?: null | number;
  status: AIBuddyBillingLedgerStatus;
  created_time: string;
}

export interface AIBuddyBillingSummaryResult {
  start_time?: null | string;
  end_time?: null | string;
  usage_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  generated_images: number;
  provider_cost: AIBuddyBillingDecimal;
  billed_cost: AIBuddyBillingDecimal;
}

export interface AIBuddyBillingReconcileResult {
  processed: number;
  recorded: number;
  billed: number;
  unpriced: number;
}

export interface AIBuddyBillingProviderOptionResult {
  id: number;
  name: string;
  status: AIBuddyBillingStatusType;
  type: number;
}

export interface AIBuddyBillingModelOptionResult {
  id: number;
  model_id: string;
  name: string;
  kind: string;
  status: AIBuddyBillingStatusType;
}

export async function getAIBuddyBillingPricesApi(
  params?: AIBuddyBillingPriceQueryParams,
) {
  return requestClient.get<PaginationResult<AIBuddyBillingPriceResult>>(
    '/api/v1/ai-buddy-billing/prices',
    { params },
  );
}

export async function getActiveAIBuddyBillingPricesApi(
  params?: Omit<AIBuddyBillingPriceQueryParams, 'active'>,
) {
  return requestClient.get<AIBuddyBillingPriceResult[]>(
    '/api/v1/ai-buddy-billing/prices/active',
    { params },
  );
}

export async function createAIBuddyBillingPriceApi(data: AIBuddyBillingPriceParams) {
  return requestClient.post<AIBuddyBillingPriceResult>(
    '/api/v1/ai-buddy-billing/prices',
    data,
  );
}

export async function updateAIBuddyBillingPriceApi(
  pk: number,
  data: AIBuddyBillingPriceUpdateParams,
) {
  return requestClient.put<AIBuddyBillingPriceResult>(
    `/api/v1/ai-buddy-billing/prices/${pk}`,
    data,
  );
}

export async function deleteAIBuddyBillingPriceApi(pk: number) {
  return requestClient.delete(`/api/v1/ai-buddy-billing/prices/${pk}`);
}

export async function getAIBuddyBillingAccountsApi(
  params?: AIBuddyBillingAccountQueryParams,
) {
  return requestClient.get<PaginationResult<AIBuddyBillingAccountResult>>(
    '/api/v1/ai-buddy-billing/accounts',
    { params },
  );
}

export async function getMyAIBuddyBillingAccountApi() {
  return requestClient.get<AIBuddyBillingAccountResult>(
    '/api/v1/ai-buddy-billing/accounts/me',
  );
}

export async function getAIBuddyBillingTransactionsApi(
  params?: AIBuddyBillingTransactionQueryParams,
) {
  return requestClient.get<PaginationResult<AIBuddyBillingTransactionResult>>(
    '/api/v1/ai-buddy-billing/accounts/transactions',
    { params },
  );
}

export async function rechargeAIBuddyBillingAccountApi(
  data: AIBuddyBillingRechargeParams,
) {
  return requestClient.post<AIBuddyBillingAccountResult>(
    '/api/v1/ai-buddy-billing/accounts/recharges',
    data,
  );
}

export async function adjustAIBuddyBillingAccountApi(
  data: AIBuddyBillingAdjustmentParams,
) {
  return requestClient.post<AIBuddyBillingAccountResult>(
    '/api/v1/ai-buddy-billing/accounts/adjustments',
    data,
  );
}

export async function getAIBuddyBillingBudgetsApi(
  params?: AIBuddyBillingBudgetQueryParams,
) {
  return requestClient.get<PaginationResult<AIBuddyBillingBudgetResult>>(
    '/api/v1/ai-buddy-billing/budgets',
    { params },
  );
}

export async function createAIBuddyBillingBudgetApi(data: AIBuddyBillingBudgetParams) {
  return requestClient.post<AIBuddyBillingBudgetResult>(
    '/api/v1/ai-buddy-billing/budgets',
    data,
  );
}

export async function updateAIBuddyBillingBudgetApi(
  pk: number,
  data: AIBuddyBillingBudgetUpdateParams,
) {
  return requestClient.put<AIBuddyBillingBudgetResult>(
    `/api/v1/ai-buddy-billing/budgets/${pk}`,
    data,
  );
}

export async function deleteAIBuddyBillingBudgetApi(pk: number) {
  return requestClient.delete(`/api/v1/ai-buddy-billing/budgets/${pk}`);
}

export async function getAIBuddyBillingLedgerApi(
  params?: AIBuddyBillingLedgerQueryParams,
) {
  return requestClient.get<PaginationResult<AIBuddyBillingLedgerResult>>(
    '/api/v1/ai-buddy-billing/ledger',
    { params },
  );
}

export async function getAIBuddyBillingSummaryApi(
  params?: Omit<AIBuddyBillingLedgerQueryParams, 'page' | 'size'>,
) {
  return requestClient.get<AIBuddyBillingSummaryResult>(
    '/api/v1/ai-buddy-billing/summary',
    { params },
  );
}

export async function reconcileAIBuddyBillingApi() {
  return requestClient.post<AIBuddyBillingReconcileResult>(
    '/api/v1/ai-buddy-billing/reconcile',
    undefined,
  );
}

export async function getAIBuddyBillingProviderOptionsApi() {
  return requestClient.get<AIBuddyBillingProviderOptionResult[]>(
    '/api/v1/providers/all',
  );
}

export async function getAIBuddyBillingModelOptionsApi(providerId: number) {
  return requestClient.get<AIBuddyBillingModelOptionResult[]>(
    '/api/v1/models/all',
    {
      params: { provider_id: providerId },
    },
  );
}
