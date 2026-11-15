<script setup lang="ts">
import type {
  AIBuddyBillingBudgetResult,
  AIBuddyBillingBudgetWindow,
  AIBuddyBillingDecimal,
  AIBuddyBillingStatusType,
} from '../../api';

import type { VbenFormProps } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { confirm, Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  createAIBuddyBillingBudgetApi,
  deleteAIBuddyBillingBudgetApi,
  getAIBuddyBillingBudgetsApi,
  updateAIBuddyBillingBudgetApi,
} from '../../api';
import {
  budgetWindowLabel,
  createBudgetSchema,
  queryBudgetSchema,
  useBudgetColumns,
} from '../data';
import { loadBillingCurrency } from '../currency';

interface BudgetFormValues {
  usd_limit?: AIBuddyBillingDecimal | null;
  token_limit?: null | number;
  warn_at?: null | number;
  status: AIBuddyBillingStatusType;
  user_id?: number;
  window?: AIBuddyBillingBudgetWindow;
}

function optionalAmount(value?: AIBuddyBillingDecimal | null) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return value;
}

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: queryBudgetSchema,
};

const gridOptions: VxeTableGridOptions<AIBuddyBillingBudgetResult> = {
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
  columns: useBudgetColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadBillingCurrency();
        return await getAIBuddyBillingBudgetsApi({
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

const budgetDetail = ref<AIBuddyBillingBudgetResult>();

const modalTitle = computed(() =>
  budgetDetail.value?.id
    ? $t('ui.actionTitle.edit', [$t('ai-buddy-billing.budget.title')])
    : $t('ui.actionTitle.create', [$t('ai-buddy-billing.budget.title')]),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  wrapperClass: 'md:grid-cols-2',
  schema: createBudgetSchema({ isEdit: false }),
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-1/2',
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    const values = await formApi.getValues<BudgetFormValues>();
    const usdLimit = optionalAmount(values.usd_limit);
    const tokenLimit = optionalAmount(values.token_limit);
    if (usdLimit === null && tokenLimit === null) {
      message.warning($t('ai-buddy-billing.budget.limitRequired'));
      return;
    }

    modalApi.lock();

    try {
      const limits = {
        status: values.status,
        token_limit: tokenLimit === null ? null : Number(tokenLimit),
        usd_limit: usdLimit,
        warn_at: values.warn_at ?? null,
      };
      await (budgetDetail.value?.id
        ? updateAIBuddyBillingBudgetApi(budgetDetail.value.id, limits)
        : createAIBuddyBillingBudgetApi({
            ...limits,
            user_id: Number(values.user_id),
            window: values.window as AIBuddyBillingBudgetWindow,
          }));
      message.success($t('ui.actionMessage.operationSuccess'));
      await modalApi.close();
      await gridApi.query();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    // getData() 在未传数据时返回空对象，需按主键判断是新增还是编辑
    const data = modalApi.getData<AIBuddyBillingBudgetResult>();
    const budget = data?.id ? data : undefined;
    formApi.resetForm();
    formApi.setState({
      schema: createBudgetSchema({ isEdit: Boolean(budget) }),
    });
    budgetDetail.value = budget;
    if (budget) {
      void formApi.setValues({
        status: budget.status,
        token_limit: budget.token_limit ?? undefined,
        usd_limit: budget.usd_limit ?? undefined,
        warn_at: budget.warn_at ?? undefined,
      });
    }
  },
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<AIBuddyBillingBudgetResult>) {
  switch (code) {
    case 'delete': {
      confirm({
        content: $t('ui.actionMessage.deleteConfirm', [
          budgetWindowLabel(row.window),
        ]),
        icon: 'warning',
      }).then(async () => {
        await deleteAIBuddyBillingBudgetApi(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [
            budgetWindowLabel(row.window),
          ]),
          key: 'action_process_msg',
        });
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
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <MaterialSymbolsAdd class="size-5" />
          {{ $t('common.create') }}
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
  </Page>
</template>
