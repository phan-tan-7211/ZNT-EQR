import { describe, it, expect } from 'vitest';
import {
  getWorkOrderListPriorityLabels,
  getWorkOrderListStatusLabels,
} from './workOrderListLabels';

const echo = (key: string) => `t(${key})`;

describe('getWorkOrderListStatusLabels', () => {
  it('maps every work-order status to its workOrders.list translation key', () => {
    expect(getWorkOrderListStatusLabels(echo)).toEqual({
      submitted: 't(workOrders.list.submitted)',
      accepted: 't(workOrders.list.accepted)',
      assigned: 't(workOrders.list.assigned)',
      in_progress: 't(workOrders.list.inProgress)',
      on_hold: 't(workOrders.list.onHold)',
      completed: 't(workOrders.list.completed)',
      cancelled: 't(workOrders.list.cancelled)',
    });
  });

  it('has no label for unknown statuses so callers can apply their own fallback', () => {
    expect(getWorkOrderListStatusLabels(echo).mystery_status).toBeUndefined();
  });
});

describe('getWorkOrderListPriorityLabels', () => {
  it('maps every work-order priority to its workOrders.list translation key', () => {
    expect(getWorkOrderListPriorityLabels(echo)).toEqual({
      high: 't(workOrders.list.high)',
      medium: 't(workOrders.list.medium)',
      low: 't(workOrders.list.low)',
    });
  });

  it('has no label for unknown priorities so callers can apply their own fallback', () => {
    expect(getWorkOrderListPriorityLabels(echo).urgent).toBeUndefined();
  });
});
