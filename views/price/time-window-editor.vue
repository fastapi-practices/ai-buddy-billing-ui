<script setup lang="ts">
import type { AIBuddyBillingPriceWindow } from '../../api';
import type { AIBuddyBillingPriceWindowFormValues } from '../price-params';

import { computed, ref } from 'vue';

import { confirm, useVbenModal, VbenButton } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';

import { formatBillingUnitPrice } from '../format';
import { createAIBuddyBillingPriceWindowsPayload } from '../price-params';
import { createWindowSchema } from './editor-schemas';

const windows = defineModel<AIBuddyBillingPriceWindow[]>({ default: () => [] });

const editIndex = ref(-1);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: createWindowSchema(),
  showDefaultActions: false,
  wrapperClass: 'md:grid-cols-2',
});

const modalTitle = computed(() =>
  editIndex.value >= 0
    ? $t('ui.actionTitle.edit', [$t('ai-buddy-billing.price.windowTitle')])
    : $t('ui.actionTitle.create', [$t('ai-buddy-billing.price.windowTitle')]),
);

const [Modal, modalApi] = useVbenModal({
  class: 'w-1/2',
  destroyOnClose: true,
  // 二级弹窗需要高于价格弹窗（--popup-z-index: 2000）
  zIndex: 2010,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    const values =
      await formApi.getValues<AIBuddyBillingPriceWindowFormValues>();
    if (!values.name?.trim()) {
      message.warning(
        $t('ui.formRules.required', [$t('ai-buddy-billing.price.windowName')]),
      );
      return;
    }

    const [payload] = createAIBuddyBillingPriceWindowsPayload([values]);
    if (!payload) {
      return;
    }

    const next = [...windows.value];
    if (editIndex.value >= 0) {
      next[editIndex.value] = payload;
    } else {
      next.push(payload);
    }
    windows.value = next;
    await modalApi.close();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    formApi.resetForm();
    const { index } = modalApi.getData<{ index?: number }>();
    editIndex.value = typeof index === 'number' ? index : -1;
    const current =
      editIndex.value >= 0 ? windows.value[editIndex.value] : undefined;
    await formApi.setValues({
      days: current?.days ?? [],
      end: current?.end ?? '23:59',
      input_price: toOptionalNumber(current?.input_price),
      multiplier: current ? Number(current.multiplier) : 1,
      name: current?.name ?? '',
      output_price: toOptionalNumber(current?.output_price),
      start: current?.start ?? '00:00',
    });
  },
});

function toOptionalNumber(value?: AIBuddyBillingPriceWindow['input_price']) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function openEditor(index?: number) {
  modalApi.setData({ index }).open();
}

function removeWindow(index: number) {
  confirm({
    content: $t('ai-buddy-billing.price.windowDeleteConfirm', [
      windows.value[index]?.name ?? '',
    ]),
    icon: 'warning',
  }).then(() => {
    windows.value = windows.value.filter((_, itemIndex) => itemIndex !== index);
  });
}

function daysText(window: AIBuddyBillingPriceWindow) {
  if (!window.days?.length) {
    return $t('ai-buddy-billing.price.windowEveryDay');
  }
  return window.days
    .map((day) => $t(`ai-buddy-billing.weekday.${day}`))
    .join(' / ');
}

function rangeText(window: AIBuddyBillingPriceWindow) {
  return window.start === window.end
    ? $t('ai-buddy-billing.price.windowAllDay')
    : `${window.start} - ${window.end}`;
}
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="text-sm font-medium">
        {{ $t('ai-buddy-billing.price.timeWindows') }}
        <span class="text-muted-foreground ml-1 text-xs">
          {{ $t('ai-buddy-billing.price.windowHint') }}
        </span>
      </div>
      <VbenButton size="sm" variant="outline" @click="openEditor()">
        {{ $t('ai-buddy-billing.price.windowAdd') }}
      </VbenButton>
    </div>
    <div class="overflow-x-auto rounded-[var(--radius)] border border-border">
      <table class="w-full min-w-max text-sm">
        <thead class="bg-muted text-muted-foreground text-left">
          <tr>
            <th class="px-3 py-2 font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.windowName') }}
            </th>
            <th class="px-3 py-2 font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.windowDays') }}
            </th>
            <th class="px-3 py-2 font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.windowRange') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.windowMultiplier') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.inputPrice') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.outputPrice') }}
            </th>
            <th class="px-3 py-2 font-normal whitespace-nowrap">
              {{ $t('common.table.operation') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(window, index) in windows"
            :key="`${window.name}-${index}`"
            class="border-border/60 border-t"
          >
            <td class="px-3 py-2">{{ window.name }}</td>
            <td class="text-muted-foreground px-3 py-2">
              {{ daysText(window) }}
            </td>
            <td class="px-3 py-2">{{ rangeText(window) }}</td>
            <td class="px-3 py-2 text-right">
              x{{ Number(window.multiplier) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(window.input_price) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(window.output_price) }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <VbenButton size="sm" variant="link" @click="openEditor(index)">
                {{ $t('common.edit') }}
              </VbenButton>
              <VbenButton
                size="sm"
                variant="link"
                class="text-destructive"
                @click="removeWindow(index)"
              >
                {{ $t('common.delete') }}
              </VbenButton>
            </td>
          </tr>
          <tr v-if="windows.length === 0">
            <td class="text-muted-foreground px-3 py-6 text-center" colspan="7">
              {{ $t('ai-buddy-billing.price.windowEmpty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-muted-foreground mt-1 text-xs">
      {{ $t('ai-buddy-billing.price.windowHelp') }}
    </p>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
  </div>
</template>
