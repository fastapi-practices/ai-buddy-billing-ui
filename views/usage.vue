<script setup lang="ts">
import type { AIBuddyBillingLedgerResult, AIBuddyBillingSummaryResult } from '../api';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  getAIBuddyBillingLedgerApi,
  getAIBuddyBillingProviderOptionsApi,
  getAIBuddyBillingSummaryApi,
  reconcileAIBuddyBillingApi,
} from '../api';
import { ledgerStatusLabel, queryLedgerSchema, useLedgerColumns } from './data';
import { formatBillingAmount, formatBillingTokens } from './format';

const LEDGER_STATUS_COLORS: Record<string, string> = {
  billed: 'success',
  provider_cost: 'processing',
  unpriced: 'default',
};

const providerNames = ref<Map<number, string>>(new Map());
const summary = ref<AIBuddyBillingSummaryResult>();
const summaryLoading = ref(false);
const reconcileLoading = ref(false);

function providerName(providerId: number) {
  return providerNames.value.get(providerId) ?? String(providerId);
}

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: queryLedgerSchema,
};

const gridOptions: VxeTableGridOptions<AIBuddyBillingLedgerResult> = {
  rowConfig: {
    keyField: 'id',
  },
  height: 520,
  toolbarConfig: {
    custom: true,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    zoom: true,
  },
  columns: useLedgerColumns(providerName),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        void loadSummary(formValues);
        return await getAIBuddyBillingLedgerApi({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const summaryItems = computed(() => {
  const data = summary.value;
  return [
    {
      label: $t('ai-buddy-billing.usage.usageCount'),
      value: formatBillingTokens(data?.usage_count ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.inputTokens'),
      value: formatBillingTokens(data?.input_tokens ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.outputTokens'),
      value: formatBillingTokens(data?.output_tokens ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.cacheReadTokens'),
      value: formatBillingTokens(data?.cache_read_tokens ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.cacheWriteTokens'),
      value: formatBillingTokens(data?.cache_write_tokens ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.images'),
      value: formatBillingTokens(data?.generated_images ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.providerCost'),
      value: formatBillingAmount(data?.provider_cost ?? 0),
    },
    {
      label: $t('ai-buddy-billing.usage.billedCost'),
      value: formatBillingAmount(data?.billed_cost ?? 0),
    },
  ];
});

async function loadSummary(formValues?: Record<string, any>) {
  summaryLoading.value = true;
  try {
    summary.value = await getAIBuddyBillingSummaryApi({
      conversation_id: formValues?.conversation_id || undefined,
      end_time: formValues?.end_time || undefined,
      model_id: formValues?.model_id || undefined,
      start_time: formValues?.start_time || undefined,
      status: formValues?.status || undefined,
    });
  } finally {
    summaryLoading.value = false;
  }
}

async function loadProviderNames() {
  const providers = await getAIBuddyBillingProviderOptionsApi();
  providerNames.value = new Map(
    providers.map((provider) => [provider.id, provider.name]),
  );
}

async function handleReconcile() {
  reconcileLoading.value = true;
  try {
    const result = await reconcileAIBuddyBillingApi();
    message.success(
      $t('ai-buddy-billing.usage.reconcileDone', [
        result.processed,
        result.recorded,
        result.billed,
        result.unpriced,
      ]),
    );
    await gridApi.query();
  } finally {
    reconcileLoading.value = false;
  }
}

onMounted(loadProviderNames);
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <VbenButton
        :loading="reconcileLoading"
        variant="outline"
        @click="handleReconcile"
      >
        <IconifyIcon class="mr-1 size-4" icon="material-symbols:sync" />
        {{ $t('ai-buddy-billing.usage.reconcile') }}
      </VbenButton>
      <span class="text-muted-foreground text-xs">
        {{ $t('ai-buddy-billing.usage.reconcileHelp') }}
      </span>
    </div>
    <a-spin :spinning="summaryLoading">
      <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="item in summaryItems"
          :key="item.label"
          class="rounded-[var(--radius)] border border-border p-3"
        >
          <div class="text-muted-foreground text-xs">{{ item.label }}</div>
          <div class="mt-1 text-lg font-semibold">{{ item.value }}</div>
        </div>
      </div>
    </a-spin>
    <Grid>
      <template #ledgerStatus="{ row }">
        <a-tag :color="LEDGER_STATUS_COLORS[row.status] ?? 'default'">
          {{ ledgerStatusLabel(row.status) }}
        </a-tag>
      </template>
    </Grid>
  </div>
</template>
