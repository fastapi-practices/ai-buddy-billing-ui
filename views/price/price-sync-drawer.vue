<script setup lang="ts">
import type {
  AIBuddyBillingPriceSyncFieldChange,
  AIBuddyBillingPriceSyncItem,
  AIBuddyBillingPriceSyncResult,
  AIBuddyBillingPriceSyncStatus,
} from '../../api';
import type { BillingSelectOption } from '../data';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';
import dayjs from 'dayjs';

import {
  previewAIBuddyBillingPriceSyncApi,
  syncAIBuddyBillingPricesApi,
} from '../../api';
import {
  BILLING_DATE_TIME_VALUE_FORMAT,
  formatSyncPriceDelta,
  formatSyncPriceValue,
  isStructuredPriceField,
  priceFieldLabel,
  priceSyncStatusLabel,
} from '../data';

const props = withDefaults(
  defineProps<{ providerOptions?: BillingSelectOption[] }>(),
  { providerOptions: () => [] },
);

const emit = defineEmits<{ synced: [] }>();

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const PAGE_SIZE = 20;

const STATUS_COLORS: Record<AIBuddyBillingPriceSyncStatus, string> = {
  create: 'success',
  future_price: 'warning',
  manual_locked: 'processing',
  no_cost: 'default',
  not_found: 'default',
  unchanged: 'default',
  update: 'processing',
};

const syncLoading = ref(false);
const applying = ref(false);
const result = ref<AIBuddyBillingPriceSyncResult>();
const providerIds = ref<number[]>();
const effectiveFrom = ref<string>();
const overwriteManual = ref(false);
const page = ref(1);

const items = computed<AIBuddyBillingPriceSyncItem[]>(
  () => result.value?.items ?? [],
);

/** 保底价（供应商 0）不参与同步过滤 */
const syncProviderOptions = computed(() =>
  props.providerOptions.filter((item) => Number(item.value) > 0),
);

const pagedItems = computed(() =>
  items.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const changeCount = computed(
  () => (result.value?.created ?? 0) + (result.value?.updated ?? 0),
);

const emptyText = computed(() => $t('ai-buddy-billing.price.sync.empty'));

/** models.dev 目录版本是拉取时间，按本地时间展示 */
function formatCatalogVersion(version?: string): string {
  if (!version) {
    return '-';
  }
  const time = dayjs(version);
  return time.isValid() ? time.format(DATE_TIME_FORMAT) : version;
}

const summaryItems = computed(() => {
  const data = result.value;
  return [
    {
      key: 'catalog',
      label: $t('ai-buddy-billing.price.sync.catalog'),
      tooltip: $t('ai-buddy-billing.price.sync.catalogHelp'),
      value: formatCatalogVersion(data?.catalog_version),
    },
    {
      key: 'scanned',
      label: $t('ai-buddy-billing.price.sync.scanned'),
      value: String(data?.scanned ?? 0),
    },
    {
      class: 'text-success',
      key: 'created',
      label: $t('ai-buddy-billing.price.sync.created'),
      value: String(data?.created ?? 0),
    },
    {
      class: 'text-primary',
      key: 'updated',
      label: $t('ai-buddy-billing.price.sync.updated'),
      value: String(data?.updated ?? 0),
    },
    {
      key: 'skipped',
      label: $t('ai-buddy-billing.price.sync.skipped'),
      value: String(data?.skipped ?? 0),
    },
  ];
});

async function readParams() {
  return {
    effective_from: effectiveFrom.value || null,
    overwrite_manual: overwriteManual.value,
    provider_ids: providerIds.value?.length ? providerIds.value : null,
  };
}

async function refreshPreview() {
  syncLoading.value = true;
  try {
    result.value = await previewAIBuddyBillingPriceSyncApi(await readParams());
    page.value = 1;
  } finally {
    syncLoading.value = false;
  }
}

/** 打开抽屉时重置同步参数，避免 watch 触发重复预览 */
let skipWatch = false;
async function resetAndPreview() {
  skipWatch = true;
  providerIds.value = undefined;
  effectiveFrom.value = undefined;
  overwriteManual.value = false;
  page.value = 1;
  await nextTick();
  skipWatch = false;
  await refreshPreview();
}

// 同步参数变化后自动重新预览，保证预览结果与将要应用的参数一致
watch(
  [providerIds, effectiveFrom, overwriteManual],
  () => {
    if (skipWatch) {
      return;
    }
    void refreshPreview();
  },
  { deep: true },
);

/** 价格变化悬浮提示：标签已展示字段名，这里只补充变化前后与增减值 */
function changeTooltip(change: AIBuddyBillingPriceSyncFieldChange): string {
  const before = isStructuredPriceField(change.field)
    ? (change.current ?? '-')
    : formatSyncPriceValue(change.current);
  const after = isStructuredPriceField(change.field)
    ? (change.next ?? '-')
    : formatSyncPriceValue(change.next);
  const base = $t('ai-buddy-billing.price.sync.changeTooltip', [before, after]);
  const delta = formatSyncPriceDelta(change.current, change.next);
  return delta
    ? $t('ai-buddy-billing.price.sync.changeTooltipWithDelta', [base, delta])
    : base;
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-3/4',
  confirmText: $t('ai-buddy-billing.price.sync.apply'),
  contentClass: 'h-full overflow-hidden p-0',
  destroyOnClose: true,
  async onConfirm() {
    if (changeCount.value === 0) {
      message.info($t('ai-buddy-billing.price.sync.nothingToApply'));
      return;
    }

    drawerApi.lock(true);
    applying.value = true;
    try {
      const data = await syncAIBuddyBillingPricesApi(await readParams());
      message.success(
        $t('ai-buddy-billing.price.sync.done', [
          data.created,
          data.updated,
          data.skipped,
        ]),
      );
      emit('synced');
      await drawerApi.close();
    } finally {
      applying.value = false;
      drawerApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    result.value = undefined;
    await resetAndPreview();
  },
});

defineExpose({ open: () => drawerApi.open() });
</script>

<template>
  <Drawer :title="$t('ai-buddy-billing.price.sync.title')">
    <div class="flex h-full flex-col gap-2.5 p-3">
      <!-- 同步选项 -->
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-sm">
            {{ $t('ai-buddy-billing.price.sync.providerFilter') }}
          </span>
          <a-select
            v-model:value="providerIds"
            allow-clear
            class="w-56"
            mode="multiple"
            :max-tag-count="1"
            :options="syncProviderOptions"
            :placeholder="
              $t('ai-buddy-billing.price.sync.providerFilterPlaceholder')
            "
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-sm">
            {{ $t('ai-buddy-billing.price.sync.effectiveFrom') }}
          </span>
          <a-date-picker
            v-model:value="effectiveFrom"
            class="w-52"
            :format="DATE_TIME_FORMAT"
            :placeholder="$t('ai-buddy-billing.price.sync.effectiveFromHelp')"
            show-time
            :value-format="BILLING_DATE_TIME_VALUE_FORMAT"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground flex items-center gap-1 text-sm">
            {{ $t('ai-buddy-billing.price.sync.overwrite') }}
            <a-tooltip :title="$t('ai-buddy-billing.price.sync.overwriteHelp')">
              <IconifyIcon
                class="size-3.5 cursor-help"
                icon="material-symbols:info-outline"
              />
            </a-tooltip>
          </span>
          <div class="flex h-8 items-center">
            <a-switch v-model:checked="overwriteManual" />
          </div>
        </div>
      </div>

      <!-- 摘要 -->
      <div
        class="border-border flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border px-3 py-2"
      >
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span
            v-for="item in summaryItems"
            :key="item.key"
            class="text-muted-foreground"
          >
            <a-tooltip v-if="item.tooltip" :title="item.tooltip">
              <span class="cursor-help border-b border-dashed">{{
                item.label
              }}</span>
            </a-tooltip>
            <span v-else>{{ item.label }}</span>
            <span
              class="ml-1 font-semibold"
              :class="item.class ?? 'text-foreground'"
            >
              {{ item.value }}
            </span>
          </span>
        </div>
        <span class="text-muted-foreground text-sm whitespace-nowrap">
          {{ $t('ai-buddy-billing.price.sync.total', [items.length]) }}
        </span>
      </div>

      <!-- 明细 -->
      <div class="relative min-h-0 flex-1">
        <div
          class="h-full overflow-auto rounded-[var(--radius)] border border-border"
        >
          <table class="w-full min-w-max text-sm">
            <thead class="bg-muted sticky top-0 z-1 text-left">
              <tr class="text-muted-foreground">
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.provider') }}
                </th>
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.model') }}
                </th>
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.sync.sourceProvider') }}
                </th>
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.sync.statusLabel') }}
                </th>
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.sync.change') }}
                </th>
                <th class="px-2.5 py-1.5 font-normal whitespace-nowrap">
                  {{ $t('ai-buddy-billing.price.sync.missing') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedItems"
                :key="`${item.provider_id}-${item.model_id}`"
                class="border-border/60 border-t align-top"
              >
                <td class="px-2.5 py-1.5">{{ item.provider_name }}</td>
                <td class="px-2.5 py-1.5">{{ item.model_id }}</td>
                <td class="text-muted-foreground px-2.5 py-1.5">
                  {{ item.source_provider ?? '-' }}
                </td>
                <td class="px-2.5 py-1.5">
                  <a-tag :color="STATUS_COLORS[item.status] ?? 'default'">
                    {{ priceSyncStatusLabel(item.status) }}
                  </a-tag>
                </td>
                <td class="px-2.5 py-1.5">
                  <div class="flex flex-wrap gap-1">
                    <template
                      v-for="change in item.changes"
                      :key="change.field"
                    >
                      <a-tooltip :title="changeTooltip(change)">
                        <a-tag
                          class="mr-0 whitespace-nowrap"
                          color="processing"
                        >
                          {{ priceFieldLabel(change.field) }}
                          <template
                            v-if="!isStructuredPriceField(change.field)"
                          >
                            <span
                              v-if="item.status !== 'create'"
                              class="opacity-70"
                            >
                              {{ formatSyncPriceValue(change.current) }} →
                            </span>
                            <span class="font-semibold">
                              {{ formatSyncPriceValue(change.next) }}
                            </span>
                          </template>
                        </a-tag>
                      </a-tooltip>
                    </template>
                    <span
                      v-if="!item.changes?.length"
                      class="text-muted-foreground"
                    >
                      {{ $t('ai-buddy-billing.price.sync.noChange') }}
                    </span>
                  </div>
                </td>
                <td class="px-2.5 py-1.5">
                  <div class="flex flex-wrap gap-1">
                    <a-tag
                      v-for="field in item.missing_fields"
                      :key="field"
                      class="mr-0"
                    >
                      {{ priceFieldLabel(field) }}
                    </a-tag>
                    <span
                      v-if="!item.missing_fields?.length"
                      class="text-muted-foreground"
                    >
                      -
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="pagedItems.length === 0">
                <td
                  class="text-muted-foreground px-3 py-10 text-center"
                  colspan="6"
                >
                  {{ emptyText }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="syncLoading"
          class="bg-background/70 absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius)]"
        >
          <a-spin />
        </div>
      </div>

      <!-- 底部分页 -->
      <div class="flex items-center justify-end">
        <a-pagination
          v-model:current="page"
          hide-on-single-page
          :page-size="PAGE_SIZE"
          :show-size-changer="false"
          size="small"
          :total="items.length"
        />
      </div>
    </div>
  </Drawer>
</template>
