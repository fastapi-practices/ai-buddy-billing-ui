import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'AIBuddyBillingManage',
    path: '/plugins/ai-buddy/billing',
    component: () => import('../views/index.vue'),
    meta: {
      title: $t('ai-buddy-billing.menu'),
      icon: 'material-symbols:payments-outline',
    },
  },
];

export default routes;
