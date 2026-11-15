import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

import { weekdayOptions } from '../data';

/** 单个峰谷时段表单 */
export function createWindowSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        class: 'w-full',
        placeholder: $t('ai-buddy-billing.price.windowNamePlaceholder'),
      },
      fieldName: 'name',
      label: $t('ai-buddy-billing.price.windowName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        mode: 'multiple',
        options: weekdayOptions(),
        placeholder: $t('ai-buddy-billing.price.windowDaysPlaceholder'),
      },
      fieldName: 'days',
      help: $t('ai-buddy-billing.price.windowDaysHelp'),
      label: $t('ai-buddy-billing.price.windowDays'),
    },
    {
      component: 'TimePicker',
      componentProps: {
        allowClear: false,
        class: 'w-full',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
      },
      fieldName: 'start',
      label: $t('ai-buddy-billing.price.windowStart'),
      rules: 'required',
    },
    {
      component: 'TimePicker',
      componentProps: {
        allowClear: false,
        class: 'w-full',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
      },
      fieldName: 'end',
      help: $t('ai-buddy-billing.price.windowRangeHelp'),
      label: $t('ai-buddy-billing.price.windowEnd'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0.01, precision: 4 },
      defaultValue: 1,
      fieldName: 'multiplier',
      help: $t('ai-buddy-billing.price.windowMultiplierHelp'),
      label: $t('ai-buddy-billing.price.windowMultiplier'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'input_price',
      label: $t('ai-buddy-billing.price.inputPrice'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'output_price',
      label: $t('ai-buddy-billing.price.outputPrice'),
    },
  ];
}

/** 单层上下文阶梯价表单 */
export function createTierSchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 1, precision: 0 },
      fieldName: 'threshold',
      help: $t('ai-buddy-billing.price.tierThresholdHelp'),
      label: $t('ai-buddy-billing.price.tierThreshold'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'input_price',
      label: $t('ai-buddy-billing.price.inputPrice'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'output_price',
      label: $t('ai-buddy-billing.price.outputPrice'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'cache_read_price',
      label: $t('ai-buddy-billing.price.cacheReadPrice'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'cache_write_price',
      label: $t('ai-buddy-billing.price.cacheWritePrice'),
    },
  ];
}
