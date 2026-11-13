<script setup lang="ts">
import type {
  AIBuddyBillingAccountResult,
  AIBuddyBillingTransactionResult,
} from '../api';

import type { VbenFormProps } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenModal, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  adjustAIBuddyBillingAccountApi,
  getAIBuddyBillingAccountsApi,
  getAIBuddyBillingTransactionsApi,
  getMyAIBuddyBillingAccountApi,
  rechargeAIBuddyBillingAccountApi,
} from '../api';
import {
  createRechargeSchema,
  queryAccountSchema,
  queryTransactionSchema,
  transactionTypeLabel,
  useAccountColumns,
  useTransactionColumns,
} from './data';
import { formatBillingAmount } from './format';

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  adjust: 'warning',
  consume: 'error',
  recharge: 'success',
  refund: 'processing',
};

const account = ref<AIBuddyBillingAccountResult>();
const accountError = ref<null | string>(null);
const accountLoading = ref(false);
const isAdjustment = ref(false);
const pendingUserId = ref<number>();
const modalTitle = ref('');

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
  height: 240,
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
  schema: queryTransactionSchema,
};

const transactionGridOptions: VxeTableGridOptions<AIBuddyBillingTransactionResult> =
  {
    rowConfig: {
      keyField: 'id',
    },
    height: 420,
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
          return await getAIBuddyBillingTransactionsApi({
            page: page.currentPage,
            size: page.pageSize,
            ...formValues,
          });
        },
      },
    },
  };

const [TransactionGrid, transactionGridApi] = useVbenVxeGrid({
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
      await transactionGridApi.query();
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

function onAccountActionClick({
  code,
  row,
}: OnActionClickParams<AIBuddyBillingAccountResult>) {
  openAccountModal(code === 'adjust', row.user_id);
}

async function loadAccount() {
  accountLoading.value = true;
  accountError.value = null;
  try {
    account.value = await getMyAIBuddyBillingAccountApi();
  } catch (error) {
    account.value = undefined;
    accountError.value =
      error instanceof Error
        ? error.message
        : $t('ai-buddy-billing.account.missing');
  } finally {
    accountLoading.value = false;
  }
}

onMounted(loadAccount);
</script>

<template>
  <div>
    <a-spin :spinning="accountLoading">
      <div class="mb-4 rounded-[var(--radius)] border border-border p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-muted-foreground text-xs">
              {{ $t('ai-buddy-billing.account.balance') }}
            </div>
            <div class="mt-1 text-2xl font-semibold">
              {{ formatBillingAmount(account?.balance ?? 0) }}
              <span class="text-muted-foreground ml-1 text-sm">
                {{ account?.currency ?? '' }}
              </span>
            </div>
            <div v-if="accountError" class="text-destructive mt-1 text-xs">
              {{ accountError }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <VbenButton variant="outline" @click="loadAccount">
              <IconifyIcon
                class="mr-1 size-4"
                icon="material-symbols:refresh"
              />
              {{ $t('common.refresh') }}
            </VbenButton>
            <VbenButton @click="openAccountModal(false)">
              <IconifyIcon class="mr-1 size-4" icon="material-symbols:add" />
              {{ $t('ai-buddy-billing.account.recharge') }}
            </VbenButton>
            <VbenButton variant="outline" @click="openAccountModal(true)">
              <IconifyIcon class="mr-1 size-4" icon="material-symbols:tune" />
              {{ $t('ai-buddy-billing.account.adjust') }}
            </VbenButton>
          </div>
        </div>
      </div>
    </a-spin>
    <AccountGrid />
    <TransactionGrid class="mt-4">
      <template #transactionType="{ row }">
        <a-tag
          :color="TRANSACTION_TYPE_COLORS[row.transaction_type] ?? 'default'"
        >
          {{ transactionTypeLabel(row.transaction_type) }}
        </a-tag>
      </template>
    </TransactionGrid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
  </div>
</template>
