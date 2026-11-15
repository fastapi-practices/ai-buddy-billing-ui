<script setup lang="ts">
import type {
  AIBuddyBillingPriceResult,
  AIBuddyBillingPriceTier,
  AIBuddyBillingPriceWindow,
} from '../../api';
import type {
  AIBuddyBillingPriceFormValues,
  AIBuddyBillingPriceUpdateFormValues,
} from '../price-params';

import type { VbenFormProps } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { confirm, Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { IconifyIcon, MaterialSymbolsAdd } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  createAIBuddyBillingPriceApi,
  deleteAIBuddyBillingPriceApi,
  getAIBuddyBillingModelOptionsApi,
  getAIBuddyBillingPricesApi,
  getAIBuddyBillingProviderOptionsApi,
  updateAIBuddyBillingPriceApi,
} from '../../api';
import type { BillingSelectOption } from '../data';

import {
  BILLING_DATE_TIME_VALUE_FORMAT,
  createPriceSchema,
  priceSourceLabel,
  queryPriceSchema,
  usePriceColumns,
} from '../data';
import { loadBillingCurrency } from '../currency';
import {
  createAIBuddyBillingPricePayload,
  createAIBuddyBillingPriceUpdatePayload,
  isPriceActive,
} from '../price-params';
import ContextTierEditor from './context-tier-editor.vue';
import PriceSyncDrawer from './price-sync-drawer.vue';
import TimeWindowEditor from './time-window-editor.vue';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const providerOptions = ref<BillingSelectOption[]>([]);
const modelOptions = ref<BillingSelectOption[]>([]);
const priceDetail = ref<AIBuddyBillingPriceResult>();
const syncDrawerRef = ref<InstanceType<typeof PriceSyncDrawer>>();
const timeWindows = ref<AIBuddyBillingPriceWindow[]>([]);
const contextTiers = ref<AIBuddyBillingPriceTier[]>([]);

const modalTitle = computed(() =>
  priceDetail.value
    ? $t('ui.actionTitle.edit', [$t('ai-buddy-billing.price.title')])
    : $t('ai-buddy-billing.price.create'),
);

/** 失效时间必须晚于生效时间，与后端校验保持一致 */
function isEffectiveRangeValid(
  effectiveTo?: null | string,
  effectiveFrom?: null | string,
): boolean {
  if (!effectiveTo || !effectiveFrom) {
    return true;
  }
  return new Date(effectiveTo).getTime() > new Date(effectiveFrom).getTime();
}

/** 判断同一供应商与模型是否已存在未失效价格 */
async function hasUnexpiredPrice(
  providerId: number,
  modelId: string,
  effectiveFrom: string,
): Promise<boolean> {
  const { items } = await getAIBuddyBillingPricesApi({
    model_id: modelId,
    page: 1,
    provider_id: providerId,
    size: 100,
  });
  const start = new Date(effectiveFrom).getTime();
  return items.some(
    (item) =>
      !item.effective_to || new Date(item.effective_to).getTime() > start,
  );
}

function providerName(providerId: number) {
  return (
    providerOptions.value.find((item) => item.value === providerId)?.label ??
    String(providerId)
  );
}

async function loadProviderOptions() {
  if (providerOptions.value.length > 0) {
    return;
  }

  const providers = await getAIBuddyBillingProviderOptionsApi();
  providerOptions.value = [
    // 供应商 0 + 模型 * 为保底价，用于未匹配到模型价格的用量
    { label: $t('ai-buddy-billing.price.defaultOption'), value: 0 },
    ...providers
      .filter((provider) => provider.status === 1)
      .map((provider) => ({ label: provider.name, value: provider.id })),
  ];
}

async function handleProviderChange(providerId?: null | number) {
  modelOptions.value = [];
  if (providerId === 0) {
    await formApi.setValues({ model_id: '*' });
    return;
  }
  if (!providerId) {
    return;
  }

  const models = await getAIBuddyBillingModelOptionsApi(Number(providerId));
  modelOptions.value = models.map((model) => ({
    label: `${model.name} (${model.model_id})`,
    value: model.model_id,
  }));
}

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: queryPriceSchema({
    providerOptions: () => providerOptions.value,
  }),
};

const gridOptions: VxeTableGridOptions<AIBuddyBillingPriceResult> = {
  rowConfig: {
    keyField: 'id',
  },
  height: 'auto',
  toolbarConfig: {
    custom: true,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    zoom: true,
  },
  columns: usePriceColumns(providerName, onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await Promise.all([loadBillingCurrency(), loadProviderOptions()]);
        return await getAIBuddyBillingPricesApi({
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

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  wrapperClass: 'md:grid-cols-2',
  schema: createPriceSchema({
    modelOptions: () => modelOptions.value,
    onProviderChange: handleProviderChange,
    providerOptions: () => providerOptions.value,
  }),
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-2/3',
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();

    try {
      if (priceDetail.value?.id) {
        const values =
          await formApi.getValues<AIBuddyBillingPriceUpdateFormValues>();
        if (
          !isEffectiveRangeValid(
            values.effective_to,
            priceDetail.value.effective_from,
          )
        ) {
          message.warning($t('ai-buddy-billing.price.effectiveRangeInvalid'));
          return;
        }
        await updateAIBuddyBillingPriceApi(priceDetail.value.id, {
          ...createAIBuddyBillingPriceUpdatePayload(values),
          context_tiers: contextTiers.value,
          time_windows: timeWindows.value,
        });
        message.success($t('ai-buddy-billing.price.updated'));
      } else {
        const values = await formApi.getValues<AIBuddyBillingPriceFormValues>();
        if (
          !isEffectiveRangeValid(values.effective_to, values.effective_from)
        ) {
          message.warning($t('ai-buddy-billing.price.effectiveRangeInvalid'));
          return;
        }
        const providerId = Number(values.provider_id);
        const modelId = providerId === 0 ? '*' : (values.model_id ?? '').trim();
        if (
          await hasUnexpiredPrice(providerId, modelId, values.effective_from)
        ) {
          message.warning($t('ai-buddy-billing.price.duplicatePrice'));
          return;
        }
        await createAIBuddyBillingPriceApi({
          ...createAIBuddyBillingPricePayload({ ...values, model_id: modelId }),
          context_tiers: contextTiers.value,
          time_windows: timeWindows.value,
        });
        message.success($t('ai-buddy-billing.price.created'));
      }
      await modalApi.close();
      await gridApi.query();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    await loadProviderOptions();
    // getData() 在未传数据时返回空对象，需按主键判断是新增还是编辑
    const data = modalApi.getData<AIBuddyBillingPriceResult>();
    const price = data?.id ? data : undefined;
    priceDetail.value = price;
    formApi.resetForm();
    modelOptions.value = [];
    await formApi.setState({
      schema: createPriceSchema({
        isEdit: Boolean(price),
        modelOptions: () => modelOptions.value,
        onProviderChange: handleProviderChange,
        providerOptions: () => providerOptions.value,
      }),
    });
    timeWindows.value = price ? [...(price.time_windows ?? [])] : [];
    contextTiers.value = price ? [...(price.context_tiers ?? [])] : [];
    if (price) {
      await handleProviderChange(price.provider_id);
      await formApi.setValues({
        cache_audio_read_price: Number(price.cache_audio_read_price ?? 0),
        cache_read_price: Number(price.cache_read_price ?? 0),
        cache_write_price: Number(price.cache_write_price ?? 0),
        effective_from: dayjs(price.effective_from).format(
          BILLING_DATE_TIME_VALUE_FORMAT,
        ),
        effective_to: price.effective_to
          ? dayjs(price.effective_to).format(BILLING_DATE_TIME_VALUE_FORMAT)
          : undefined,
        image_price: Number(price.image_price ?? 0),
        input_audio_price: Number(price.input_audio_price ?? 0),
        input_price: Number(price.input_price ?? 0),
        model_id: price.model_id,
        output_audio_price: Number(price.output_audio_price ?? 0),
        output_price: Number(price.output_price ?? 0),
        provider_id: price.provider_id,
      });
      return;
    }

    await formApi.setValues({
      effective_from: dayjs().format(BILLING_DATE_TIME_VALUE_FORMAT),
    });
  },
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<AIBuddyBillingPriceResult>) {
  switch (code) {
    case 'delete': {
      confirm({
        content: $t('ai-buddy-billing.price.deleteConfirm', [row.model_id]),
        icon: 'warning',
      }).then(async () => {
        await deleteAIBuddyBillingPriceApi(row.id);
        message.success($t('ai-buddy-billing.price.deleted', [row.model_id]));
        await gridApi.query();
      });
      break;
    }
    case 'edit': {
      modalApi.setData(row).open();
      break;
    }
  }
}

function effectiveToText(price: AIBuddyBillingPriceResult) {
  return price.effective_to
    ? dayjs(price.effective_to).format(DATE_TIME_FORMAT)
    : $t('ai-buddy-billing.price.longTerm');
}

onMounted(loadProviderOptions);
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <MaterialSymbolsAdd class="size-5" />
          {{ $t('ai-buddy-billing.price.create') }}
        </VbenButton>
        <VbenButton
          class="ml-2"
          variant="outline"
          @click="syncDrawerRef?.open()"
        >
          <IconifyIcon class="mr-1 size-4" icon="material-symbols:sync" />
          {{ $t('ai-buddy-billing.price.sync.button') }}
        </VbenButton>
      </template>
      <template #source="{ row }">
        <a-tag :color="row.source === 'models.dev' ? 'processing' : 'default'">
          {{ priceSourceLabel(row.source) }}
        </a-tag>
      </template>
      <template #effectiveTo="{ row }">
        <span>{{ effectiveToText(row) }}</span>
      </template>
      <template #active="{ row }">
        <a-tag :color="isPriceActive(row) ? 'success' : 'default'">
          {{
            isPriceActive(row)
              ? $t('ai-buddy-billing.price.activeTag')
              : $t('ai-buddy-billing.price.inactiveTag')
          }}
        </a-tag>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
      <div class="mt-5 flex flex-col gap-5">
        <TimeWindowEditor v-model="timeWindows" />
        <ContextTierEditor v-model="contextTiers" />
      </div>
    </Modal>
    <PriceSyncDrawer
      ref="syncDrawerRef"
      :provider-options="providerOptions"
      @synced="gridApi.query()"
    />
  </Page>
</template>
