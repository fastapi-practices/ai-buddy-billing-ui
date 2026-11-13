<script setup lang="ts">
import type { AIBuddyBillingPriceResult } from '../api';
import type {
  AIBuddyBillingPriceFormValues,
  AIBuddyBillingPriceUpdateFormValues,
} from './price-params';

import type { VbenFormProps } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { confirm, useVbenModal, VbenButton } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';
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
} from '../api';
import type { BillingSelectOption } from './data';

import {
  BILLING_DATE_TIME_VALUE_FORMAT,
  createPriceSchema,
  queryPriceSchema,
  usePriceColumns,
} from './data';
import {
  createAIBuddyBillingPricePayload,
  createAIBuddyBillingPriceUpdatePayload,
  isPriceActive,
} from './price-params';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const providerOptions = ref<BillingSelectOption[]>([]);
const modelOptions = ref<BillingSelectOption[]>([]);
const priceDetail = ref<AIBuddyBillingPriceResult>();

const modalTitle = computed(() =>
  priceDetail.value
    ? $t('ui.actionTitle.edit', [$t('ai-buddy-billing.price.title')])
    : $t('ai-buddy-billing.price.create'),
);

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
  providerOptions.value = providers
    .filter((provider) => provider.status === 1)
    .map((provider) => ({ label: provider.name, value: provider.id }));
}

async function handleProviderChange(providerId?: null | number) {
  modelOptions.value = [];
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
  height: 520,
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
  class: 'w-1/2',
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();

    try {
      if (priceDetail.value) {
        const values =
          await formApi.getValues<AIBuddyBillingPriceUpdateFormValues>();
        await updateAIBuddyBillingPriceApi(
          priceDetail.value.id,
          createAIBuddyBillingPriceUpdatePayload(values),
        );
        message.success($t('ai-buddy-billing.price.updated'));
      } else {
        const values = await formApi.getValues<AIBuddyBillingPriceFormValues>();
        await createAIBuddyBillingPriceApi(createAIBuddyBillingPricePayload(values));
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
    const data = modalApi.getData<AIBuddyBillingPriceResult>();
    priceDetail.value = data;
    formApi.resetForm();
    modelOptions.value = [];
    await formApi.setState({
      schema: createPriceSchema({
        isEdit: Boolean(data),
        modelOptions: () => modelOptions.value,
        onProviderChange: handleProviderChange,
        providerOptions: () => providerOptions.value,
      }),
    });
    if (data) {
      await handleProviderChange(data.provider_id);
      await formApi.setValues({
        cache_audio_read_price: Number(data.cache_audio_read_price ?? 0),
        cache_read_price: Number(data.cache_read_price ?? 0),
        cache_write_price: Number(data.cache_write_price ?? 0),
        effective_from: dayjs(data.effective_from).format(
          BILLING_DATE_TIME_VALUE_FORMAT,
        ),
        effective_to: data.effective_to
          ? dayjs(data.effective_to).format(BILLING_DATE_TIME_VALUE_FORMAT)
          : undefined,
        image_price: Number(data.image_price ?? 0),
        input_audio_price: Number(data.input_audio_price ?? 0),
        input_price: Number(data.input_price ?? 0),
        model_id: data.model_id,
        output_audio_price: Number(data.output_audio_price ?? 0),
        output_price: Number(data.output_price ?? 0),
        provider_id: data.provider_id,
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
  <div>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <MaterialSymbolsAdd class="size-5" />
          {{ $t('ai-buddy-billing.price.create') }}
        </VbenButton>
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
    </Modal>
  </div>
</template>
