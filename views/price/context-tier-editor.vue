<script setup lang="ts">
import type { AIBuddyBillingPriceTier } from '../../api';
import type { AIBuddyBillingPriceTierFormValues } from '../price-params';

import { computed, ref } from 'vue';

import { confirm, useVbenModal, VbenButton } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';

import { formatBillingTokens, formatBillingUnitPrice } from '../format';
import { createAIBuddyBillingPriceTiersPayload } from '../price-params';
import { createTierSchema } from './editor-schemas';

const tiers = defineModel<AIBuddyBillingPriceTier[]>({ default: () => [] });

const editIndex = ref(-1);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: createTierSchema(),
  showDefaultActions: false,
  wrapperClass: 'md:grid-cols-2',
});

const modalTitle = computed(() =>
  editIndex.value >= 0
    ? $t('ui.actionTitle.edit', [$t('ai-buddy-billing.price.tierTitle')])
    : $t('ui.actionTitle.create', [$t('ai-buddy-billing.price.tierTitle')]),
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

    const values = await formApi.getValues<AIBuddyBillingPriceTierFormValues>();
    const [payload] = createAIBuddyBillingPriceTiersPayload([values]);
    if (!payload) {
      message.warning($t('ai-buddy-billing.price.tierPriceRequired'));
      return;
    }

    const duplicated = tiers.value.some(
      (tier, index) =>
        index !== editIndex.value &&
        Number(tier.threshold) === payload.threshold,
    );
    if (duplicated) {
      message.warning(
        $t('ai-buddy-billing.price.tierThresholdDuplicated', [
          payload.threshold,
        ]),
      );
      return;
    }

    const next = [...tiers.value];
    if (editIndex.value >= 0) {
      next[editIndex.value] = payload;
    } else {
      next.push(payload);
    }
    // 后端要求按阈值升序，保存时按阈值排序
    tiers.value = next.toSorted(
      (left, right) => Number(left.threshold) - Number(right.threshold),
    );
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
      editIndex.value >= 0 ? tiers.value[editIndex.value] : undefined;
    await formApi.setValues({
      cache_read_price: toOptionalNumber(current?.cache_read_price),
      cache_write_price: toOptionalNumber(current?.cache_write_price),
      input_price: toOptionalNumber(current?.input_price),
      output_price: toOptionalNumber(current?.output_price),
      threshold: current ? Number(current.threshold) : null,
    });
  },
});

function toOptionalNumber(value?: AIBuddyBillingPriceTier['input_price']) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function openEditor(index?: number) {
  modalApi.setData({ index }).open();
}

function removeTier(index: number) {
  confirm({
    content: $t('ai-buddy-billing.price.tierDeleteConfirm', [
      formatBillingTokens(Number(tiers.value[index]?.threshold ?? 0)),
    ]),
    icon: 'warning',
  }).then(() => {
    tiers.value = tiers.value.filter((_, itemIndex) => itemIndex !== index);
  });
}
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="text-sm font-medium">
        {{ $t('ai-buddy-billing.price.contextTiers') }}
        <span class="text-muted-foreground ml-1 text-xs">
          {{ $t('ai-buddy-billing.price.tierHint') }}
        </span>
      </div>
      <VbenButton size="sm" variant="outline" @click="openEditor()">
        {{ $t('ai-buddy-billing.price.tierAdd') }}
      </VbenButton>
    </div>
    <div class="overflow-x-auto rounded-[var(--radius)] border border-border">
      <table class="w-full min-w-max text-sm">
        <thead class="bg-muted text-muted-foreground text-left">
          <tr>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.tierThreshold') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.inputPrice') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.outputPrice') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.cacheReadPrice') }}
            </th>
            <th class="px-3 py-2 text-right font-normal whitespace-nowrap">
              {{ $t('ai-buddy-billing.price.cacheWritePrice') }}
            </th>
            <th class="px-3 py-2 font-normal whitespace-nowrap">
              {{ $t('common.table.operation') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(tier, index) in tiers"
            :key="`${tier.threshold}-${index}`"
            class="border-border/60 border-t"
          >
            <td class="px-3 py-2 text-right">
              {{ formatBillingTokens(Number(tier.threshold)) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(tier.input_price) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(tier.output_price) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(tier.cache_read_price) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ formatBillingUnitPrice(tier.cache_write_price) }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <VbenButton size="sm" variant="link" @click="openEditor(index)">
                {{ $t('common.edit') }}
              </VbenButton>
              <VbenButton
                size="sm"
                variant="link"
                class="text-destructive"
                @click="removeTier(index)"
              >
                {{ $t('common.delete') }}
              </VbenButton>
            </td>
          </tr>
          <tr v-if="tiers.length === 0">
            <td class="text-muted-foreground px-3 py-6 text-center" colspan="6">
              {{ $t('ai-buddy-billing.price.tierEmpty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-muted-foreground mt-1 text-xs">
      {{ $t('ai-buddy-billing.price.tierHelp') }}
    </p>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
  </div>
</template>
