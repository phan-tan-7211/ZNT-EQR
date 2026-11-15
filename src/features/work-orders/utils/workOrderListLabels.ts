type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Work-order list status labels (`workOrders.list.*`), keyed by status value. */
export function getWorkOrderListStatusLabels(t: Translate): Record<string, string> {
  return {
    submitted: t('workOrders.list.submitted'),
    accepted: t('workOrders.list.accepted'),
    assigned: t('workOrders.list.assigned'),
    in_progress: t('workOrders.list.inProgress'),
    on_hold: t('workOrders.list.onHold'),
    completed: t('workOrders.list.completed'),
    cancelled: t('workOrders.list.cancelled'),
  };
}

/** Work-order list priority labels (`workOrders.list.*`), keyed by priority value. */
export function getWorkOrderListPriorityLabels(t: Translate): Record<string, string> {
  return {
    high: t('workOrders.list.high'),
    medium: t('workOrders.list.medium'),
    low: t('workOrders.list.low'),
  };
}
