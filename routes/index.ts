import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'PluginAIBuddyBilling',
    path: '/plugins/ai-buddy-billing',
    redirect: '/plugins/ai-buddy-billing/usage',
    meta: {
      title: $t('ai-buddy-billing.menu'),
      icon: 'material-symbols:payments-outline',
    },
    children: [
      {
        name: 'AIBuddyBillingUsageManage',
        path: '/plugins/ai-buddy-billing/usage',
        component: () => import('../views/usage/index.vue'),
        meta: {
          title: $t('ai-buddy-billing.usage.title'),
          icon: 'carbon:chart-line',
        },
      },
      {
        name: 'AIBuddyBillingPriceManage',
        path: '/plugins/ai-buddy-billing/price',
        component: () => import('../views/price/index.vue'),
        meta: {
          title: $t('ai-buddy-billing.price.title'),
          icon: 'carbon:currency-dollar',
        },
      },
      {
        name: 'AIBuddyBillingAccountManage',
        path: '/plugins/ai-buddy-billing/account',
        component: () => import('../views/account/index.vue'),
        meta: {
          title: $t('ai-buddy-billing.account.title'),
          icon: 'carbon:wallet',
        },
      },
      {
        name: 'AIBuddyBillingBudgetManage',
        path: '/plugins/ai-buddy-billing/budget',
        component: () => import('../views/budget/index.vue'),
        meta: {
          title: $t('ai-buddy-billing.budget.title'),
          icon: 'carbon:meter',
        },
      },
    ],
  },
];

export default routes;
