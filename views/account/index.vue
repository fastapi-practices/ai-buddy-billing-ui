<script setup lang="ts">
import type {
  AIBuddyBillingAccountResult,
  AIBuddyBillingTransactionResult,
} from '../../api';

import type { VbenFormProps } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  adjustAIBuddyBillingAccountApi,
  getAIBuddyBillingAccountsApi,
  getAIBuddyBillingTransactionsApi,
  rechargeAIBuddyBillingAccountApi,
} from '../../api';
import {
  createRechargeSchema,
  queryAccountSchema,
  queryUserTransactionSchema,
  transactionTypeLabel,
  useAccountColumns,
  useTransactionColumns,
} from '../data';
import { loadBillingCurrency } from '../currency';
import { formatBillingAmount } from '../format';

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  adjust: 'warning',
  consume: 'error',
  recharge: 'success',
  refund: 'processing',
};

const isAdjustment = ref(false);
const pendingUserId = ref<number>();
const modalTitle = ref('');
const currentUserId = ref<number>();

const accountFormOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: queryAccountSchema,
};

const accountGridOptions: VxeTableGridOptions<AIBuddyBillingAccountResult> = {
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
  columns: useAccountColumns(onAccountActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadBillingCurrency();
        return await getAIBuddyBillingAccountsApi({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};

const [AccountGrid, accountGridApi] = useVbenVxeGrid({
  formOptions: accountFormOptions,
  gridOptions: accountGridOptions,
});

const transactionFormOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: queryUserTransactionSchema,
};

const transactionGridOptions: VxeTableGridOptions<AIBuddyBillingTransactionResult> =
  {
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
    columns: useTransactionColumns(),
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          await loadBillingCurrency();
          return await getAIBuddyBillingTransactionsApi({
            page: page.currentPage,
            size: page.pageSize,
            user_id: currentUserId.value,
            ...formValues,
          });
        },
      },
    },
  };

const [TransactionGrid] = useVbenVxeGrid({
  formOptions: transactionFormOptions,
  gridOptions: transactionGridOptions,
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: createRechargeSchema({ isAdjustment: false }),
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-1/3',
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();

    try {
      const values = await formApi.getValues<{
        amount: number;
        remark?: null | string;
        user_id: number;
      }>();
      const payload = {
        amount: values.amount,
        remark: values.remark?.trim() || null,
        user_id: Number(values.user_id),
      };
      const data = isAdjustment.value
        ? await adjustAIBuddyBillingAccountApi(payload)
        : await rechargeAIBuddyBillingAccountApi(payload);
      message.success(
        $t('ai-buddy-billing.account.updated', [
          formatBillingAmount(data.balance),
        ]),
      );
      await modalApi.close();
      await accountGridApi.query();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    formApi.resetForm();
    const userId = pendingUserId.value;
    pendingUserId.value = undefined;
    if (userId) {
      void formApi.setValues({ user_id: userId });
    }
  },
});

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-3/5',
  contentClass: 'h-full overflow-hidden p-0',
  destroyOnClose: true,
  footer: false,
});

const drawerTitle = computed(() =>
  $t('ai-buddy-billing.account.transactionTitle', [currentUserId.value ?? '']),
);

function openAccountModal(adjustment: boolean, userId?: number) {
  isAdjustment.value = adjustment;
  pendingUserId.value = userId;
  modalTitle.value = adjustment
    ? $t('ai-buddy-billing.account.adjust')
    : $t('ai-buddy-billing.account.recharge');
  formApi.setState({
    schema: createRechargeSchema({ isAdjustment: adjustment }),
  });
  modalApi.open();
}

function openTransactionDrawer(userId: number) {
  currentUserId.value = userId;
  drawerApi.open();
}

function onAccountActionClick({
  code,
  row,
}: OnActionClickParams<AIBuddyBillingAccountResult>) {
  switch (code) {
    case 'adjust': {
      openAccountModal(true, row.user_id);
      break;
    }
    case 'recharge': {
      openAccountModal(false, row.user_id);
      break;
    }
    case 'transactions': {
      openTransactionDrawer(row.user_id);
      break;
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <AccountGrid>
      <template #toolbar-actions>
        <VbenButton @click="openAccountModal(false)">
          <IconifyIcon class="mr-1 size-4" icon="material-symbols:add" />
          {{ $t('ai-buddy-billing.account.recharge') }}
        </VbenButton>
        <VbenButton
          class="ml-2"
          variant="outline"
          @click="openAccountModal(true)"
        >
          <IconifyIcon class="mr-1 size-4" icon="material-symbols:tune" />
          {{ $t('ai-buddy-billing.account.adjust') }}
        </VbenButton>
      </template>
    </AccountGrid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
    <Drawer :title="drawerTitle">
      <TransactionGrid>
        <template #transactionType="{ row }">
          <a-tag
            :color="TRANSACTION_TYPE_COLORS[row.transaction_type] ?? 'default'"
          >
            {{ transactionTypeLabel(row.transaction_type) }}
          </a-tag>
        </template>
      </TransactionGrid>
    </Drawer>
  </Page>
</template>
