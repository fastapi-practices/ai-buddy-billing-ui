import type {
  AIBuddyBillingAccountResult,
  AIBuddyBillingBudgetResult,
  AIBuddyBillingBudgetWindow,
  AIBuddyBillingLedgerStatus,
  AIBuddyBillingPriceResult,
  AIBuddyBillingPriceSource,
  AIBuddyBillingPriceSyncStatus,
  AIBuddyBillingTransactionType,
} from '../api';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';

import { $t } from '@vben/locales';

import { DictEnum, getDictOptions } from '#/utils/dict';

import {
  formatBillingAmount,
  formatBillingRatio,
  formatBillingTokens,
  formatBillingUnitPrice,
} from './format';
import { settlementCurrencyCode } from './currency';
import { isPriceActive } from './price-params';

export interface BillingSelectOption<T = number | string> {
  label: string;
  value: T;
}

/** 后端要求时间携带时区偏移，统一按 ISO 8601 提交 */
export const BILLING_DATE_TIME_VALUE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
const BILLING_DATE_TIME_DISPLAY_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const BUDGET_WINDOWS: AIBuddyBillingBudgetWindow[] = [
  'run',
  'conversation',
  'day',
  'month',
  'total',
];

export const LEDGER_STATUSES: AIBuddyBillingLedgerStatus[] = [
  'billed',
  'provider_cost',
  'unpriced',
];

export const TRANSACTION_TYPES: AIBuddyBillingTransactionType[] = [
  'recharge',
  'consume',
  'adjust',
  'refund',
];

export function budgetWindowLabel(window: AIBuddyBillingBudgetWindow): string {
  return $t(`ai-buddy-billing.window.${window}`);
}

export function ledgerStatusLabel(status: AIBuddyBillingLedgerStatus): string {
  return $t(`ai-buddy-billing.ledgerStatus.${status}`);
}

export function transactionTypeLabel(
  type: AIBuddyBillingTransactionType,
): string {
  return $t(`ai-buddy-billing.transactionType.${type}`);
}

export function priceSourceLabel(source: AIBuddyBillingPriceSource): string {
  return $t(`ai-buddy-billing.price.source.${source.replaceAll(/[.-]/g, '_')}`);
}

export function priceSyncStatusLabel(
  status: AIBuddyBillingPriceSyncStatus,
): string {
  return $t(`ai-buddy-billing.price.sync.status.${status}`);
}

/** ISO 星期选项（1-7） */
export function weekdayOptions(): BillingSelectOption<number>[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => ({
    label: $t(`ai-buddy-billing.weekday.${day}`),
    value: day,
  }));
}

/**
 * 汇总峰谷时段与阶梯价特性的展示文本
 *
 * @param price 价格记录
 * @returns 特性展示文本
 */
export function priceFeatureText(price: AIBuddyBillingPriceResult): string {
  const features: string[] = [];
  if (price.is_default) {
    features.push($t('ai-buddy-billing.price.defaultPrice'));
  }
  if (price.time_windows?.length) {
    features.push(
      $t('ai-buddy-billing.price.windowCount', [price.time_windows.length]),
    );
  }
  if (price.context_tiers?.length) {
    features.push(
      $t('ai-buddy-billing.price.tierCount', [price.context_tiers.length]),
    );
  }
  return features.length > 0 ? features.join(' / ') : '-';
}

/** 价格字段对应的展示文案 */
const PRICE_FIELD_LABEL_KEYS: Record<string, string> = {
  cache_audio_read_price: 'ai-buddy-billing.price.audioCachePrice',
  cache_read_price: 'ai-buddy-billing.price.cacheReadPrice',
  cache_write_price: 'ai-buddy-billing.price.cacheWritePrice',
  context_tiers: 'ai-buddy-billing.price.contextTiers',
  image_price: 'ai-buddy-billing.price.imagePrice',
  input_audio_price: 'ai-buddy-billing.price.audioInputPrice',
  input_price: 'ai-buddy-billing.price.inputPrice',
  output_audio_price: 'ai-buddy-billing.price.audioOutputPrice',
  output_price: 'ai-buddy-billing.price.outputPrice',
  time_windows: 'ai-buddy-billing.price.timeWindows',
};

/** 结构化的价格字段（JSON 数组），明细里只展示字段名 */
const STRUCTURED_PRICE_FIELDS = new Set(['context_tiers', 'time_windows']);

/**
 * 获取价格字段的展示文案
 *
 * @param field 后端价格字段名
 * @returns 展示文案
 */
export function priceFieldLabel(field: string): string {
  const key = PRICE_FIELD_LABEL_KEYS[field];
  return key ? $t(key) : field;
}

/**
 * 判断价格字段是否为数组结构（峰谷时段 / 上下文阶梯价）
 *
 * @param field 后端价格字段名
 * @returns 是否为数组结构
 */
export function isStructuredPriceField(field: string): boolean {
  return STRUCTURED_PRICE_FIELDS.has(field);
}

/**
 * 格式化同步明细中的单价，非数值内容原样返回
 *
 * @param value 后端返回的单价字符串
 * @returns 展示文本
 */
export function formatSyncPriceDelta(
  current?: null | string,
  next?: null | string,
): string {
  const before = Number(current);
  const after = Number(next);
  if (!Number.isFinite(before) || !Number.isFinite(after)) {
    return '';
  }
  const diff = after - before;
  if (diff === 0) {
    return '';
  }
  const sign = diff > 0 ? '+' : '-';
  return `${sign}${formatBillingUnitPrice(Math.abs(diff))}`;
}

export function formatSyncPriceValue(value?: null | string): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? formatBillingUnitPrice(amount) : value;
}

export function budgetWindowOptions(): BillingSelectOption<AIBuddyBillingBudgetWindow>[] {
  return BUDGET_WINDOWS.map((value) => ({
    label: budgetWindowLabel(value),
    value,
  }));
}

export function ledgerStatusOptions(): BillingSelectOption<AIBuddyBillingLedgerStatus>[] {
  return LEDGER_STATUSES.map((value) => ({
    label: ledgerStatusLabel(value),
    value,
  }));
}

export function transactionTypeOptions(): BillingSelectOption<AIBuddyBillingTransactionType>[] {
  return TRANSACTION_TYPES.map((value) => ({
    label: transactionTypeLabel(value),
    value,
  }));
}

function dateTimeSchema(fieldName: string, label: string): VbenFormSchema {
  return {
    component: 'DatePicker',
    componentProps: {
      class: 'w-full',
      format: BILLING_DATE_TIME_DISPLAY_FORMAT,
      showTime: true,
      valueFormat: BILLING_DATE_TIME_VALUE_FORMAT,
    },
    fieldName,
    label,
  };
}

export function queryLedgerSchema(options: {
  providerOptions: () => BillingSelectOption[];
}): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 1,
      },
      fieldName: 'user_id',
      label: $t('ai-buddy-billing.account.userId'),
    },
    {
      component: 'Input',
      fieldName: 'conversation_id',
      label: $t('ai-buddy-billing.usage.conversation'),
    },
    {
      component: 'Select',
      componentProps: () => ({
        allowClear: true,
        class: 'w-full',
        options: options.providerOptions(),
      }),
      fieldName: 'provider_id',
      label: $t('ai-buddy-billing.price.provider'),
    },
    {
      component: 'Input',
      fieldName: 'model_id',
      label: $t('ai-buddy-billing.price.model'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: ledgerStatusOptions(),
      },
      fieldName: 'status',
      label: $t('ai-buddy-billing.usage.status'),
    },
    dateTimeSchema('start_time', $t('ai-buddy-billing.usage.startTime')),
    dateTimeSchema('end_time', $t('ai-buddy-billing.usage.endTime')),
  ];
}

export function queryPriceSchema(options: {
  providerOptions: () => BillingSelectOption[];
}): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: () => ({
        allowClear: true,
        class: 'w-full',
        options: options.providerOptions(),
      }),
      fieldName: 'provider_id',
      label: $t('ai-buddy-billing.price.provider'),
    },
    {
      component: 'Input',
      fieldName: 'model_id',
      label: $t('ai-buddy-billing.price.model'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: [
          { label: $t('ai-buddy-billing.price.activeFilter'), value: true },
          {
            label: $t('ai-buddy-billing.price.allFilter'),
            value: false,
          },
        ],
      },
      fieldName: 'active',
      label: $t('ai-buddy-billing.price.effective'),
    },
  ];
}

export function createPriceSchema(options: {
  isEdit?: boolean;
  modelOptions: () => BillingSelectOption[];
  onProviderChange: (providerId?: null | number) => Promise<void> | void;
  providerOptions: () => BillingSelectOption[];
}): VbenFormSchema[] {
  const isEdit = Boolean(options.isEdit);
  return [
    {
      component: 'Select',
      componentProps: () => ({
        class: 'w-full',
        disabled: isEdit,
        options: options.providerOptions(),
      }),
      fieldName: 'provider_id',
      help: $t('ai-buddy-billing.price.providerHelp'),
      label: $t('ai-buddy-billing.price.provider'),
      ...(isEdit ? {} : { rules: 'selectRequired' as const }),
      dependencies: {
        triggerFields: ['provider_id'],
        trigger: (values) => {
          void options.onProviderChange(values.provider_id as null | number);
        },
      },
    },
    {
      component: 'AutoComplete',
      componentProps: (values) => {
        const isDefault = Number(values.provider_id) === 0;
        return {
          class: 'w-full',
          disabled: isEdit || isDefault,
          options: isDefault
            ? [{ label: '*', value: '*' }]
            : options.modelOptions(),
        };
      },
      fieldName: 'model_id',
      help: (values) => {
        if (Number(values.provider_id) === 0) {
          return $t('ai-buddy-billing.price.defaultModelHelp');
        }
        return isEdit ? '' : $t('ai-buddy-billing.price.modelHelp');
      },
      label: $t('ai-buddy-billing.price.model'),
      ...(isEdit ? {} : { rules: 'required' as const }),
    },
    ...(
      [
        ['input_price', 'inputPrice'],
        ['output_price', 'outputPrice'],
        ['cache_read_price', 'cacheReadPrice'],
        ['cache_write_price', 'cacheWritePrice'],
        ['input_audio_price', 'audioInputPrice'],
        ['output_audio_price', 'audioOutputPrice'],
        ['cache_audio_read_price', 'audioCachePrice'],
      ] as const
    ).map(([fieldName, label]) => ({
      component: 'InputNumber' as const,
      componentProps: {
        addonAfter: settlementCurrencyCode(),
        class: 'w-full',
        min: 0,
        precision: 6,
      },
      defaultValue: 0,
      fieldName,
      help:
        fieldName === 'input_price'
          ? $t('ai-buddy-billing.price.moneyHelp')
          : undefined,
      label: $t(`ai-buddy-billing.price.${label}`),
    })),
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: settlementCurrencyCode(),
        class: 'w-full',
        min: 0,
        precision: 6,
      },
      defaultValue: 0,
      fieldName: 'image_price',
      label: $t('ai-buddy-billing.price.imagePrice'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        disabled: isEdit,
        format: BILLING_DATE_TIME_DISPLAY_FORMAT,
        showTime: true,
        valueFormat: BILLING_DATE_TIME_VALUE_FORMAT,
      },
      fieldName: 'effective_from',
      label: $t('ai-buddy-billing.price.effectiveFrom'),
      ...(isEdit ? {} : { rules: 'required' as const }),
    },
    dateTimeSchema('effective_to', $t('ai-buddy-billing.price.effectiveTo')),
  ];
}

export const queryTransactionSchema: VbenFormSchema[] = [
  {
    component: 'InputNumber',
    componentProps: {
      class: 'w-full',
      min: 1,
    },
    fieldName: 'user_id',
    label: $t('ai-buddy-billing.account.userId'),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      class: 'w-full',
      options: transactionTypeOptions(),
    },
    fieldName: 'transaction_type',
    label: $t('ai-buddy-billing.account.transactionType'),
  },
  dateTimeSchema('start_time', $t('ai-buddy-billing.usage.startTime')),
  dateTimeSchema('end_time', $t('ai-buddy-billing.usage.endTime')),
];

/** 账户流水查询，用户由列表行指定，无需手动输入 */
export const queryUserTransactionSchema: VbenFormSchema[] = [
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      class: 'w-full',
      options: transactionTypeOptions(),
    },
    fieldName: 'transaction_type',
    label: $t('ai-buddy-billing.account.transactionType'),
  },
  dateTimeSchema('start_time', $t('ai-buddy-billing.usage.startTime')),
  dateTimeSchema('end_time', $t('ai-buddy-billing.usage.endTime')),
];

export const queryBudgetSchema: VbenFormSchema[] = [
  {
    component: 'InputNumber',
    componentProps: {
      class: 'w-full',
      min: 1,
    },
    fieldName: 'user_id',
    label: $t('ai-buddy-billing.account.userId'),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      class: 'w-full',
      options: budgetWindowOptions(),
    },
    fieldName: 'window',
    label: $t('ai-buddy-billing.budget.window'),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: getDictOptions(DictEnum.SYS_STATUS),
    },
    fieldName: 'status',
    label: $t('ai-buddy-billing.budget.status'),
  },
];

export function createBudgetSchema(options: {
  isEdit: boolean;
}): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 1,
      },
      fieldName: 'user_id',
      label: $t('ai-buddy-billing.account.userId'),
      ...(options.isEdit ? {} : { rules: 'required' as const }),
      dependencies: {
        show: !options.isEdit,
        triggerFields: ['user_id'],
      },
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: budgetWindowOptions(),
      },
      fieldName: 'window',
      label: $t('ai-buddy-billing.budget.window'),
      ...(options.isEdit ? {} : { rules: 'selectRequired' as const }),
      dependencies: {
        show: !options.isEdit,
        triggerFields: ['window'],
      },
    },
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: settlementCurrencyCode(),
        class: 'w-full',
        min: 0,
        precision: 4,
      },
      fieldName: 'usd_limit',
      help: $t('ai-buddy-billing.budget.limitHelp'),
      label: $t('ai-buddy-billing.budget.usdLimit'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0,
        precision: 0,
      },
      fieldName: 'token_limit',
      help: $t('ai-buddy-billing.budget.limitHelp'),
      label: $t('ai-buddy-billing.budget.tokenLimit'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        max: 1,
        min: 0.01,
        precision: 2,
        step: 0.05,
      },
      fieldName: 'warn_at',
      help: $t('ai-buddy-billing.budget.warnAtHelp'),
      label: $t('ai-buddy-billing.budget.warnAt'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: getDictOptions(DictEnum.SYS_STATUS),
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('ai-buddy-billing.budget.status'),
      rules: 'required',
    },
  ];
}

export function createRechargeSchema(options: {
  isAdjustment: boolean;
}): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 1,
        precision: 0,
      },
      fieldName: 'user_id',
      label: $t('ai-buddy-billing.account.userId'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: settlementCurrencyCode(),
        class: 'w-full',
        precision: 4,
        ...(options.isAdjustment ? {} : { min: 0.0001 }),
      },
      fieldName: 'amount',
      help: options.isAdjustment
        ? $t('ai-buddy-billing.account.adjustHelp')
        : undefined,
      label: $t('ai-buddy-billing.account.amount'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        class: 'w-full',
        maxlength: 500,
        rows: 3,
        showCount: true,
      },
      fieldName: 'remark',
      label: $t('ai-buddy-billing.account.remark'),
    },
  ];
}

export function useLedgerColumns(
  providerName: (providerId: number) => string,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 60 },
    {
      field: 'usage_time',
      title: $t('ai-buddy-billing.usage.usageTime'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      width: 100,
    },
    {
      field: 'conversation_id',
      title: $t('ai-buddy-billing.usage.conversation'),
      showOverflow: 'tooltip',
      minWidth: 210,
    },
    {
      field: 'provider_id',
      title: $t('ai-buddy-billing.price.provider'),
      formatter: ({ cellValue }) => providerName(Number(cellValue)),
      minWidth: 130,
    },
    {
      field: 'model_id',
      title: $t('ai-buddy-billing.price.model'),
      showOverflow: 'tooltip',
      minWidth: 200,
    },
    {
      field: 'input_tokens',
      title: $t('ai-buddy-billing.usage.inputTokens'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      width: 120,
    },
    {
      field: 'output_tokens',
      title: $t('ai-buddy-billing.usage.outputTokens'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      width: 120,
    },
    {
      field: 'cache_read_tokens',
      title: $t('ai-buddy-billing.usage.cacheReadTokens'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      width: 140,
    },
    {
      field: 'cache_write_tokens',
      title: $t('ai-buddy-billing.usage.cacheWriteTokens'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      width: 140,
    },
    {
      field: 'output_reasoning_tokens',
      title: $t('ai-buddy-billing.usage.reasoningTokens'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      width: 140,
    },
    {
      field: 'input_audio_tokens',
      title: $t('ai-buddy-billing.usage.audioTokens'),
      align: 'right',
      formatter: ({ row }) =>
        [
          formatBillingTokens(row.input_audio_tokens),
          formatBillingTokens(row.output_audio_tokens),
          formatBillingTokens(row.cache_audio_read_tokens),
        ].join(' / '),
      minWidth: 200,
    },
    {
      field: 'generated_images',
      title: $t('ai-buddy-billing.usage.images'),
      align: 'right',
      width: 100,
    },
    {
      field: 'provider_cost',
      title: $t('ai-buddy-billing.usage.providerCost'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      width: 130,
    },
    {
      field: 'billed_cost',
      title: $t('ai-buddy-billing.usage.billedCost'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      width: 130,
    },
    {
      field: 'price_multiplier',
      title: $t('ai-buddy-billing.usage.pricing'),
      formatter: ({ row }) =>
        [
          `x${Number(row.price_multiplier ?? 1)}`,
          row.price_window,
          row.price_tier,
        ]
          .filter(Boolean)
          .join(' / '),
      minWidth: 150,
    },
    {
      field: 'status',
      title: $t('ai-buddy-billing.usage.status'),
      slots: { default: 'ledgerStatus' },
      width: 120,
    },
  ];
}

export function usePriceColumns(
  providerName: (providerId: number) => string,
  onActionClick?: OnActionClickFn<AIBuddyBillingPriceResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 60 },
    {
      field: 'provider_id',
      title: $t('ai-buddy-billing.price.provider'),
      formatter: ({ cellValue }) => providerName(Number(cellValue)),
      minWidth: 150,
    },
    {
      field: 'model_id',
      title: $t('ai-buddy-billing.price.model'),
      showOverflow: 'tooltip',
      minWidth: 220,
    },
    {
      field: 'source',
      title: $t('ai-buddy-billing.price.sourceLabel'),
      slots: { default: 'source' },
      width: 130,
    },
    {
      field: 'time_windows',
      title: $t('ai-buddy-billing.price.features'),
      showOverflow: 'tooltip',
      formatter: ({ row }) => priceFeatureText(row),
      minWidth: 190,
    },
    {
      field: 'input_price',
      title: $t('ai-buddy-billing.price.inputPrice'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingUnitPrice(cellValue),
      width: 130,
    },
    {
      field: 'output_price',
      title: $t('ai-buddy-billing.price.outputPrice'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingUnitPrice(cellValue),
      width: 130,
    },
    {
      field: 'cache_read_price',
      title: $t('ai-buddy-billing.price.cacheReadPrice'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingUnitPrice(cellValue),
      width: 140,
    },
    {
      field: 'cache_write_price',
      title: $t('ai-buddy-billing.price.cacheWritePrice'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingUnitPrice(cellValue),
      width: 140,
    },
    {
      field: 'image_price',
      title: $t('ai-buddy-billing.price.imagePrice'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingUnitPrice(cellValue),
      width: 120,
    },
    {
      field: 'effective_from',
      title: $t('ai-buddy-billing.price.effectiveFrom'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'effective_to',
      title: $t('ai-buddy-billing.price.effectiveTo'),
      width: 168,
      slots: { default: 'effectiveTo' },
    },
    {
      field: 'active',
      title: $t('ai-buddy-billing.price.effective'),
      slots: { default: 'active' },
      width: 110,
    },
    {
      field: 'created_time',
      title: $t('common.table.created_time'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      width: 160,
      cellRender: {
        attrs: {
          nameField: 'model_id',
          nameTitle: $t('ai-buddy-billing.price.title'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
    },
  ];
}

export const queryAccountSchema: VbenFormSchema[] = [
  {
    component: 'InputNumber',
    componentProps: {
      class: 'w-full',
      min: 1,
    },
    fieldName: 'user_id',
    label: $t('ai-buddy-billing.account.userId'),
  },
];

export function useAccountColumns(
  onActionClick?: OnActionClickFn<AIBuddyBillingAccountResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 60 },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      minWidth: 110,
    },
    {
      field: 'balance',
      title: $t('ai-buddy-billing.account.balance'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      minWidth: 140,
    },
    {
      field: 'currency',
      title: $t('ai-buddy-billing.account.currency'),
      minWidth: 100,
    },
    {
      field: 'version',
      title: $t('ai-buddy-billing.account.version'),
      align: 'right',
      minWidth: 110,
    },
    {
      field: 'updated_time',
      title: $t('common.table.updated_time'),
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      width: 240,
      cellRender: {
        attrs: {
          nameField: 'user_id',
          nameTitle: $t('ai-buddy-billing.account.title'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'transactions',
            text: $t('ai-buddy-billing.account.transactions'),
          },
          {
            code: 'recharge',
            text: $t('ai-buddy-billing.account.recharge'),
          },
          { code: 'adjust', text: $t('ai-buddy-billing.account.adjust') },
        ],
      },
    },
  ];
}

export function useTransactionColumns(
  options: { showUserId?: boolean } = {},
): VxeGridProps['columns'] {
  const columns: VxeGridProps['columns'] = [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 60 },
    {
      field: 'created_time',
      title: $t('ai-buddy-billing.account.time'),
      formatter: 'formatDateTime',
      minWidth: 168,
    },
    {
      field: 'transaction_type',
      title: $t('ai-buddy-billing.account.transactionType'),
      slots: { default: 'transactionType' },
      minWidth: 120,
    },
    {
      field: 'amount',
      title: $t('ai-buddy-billing.account.amount'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      minWidth: 130,
    },
    {
      field: 'balance_after',
      title: $t('ai-buddy-billing.account.balanceAfter'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      minWidth: 140,
    },
    {
      field: 'currency',
      title: $t('ai-buddy-billing.account.currency'),
      minWidth: 100,
    },
    {
      field: 'reference_type',
      title: $t('ai-buddy-billing.account.reference'),
      formatter: ({ row }) =>
        row.reference_type
          ? `${row.reference_type} / ${row.reference_id}`
          : '-',
      minWidth: 210,
    },
    {
      field: 'remark',
      title: $t('ai-buddy-billing.account.remark'),
      showOverflow: 'tooltip',
      minWidth: 180,
    },
  ];

  if (options.showUserId) {
    columns.splice(2, 0, {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      width: 100,
    });
  }

  return columns;
}

export function useBudgetColumns(
  onActionClick?: OnActionClickFn<AIBuddyBillingBudgetResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 60 },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      minWidth: 110,
    },
    {
      field: 'window',
      title: $t('ai-buddy-billing.budget.window'),
      formatter: ({ cellValue }) =>
        budgetWindowLabel(cellValue as AIBuddyBillingBudgetWindow),
      minWidth: 120,
    },
    {
      field: 'usd_limit',
      title: $t('ai-buddy-billing.budget.usdLimit'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
      minWidth: 140,
    },
    {
      field: 'token_limit',
      title: $t('ai-buddy-billing.budget.tokenLimit'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
      minWidth: 150,
    },
    {
      field: 'warn_at',
      title: $t('ai-buddy-billing.budget.warnAt'),
      align: 'right',
      formatter: ({ cellValue }) => formatBillingRatio(cellValue),
      minWidth: 120,
    },
    {
      field: 'status',
      title: $t('ai-buddy-billing.budget.status'),
      cellRender: { name: 'CellTag' },
      minWidth: 100,
    },
    {
      field: 'created_time',
      title: $t('common.table.created_time'),
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      width: 160,
      cellRender: {
        attrs: {
          nameField: 'window',
          nameTitle: $t('ai-buddy-billing.budget.title'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
    },
  ];
}

export function priceActiveText(price: AIBuddyBillingPriceResult): string {
  return isPriceActive(price)
    ? $t('ai-buddy-billing.price.activeTag')
    : $t('ai-buddy-billing.price.inactiveTag');
}
