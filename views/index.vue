<script setup lang="ts">
import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

import Account from './account.vue';
import Budget from './budget.vue';
import Price from './price.vue';
import Usage from './usage.vue';

const activeKey = ref('0');
const isMobile = useBreakpoints(breakpointsTailwind).smaller('md');

const tabItems = computed(() => [
  {
    key: '0',
    label: $t('ai-buddy-billing.usage.title'),
    icon: () => h('span', { class: 'icon-[carbon--chart-line] -mb-1 size-5' }),
  },
  {
    key: '1',
    label: $t('ai-buddy-billing.price.title'),
    icon: () =>
      h('span', { class: 'icon-[carbon--currency-dollar] -mb-1 size-5' }),
  },
  {
    key: '2',
    label: $t('ai-buddy-billing.account.title'),
    icon: () => h('span', { class: 'icon-[carbon--wallet] -mb-1 size-5' }),
  },
  {
    key: '3',
    label: $t('ai-buddy-billing.budget.title'),
    icon: () => h('span', { class: 'icon-[carbon--meter] -mb-1 size-5' }),
  },
]);
</script>

<template>
  <Page auto-content-height>
    <a-card
      class="h-full overflow-y-auto rounded-[var(--radius)]"
      variant="borderless"
    >
      <a-tabs
        v-model:active-key="activeKey"
        animated
        class="h-full"
        :items="tabItems"
        :tab-bar-style="isMobile ? undefined : { width: '16%' }"
        :tab-placement="isMobile ? 'top' : 'start'"
      >
        <template #contentRender="{ item }">
          <Usage v-if="item.key === '0'" />
          <Price v-else-if="item.key === '1'" />
          <Account v-else-if="item.key === '2'" />
          <Budget v-else-if="item.key === '3'" />
        </template>
      </a-tabs>
    </a-card>
  </Page>
</template>

<style lang="scss" scoped>
:deep(.ant-card-body) {
  height: 100%;
  min-height: 100%;
}
</style>
