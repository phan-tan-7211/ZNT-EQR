import { describe, expect, it } from 'vitest';
import {
  buildCreationDescription,
  getCreationTitle,
  getStatusChangeTitle,
} from '@/features/work-orders/utils/workOrderTimelineLabels';

describe('workOrderTimelineLabels', () => {
  it('uses a combined title only when an assignee is present at creation', () => {
    expect(getCreationTitle('assigned', true)).toBe('Created & Assigned');
    expect(getCreationTitle('assigned', false)).toBe('Created');
    expect(getStatusChangeTitle('submitted', 'assigned')).toBe('Work Assigned');
  });

  it('builds a creation description with submitter and assignee', () => {
    expect(
      buildCreationDescription({
        status: 'assigned',
        createdByName: 'Alex Morgan',
        assigneeName: 'Alex Morgan',
      }),
    ).toBe('Submitted by Alex Morgan • Assigned to Alex Morgan');
  });

  it('uses distinct titles for non-creation status changes', () => {
    expect(getStatusChangeTitle(null, 'submitted')).toBe('Created');
    expect(getStatusChangeTitle('assigned', 'in_progress')).toBe('Work Started');
    expect(getStatusChangeTitle('in_progress', 'completed')).toBe('Work Completed');
  });
});
