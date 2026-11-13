import type {
  AIBuddyBillingAccountResult,
  AIBuddyBillingBudgetResult,
  AIBuddyBillingBudgetWindow,
  AIBuddyBillingLedgerStatus,
  AIBuddyBillingPriceResult,
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
} from './format';
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

export function transactionTypeLabel(type: AIBuddyBillingTransactionType): string {
  return $t(`ai-buddy-billing.transactionType.${type}`);
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

export const queryLedgerSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'conversation_id',
    label: $t('ai-buddy-billing.usage.conversation'),
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
      componentProps: () => ({
        class: 'w-full',
        disabled: isEdit,
        options: options.modelOptions(),
      }),
      fieldName: 'model_id',
      help: isEdit ? undefined : $t('ai-buddy-billing.price.modelHelp'),
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
        class: 'w-full',
        min: 0,
        precision: 6,
      },
      defaultValue: 0,
      fieldName,
      label: $t(`ai-buddy-billing.price.${label}`),
    })),
    {
      component: 'InputNumber',
      componentProps: {
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
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 50 },
    {
      field: 'usage_time',
      title: $t('ai-buddy-billing.usage.usageTime'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'conversation_id',
      title: $t('ai-buddy-billing.usage.conversation'),
      minWidth: 150,
      showOverflow: 'tooltip',
    },
    {
      field: 'provider_id',
      title: $t('ai-buddy-billing.price.provider'),
      minWidth: 120,
      formatter: ({ cellValue }) => providerName(Number(cellValue)),
    },
    {
      field: 'model_id',
      title: $t('ai-buddy-billing.price.model'),
      minWidth: 170,
      showOverflow: 'tooltip',
    },
    {
      field: 'input_tokens',
      title: $t('ai-buddy-billing.usage.inputTokens'),
      width: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
    },
    {
      field: 'output_tokens',
      title: $t('ai-buddy-billing.usage.outputTokens'),
      width: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
    },
    {
      field: 'cache_read_tokens',
      title: $t('ai-buddy-billing.usage.cacheReadTokens'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
    },
    {
      field: 'cache_write_tokens',
      title: $t('ai-buddy-billing.usage.cacheWriteTokens'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
    },
    {
      field: 'generated_images',
      title: $t('ai-buddy-billing.usage.images'),
      width: 90,
      align: 'right',
    },
    {
      field: 'provider_cost',
      title: $t('ai-buddy-billing.usage.providerCost'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'billed_cost',
      title: $t('ai-buddy-billing.usage.billedCost'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'status',
      title: $t('ai-buddy-billing.usage.status'),
      width: 110,
      slots: { default: 'ledgerStatus' },
    },
  ];
}

export function usePriceColumns(
  providerName: (providerId: number) => string,
  onActionClick?: OnActionClickFn<AIBuddyBillingPriceResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 50 },
    {
      field: 'provider_id',
      title: $t('ai-buddy-billing.price.provider'),
      minWidth: 130,
      formatter: ({ cellValue }) => providerName(Number(cellValue)),
    },
    {
      field: 'model_id',
      title: $t('ai-buddy-billing.price.model'),
      minWidth: 180,
      showOverflow: 'tooltip',
    },
    {
      field: 'input_price',
      title: $t('ai-buddy-billing.price.inputPrice'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'output_price',
      title: $t('ai-buddy-billing.price.outputPrice'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'cache_read_price',
      title: $t('ai-buddy-billing.price.cacheReadPrice'),
      width: 130,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'cache_write_price',
      title: $t('ai-buddy-billing.price.cacheWritePrice'),
      width: 130,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'image_price',
      title: $t('ai-buddy-billing.price.imagePrice'),
      width: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
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
      width: 100,
      slots: { default: 'active' },
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
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 50 },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      width: 100,
    },
    {
      field: 'balance',
      title: $t('ai-buddy-billing.account.balance'),
      width: 140,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'currency',
      title: $t('ai-buddy-billing.account.currency'),
      width: 90,
    },
    {
      field: 'version',
      title: $t('ai-buddy-billing.account.version'),
      width: 100,
      align: 'right',
    },
    {
      field: 'updated_time',
      title: $t('common.table.updated_time'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      width: 200,
      cellRender: {
        attrs: {
          nameField: 'user_id',
          nameTitle: $t('ai-buddy-billing.account.title'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
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

export function useTransactionColumns(): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 50 },
    {
      field: 'created_time',
      title: $t('ai-buddy-billing.account.time'),
      width: 168,
      formatter: 'formatDateTime',
    },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      width: 100,
    },
    {
      field: 'transaction_type',
      title: $t('ai-buddy-billing.account.transactionType'),
      width: 110,
      slots: { default: 'transactionType' },
    },
    {
      field: 'amount',
      title: $t('ai-buddy-billing.account.amount'),
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'balance_after',
      title: $t('ai-buddy-billing.account.balanceAfter'),
      width: 130,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'currency',
      title: $t('ai-buddy-billing.account.currency'),
      width: 90,
    },
    {
      field: 'reference_type',
      title: $t('ai-buddy-billing.account.reference'),
      minWidth: 190,
      formatter: ({ row }) => `${row.reference_type} / ${row.reference_id}`,
    },
    {
      field: 'remark',
      title: $t('ai-buddy-billing.account.remark'),
      minWidth: 160,
      showOverflow: 'tooltip',
    },
  ];
}

export function useBudgetColumns(
  onActionClick?: OnActionClickFn<AIBuddyBillingBudgetResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('common.table.id'), type: 'seq', width: 50 },
    {
      field: 'user_id',
      title: $t('ai-buddy-billing.account.userId'),
      width: 100,
    },
    {
      field: 'window',
      title: $t('ai-buddy-billing.budget.window'),
      width: 110,
      formatter: ({ cellValue }) =>
        budgetWindowLabel(cellValue as AIBuddyBillingBudgetWindow),
    },
    {
      field: 'usd_limit',
      title: $t('ai-buddy-billing.budget.usdLimit'),
      width: 130,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingAmount(cellValue),
    },
    {
      field: 'token_limit',
      title: $t('ai-buddy-billing.budget.tokenLimit'),
      width: 140,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingTokens(cellValue),
    },
    {
      field: 'warn_at',
      title: $t('ai-buddy-billing.budget.warnAt'),
      width: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatBillingRatio(cellValue),
    },
    {
      field: 'status',
      title: $t('ai-buddy-billing.budget.status'),
      width: 90,
      cellRender: { name: 'CellTag' },
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
